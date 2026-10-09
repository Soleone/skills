import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { REVIEW_CASES } from "../eval/cases.mjs";

const runner = fileURLToPath(new URL("../eval/run.mjs", import.meta.url));
async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "prune-eval-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const json = async path => JSON.parse(await readFile(path, "utf8"));

// A stand-in host binary that prints canned JSONL events and records the arguments it received.
async function stubHost(directory, events) {
  const path = join(directory, "host.mjs");
  await writeFile(path, `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(join(directory, "argv.json"))}, JSON.stringify(process.argv.slice(2)));
console.log("startup notice that is not JSON");
for (const event of ${JSON.stringify(events)}) console.log(JSON.stringify(event));
`);
  await chmod(path, 0o755);
  return path;
}

async function onlyCase(output) {
  const [run] = await readdir(output);
  return join(output, run, "01");
}

test("pi runs save the report, trace and observations, and write the rubric only after the review", async t => {
  const directory = await temporaryDirectory(t);
  const host = await stubHost(directory, [
    { type: "tool_execution_start", toolName: "read", args: { path: "scope.json" } },
    { type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "**Verdict: KEEP.** Direct." }], usage: { cost: { total: 0.25 } } } },
  ]);
  execFileSync(process.execPath, [runner, "--bin", host, "--model", "provider/model", "--thinking", "high", "--case", "01", "--output", join(directory, "out")], { encoding: "utf8" });
  const caseDirectory = await onlyCase(join(directory, "out"));
  const [packet] = await readdir(join(caseDirectory, "reviews"));
  assert.equal(await readFile(join(caseDirectory, "reviews", packet, "review.md"), "utf8"), "**Verdict: KEEP.** Direct.");
  const observations = await json(join(caseDirectory, "observations.json"));
  assert.deepEqual(observations.toolCalls, [{ name: "read", args: { path: "scope.json" } }]);
  assert.equal(observations.cost, 0.25);
  assert.equal(observations.failure, null);
  assert.deepEqual(await json(join(caseDirectory, "rubric.json")), REVIEW_CASES[0].rubric);
  assert.match(await readFile(join(caseDirectory, "trace.jsonl"), "utf8"), /tool_execution_start/);
  const argv = await json(join(directory, "argv.json"));
  for (const flag of ["--no-session", "--no-extensions", "--no-skills", "--no-context-files", "--no-mcp"]) assert.ok(argv.includes(flag), flag);
  assert.equal(argv[argv.indexOf("--tools") + 1], "read,grep,find,ls");
  assert.equal(argv[argv.indexOf("--model") + 1], "provider/model:high");
  assert.match(argv[argv.indexOf("--system-prompt") + 1], /removal-first code reviewer/);
  assert.doesNotMatch(argv.at(-1), /rubric/);
});

test("claude runs stop at the tool-call bound and report the failure without retrying", async t => {
  const directory = await temporaryDirectory(t);
  const toolUse = { type: "tool_use", name: "Read", input: { file_path: "scope.json" } };
  const host = await stubHost(directory, [
    { type: "assistant", message: { content: Array.from({ length: 41 }, () => toolUse) } },
    { type: "result", result: "**Verdict: KEEP.** Too late.", total_cost_usd: 0.5 },
  ]);
  const failure = (() => {
    try {
      execFileSync(process.execPath, [runner, "--host", "claude", "--bin", host, "--model", "sonnet", "--case", "01", "--output", join(directory, "out")], { encoding: "utf8", stdio: "pipe" });
    } catch (error) { return error; }
  })();
  assert.ok(failure, "the runner should exit non-zero");
  assert.match(failure.stderr, /01: exceeded 40 tool calls\. Stopping without retry\./);
  const caseDirectory = await onlyCase(join(directory, "out"));
  assert.equal((await json(join(caseDirectory, "observations.json"))).failure, "exceeded 40 tool calls");
  const argv = await json(join(directory, "argv.json"));
  assert.equal(argv[argv.indexOf("--tools") + 1], "Read,Grep,Glob");
  assert.equal(argv.includes("--effort"), false);
});

test("live runs require an explicit model", () => {
  assert.throws(() => execFileSync(process.execPath, [runner, "--case", "01"], { stdio: "pipe" }), /Pass --model explicitly/);
});
