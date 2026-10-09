import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { capturePacket } from "../scripts/capture.mjs";
import { prepareReviewCase } from "../eval/prepare.mjs";
import { REVIEW_CASES } from "../eval/cases.mjs";

const skillRoot = fileURLToPath(new URL("../", import.meta.url));
async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "prune-skill-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const json = async path => JSON.parse(await readFile(path, "utf8"));

test("skill references are present and the bundled agent contains the exact complete review contract", async () => {
  const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: prune\ndescription: .+\n---/);
  assert.match(skill, /read both files completely/);
  const contract = await readFile(join(skillRoot, "references/review-contract.md"), "utf8");
  const agent = await readFile(join(skillRoot, "agents/prune-reviewer.md"), "utf8");
  assert.equal(agent.split("\n---\n\n")[1], contract);
  for (const line of [
    "tools: read, grep, find, ls", "extensions:", "subagentOnlyExtensions:", "skills:",
    "inheritSkills: false", "inheritProjectContext: true", "inheritGlobalContext: false",
    "systemPromptMode: replace", "defaultContext: fresh", "acceptanceRole: read-only", "allowNestedSubagents: false",
  ]) assert.ok(agent.split("\n").includes(line), line);
  for (const match of skill.matchAll(/\]\(([^)]+\.md)\)/g)) await stat(join(skillRoot, match[1]));
  const manifest = await json(join(skillRoot, "package.json"));
  assert.equal(manifest.pi.extensions, undefined);
  for (const path of [...manifest.pi.skills, ...manifest.pi.prompts, ...manifest.pi.subagents.agents]) await stat(join(skillRoot, path));
});

test("launch instructions preserve the live model/thinking pair without fixed agent defaults", async () => {
  const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
  const agent = await readFile(join(skillRoot, "agents/prune-reviewer.md"), "utf8");
  const frontmatter = agent.split("\n---\n")[0];
  assert.doesNotMatch(frontmatter, /^(model|thinking):/m);
  assert.match(skill, /current session's exact model and current thinking level together/);
  assert.match(skill, /model:"provider\/model:level"/);
  assert.match(skill, /action:"models"/);
  assert.match(skill, /operator explicitly requested a reviewer override/);
  assert.match(skill, /If either value is unavailable, ask the user before launching rather than guessing/);
  assert.match(skill, /not startup settings as proof of the current level/);
  assert.match(skill, /Never substitute a fixed `high` or `max`/);
  assert.match(skill, /unsupported or blocked by policy, report the blocker instead/);
});

test("capture packets preserve intent gaps and supplied historical evidence privately", async t => {
  const directory = await temporaryDirectory(t);
  const { cwd } = await prepareReviewCase(REVIEW_CASES[0], join(directory, "fixture"));
  const packet = await capturePacket({ cwd, storageRoot: join(directory, "captures"), focus: "fallbacks",
    intent: { requests: [{ entryId: "u1", source: "original user", text: "Keep the fallback", attachmentCount: 0 }], gaps: ["Earlier originals unavailable"] },
    workflow: {
      plans: [{ path: join(cwd, "plan.md"), referencedBy: ["user:u1"], content: "Approved step" }],
      activity: [{ entryId: "t1", tool: "read", inputPreview: "plan.md", text: "Historical evidence", truncated: false, isError: false }],
    },
  });
  assert.deepEqual((await json(packet.intentPath)).gaps, ["Earlier originals unavailable"]);
  assert.equal((await json(packet.intentPath)).requests[0].text, "Keep the fallback");
  assert.equal((await json(packet.scopePath)).focus, "fallbacks");
  const workflow = await json(packet.workflowPath);
  assert.equal(await readFile(workflow.plans[0].snapshotPath, "utf8"), "Approved step");
  assert.equal(await readFile(workflow.activity[0].outputPath, "utf8"), "Historical evidence");
  assert.equal(workflow.plans[0].content, undefined);
  assert.equal(workflow.activity[0].text, undefined);
  assert.equal(workflow.sessionCwd, cwd);
  assert.match(workflow.warnings.join("\n"), /does not inspect session history/);
  assert.match(await readFile(packet.taskPath, "utf8"), /relative links against the original source path/);
  assert.equal((await stat(packet.directory)).mode & 0o777, 0o700);
  for (const path of [packet.intentPath, packet.scopePath, packet.workflowPath, packet.patchPath, packet.taskPath, workflow.plans[0].snapshotPath, workflow.activity[0].outputPath]) {
    assert.equal((await stat(path)).mode & 0o777, 0o600);
  }
});

test("CLI captures without session/model dependencies and explicitly marks empty intent", async t => {
  const directory = await temporaryDirectory(t);
  const { cwd } = await prepareReviewCase(REVIEW_CASES[0], join(directory, "fixture"));
  const stdout = execFileSync(process.execPath, [join(skillRoot, "scripts/capture.mjs"), "--cwd", cwd, "--reference", "HEAD", "--output", join(directory, "cli")], { encoding: "utf8" });
  const packet = JSON.parse(stdout);
  assert.ok((await json(packet.scopePath)).referenceCommit);
  assert.deepEqual((await json(packet.intentPath)).requests, []);
  assert.match((await json(packet.intentPath)).gaps.join("\n"), /parent must add/);
  assert.ok(await readFile(packet.taskPath, "utf8"));
  await assert.rejects(capturePacket({ cwd, intent: {}, storageRoot: join(directory, "bad") }), /requests array/);
});

test("all seven behavioral fixtures prepare complete packets without revealing gold rubrics", async t => {
  const directory = await temporaryDirectory(t);
  assert.deepEqual(REVIEW_CASES.map(item => item.id), ["01", "02", "03", "04", "05", "06", "07"]);
  for (const committed of [true, false]) {
    for (const reviewCase of REVIEW_CASES) {
      const { packet } = await prepareReviewCase(reviewCase, join(directory, `${reviewCase.id}-${committed}`), committed);
      const intent = await json(packet.intentPath);
      assert.equal(intent.requests[0]?.text ?? null, reviewCase.request);
      assert.match(await readFile(packet.patchPath, "utf8"), /diff --git/);
      assert.equal((await json(packet.scopePath)).scope, committed ? "latest commit (first-parent comparison)" : "uncommitted changes");
      const task = await readFile(packet.taskPath, "utf8");
      assert.doesNotMatch(task, /rubric\.json|cases\.mjs/);
      for (const criterion of [...reviewCase.rubric.catch, ...reviewCase.rubric.avoid]) assert.ok(!task.includes(criterion));
    }
  }
});
