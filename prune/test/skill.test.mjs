import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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
const read = path => readFile(join(skillRoot, path), "utf8");
const frontmatter = file => file.split("\n---\n")[0].split("\n");
const body = file => file.split("\n---\n\n")[1];

test("skill links resolve and both reviewer agents carry the exact review contract", async () => {
  const skill = await read("SKILL.md");
  assert.match(skill, /^---\nname: prune\ndescription: .+\ncompatibility: .+\n---/);
  for (const match of skill.matchAll(/\]\(([^)#]+\.md)\)/g)) await stat(join(skillRoot, match[1]));
  const contract = await read("references/review-contract.md");
  const pi = await read("agents/prune-reviewer.md");
  const claude = await read("claude/prune-reviewer.md");
  assert.equal(body(pi), contract);
  assert.equal(body(claude), contract);
  for (const line of [
    "name: pi-prune-reviewer", "tools: read, grep, find, ls", "extensions:", "subagentOnlyExtensions:", "skills:",
    "inheritSkills: false", "inheritProjectContext: true", "inheritGlobalContext: false",
    "systemPromptMode: replace", "defaultContext: fresh", "acceptanceRole: read-only", "allowNestedSubagents: false",
  ]) assert.ok(frontmatter(pi).includes(line), line);
  for (const line of ["name: prune-reviewer", "tools: Read, Grep, Glob", "model: inherit"]) assert.ok(frontmatter(claude).includes(line), line);
  const manifest = await json(join(skillRoot, "package.json"));
  assert.equal(manifest.pi.extensions, undefined);
  for (const path of [...manifest.pi.skills, ...manifest.pi.prompts, ...manifest.pi.subagents.agents]) await stat(join(skillRoot, path));
});

test("reviewers follow the session's live model and thinking level without fixed defaults", async () => {
  const skill = await read("SKILL.md");
  assert.ok(!frontmatter(await read("agents/prune-reviewer.md")).some(line => /^(model|thinking):/.test(line)));
  assert.ok(!frontmatter(await read("claude/prune-reviewer.md")).some(line => /^(effort|thinking):/.test(line)));
  assert.match(skill, /current session's exact model and thinking level/);
  assert.match(skill, /model: "provider\/id:level"/);
  assert.match(skill, /action:"models"/);
  assert.match(skill, /explicitly asks for a reviewer override/);
  assert.match(skill, /Never take it from settings files or substitute a fixed `high` or `max`/);
  assert.match(skill, /unsupported or blocked by policy, report the blocker/);
  assert.match(skill, /Don't pass `model` or `effort` unless the user asked for a reviewer override/);
});

test("capture packets keep supplied evidence private and list every evidence file for the reviewer", async t => {
  const directory = await temporaryDirectory(t);
  const { cwd } = await prepareReviewCase(REVIEW_CASES[0], join(directory, "fixture"));
  const dirty = await prepareReviewCase(REVIEW_CASES[0], join(directory, "dirty"), false);
  const dirtyTask = await readFile((await capturePacket({ cwd: dirty.cwd, storageRoot: join(directory, "dirty-captures") })).taskPath, "utf8");
  assert.match(dirtyTask, /Latest-commit alternative.*latest-commit\.diff/);

  const packet = await capturePacket({ cwd, storageRoot: join(directory, "captures"), focus: "fallbacks",
    intent: { note: "Parent note.", requests: [{ source: "user message", text: "Keep the fallback" }], gaps: ["Earlier originals unavailable"] },
    workflow: {
      plans: [{ path: join(cwd, "plan.md"), referencedBy: ["user message 1"], content: "Approved step" }],
      activity: [{ tool: "read", inputPreview: "plan.md", text: "Historical evidence", truncated: false, isError: false }],
    },
  });
  assert.equal(packet.scope, "latest commit (first-parent comparison)");
  const intent = await json(packet.intentPath);
  assert.deepEqual(intent.gaps, ["Earlier originals unavailable"]);
  assert.equal(intent.requests[0].text, "Keep the fallback");
  assert.match(intent.note, /compacted or earlier messages may be missing.* Parent note\.$/);
  assert.equal((await json(packet.scopePath)).focus, "fallbacks");
  const workflow = await json(packet.workflowPath);
  assert.equal(await readFile(workflow.plans[0].snapshotPath, "utf8"), "Approved step");
  assert.equal(await readFile(workflow.activity[0].outputPath, "utf8"), "Historical evidence");
  assert.equal(workflow.plans[0].content, undefined);
  assert.equal(workflow.activity[0].text, undefined);
  assert.equal(workflow.sessionCwd, cwd);
  assert.match(workflow.note, /does not inspect session history/);
  const task = await readFile(packet.taskPath, "utf8");
  assert.doesNotMatch(task, /Latest-commit alternative/);
  assert.match(task, /workflow\.json/);
  assert.match(task, /relative links against its original path/);
  assert.match(task, /write no files/);
  assert.equal((await stat(packet.directory)).mode & 0o777, 0o700);
  for (const path of [packet.intentPath, packet.scopePath, packet.workflowPath, packet.patchPath, packet.taskPath, workflow.plans[0].snapshotPath, workflow.activity[0].outputPath]) {
    assert.equal((await stat(path)).mode & 0o777, 0o600);
  }
});

test("the optional project intent note joins every capture once", async t => {
  const directory = await temporaryDirectory(t);
  const { cwd } = await prepareReviewCase(REVIEW_CASES[0], join(directory, "fixture"));
  const anchor = join(cwd, ".pi", "prune-intent.md");
  await mkdir(join(cwd, ".pi"));
  await writeFile(anchor, "Goal: Follow the runtime thinking level.\n");
  const automatic = await json((await capturePacket({ cwd, storageRoot: join(directory, "automatic") })).workflowPath);
  assert.equal(automatic.plans.length, 1);
  assert.equal(automatic.plans[0].path, anchor);
  assert.match(await readFile(automatic.plans[0].snapshotPath, "utf8"), /Follow the runtime thinking level/);
  const supplied = await json((await capturePacket({ cwd, storageRoot: join(directory, "supplied"),
    workflow: { plans: [{ path: ".pi/prune-intent.md", referencedBy: ["user message 1"], content: "Goal: supplied" }] } })).workflowPath);
  assert.equal(supplied.plans.length, 1);
  assert.deepEqual(supplied.plans[0].referencedBy, ["user message 1"]);
});

test("CLI prints the launch essentials and marks missing intent", async t => {
  const directory = await temporaryDirectory(t);
  const { cwd } = await prepareReviewCase(REVIEW_CASES[0], join(directory, "fixture"));
  const stdout = execFileSync(process.execPath, [join(skillRoot, "scripts/capture.mjs"), "--cwd", cwd, "--reference", "HEAD", "--output", join(directory, "cli")], { encoding: "utf8" });
  const packet = JSON.parse(stdout);
  assert.equal(packet.scope, "current tree guided by reference commit");
  assert.equal(packet.root, (await json(packet.scopePath)).root);
  assert.ok((await json(packet.scopePath)).referenceCommit);
  assert.deepEqual((await json(packet.intentPath)).requests, []);
  assert.match((await json(packet.intentPath)).gaps.join("\n"), /No intent was supplied/);
  assert.equal(packet.task, undefined);
  await assert.rejects(capturePacket({ cwd, intent: {}, storageRoot: join(directory, "bad") }), /requests array/);
  await assert.rejects(capturePacket({ cwd, intent: { requests: [{ source: "user message" }] }, storageRoot: join(directory, "bad") }), /requests array/);
});

test("all behavioral fixtures prepare complete packets without revealing gold rubrics", async t => {
  const directory = await temporaryDirectory(t);
  assert.deepEqual(REVIEW_CASES.map(item => item.id), ["01", "02", "03", "04", "05", "06", "07", "08", "09"]);
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
