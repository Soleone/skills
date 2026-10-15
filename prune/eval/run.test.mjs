import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const runner = join(import.meta.dirname, "run.mjs");

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "prune-runner-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bin = join(directory, "bin");
  const job = join(directory, "case-01", "run-1");
  await mkdir(bin);
  await mkdir(job, { recursive: true });
  await writeFile(join(directory, "settings.json"), JSON.stringify({
    backend: "pi", model: "reviewer:low", skillRef: "saved", judgeModel: "opus", runs: 3, cases: ["01"],
  }));
  await writeFile(join(job, "review.md"), "KEEP\nThe requested change is direct.");
  await writeFile(join(job, "packet.json"), "{}");
  const stub = `#!/usr/bin/env node
const assert = require('node:assert/strict');
const args = process.argv.slice(2);
assert.ok(args.includes('--system-prompt'));
assert.ok(args.includes('--no-session-persistence') || args.includes('--no-session'));
const isPi = process.argv[1].endsWith('/pi');
const isReviewer = isPi && args.includes('--tools');
if (isPi) {
  for (const flag of ['--no-extensions', '--no-skills', '--no-context-files', '--no-mcp']) assert.ok(args.includes(flag));
  assert.ok(isReviewer ? args.includes('read,grep,find,ls') : args.includes('--no-tools'));
}
process.stdin.resume();
process.stdin.on('end', () => {
  if (isReviewer) { console.log('KEEP\\nThe requested change is direct.'); return; }
  if (process.env.STUB_MODE === 'exit') { console.error('judge unavailable'); process.exitCode = 1; return; }
  const judged = { verdict: 'KEEP', catches: [{ result: 'caught', note: 'Direct requested change.' }], falsePositives: [], coverageLine: true };
  if (process.env.STUB_MODE === 'invalid') judged.catches = [];
  const answer = '\`\`\`json\\n' + JSON.stringify(judged) + '\\n\`\`\`';
  console.log(process.argv[1].endsWith('/pi') ? answer : JSON.stringify({
    is_error: process.env.STUB_MODE === 'claude-error', result: process.env.STUB_MODE === 'claude-error' ? 'usage limit' : answer, total_cost_usd: 0.01,
  }));
});
`;
  for (const name of ["pi", "claude"]) {
    await writeFile(join(bin, name), stub);
    await chmod(join(bin, name), 0o700);
  }
  return {
    directory, job,
    run: (args, mode = "") => exec(process.execPath, [runner, ...args], {
      env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, STUB_MODE: mode }, timeout: 10_000,
    }),
  };
}

test("pi judge receives EOF, has no tools, and records its identity", async (t) => {
  const f = await fixture(t);
  const { stdout } = await f.run(["--grade", f.directory, "--judge-backend", "pi", "--judge-model", "test/judge:high"]);
  const grade = JSON.parse(await readFile(join(f.job, "grade.json"), "utf8"));
  assert.equal(grade.caught, 1);
  assert.equal(grade.judgeBackend, "pi");
  assert.equal(grade.judgeModel, "test/judge:high");
  assert.ok(!Object.hasOwn(grade, "judgeCostUsd"));
  assert.match(stdout, /Graded 1\/3 reviews\. Judges: pi test\/judge:high/);
});

test("pi reviewer also receives EOF and saves its report before judging", async (t) => {
  const f = await fixture(t);
  const { stdout } = await f.run(["--backend", "pi", "--model", "test/reviewer:low", "--runs", "1", "--case", "01", "--output", join(f.directory, "evaluations")]);
  const directory = stdout.match(/Evaluation: (.+)/)[1];
  assert.match(await readFile(join(directory, "case-01", "run-1", "review.md"), "utf8"), /^KEEP/);
  assert.match(stdout, /Graded 1\/1 reviews/);
});

test("Claude remains the default judge and records cost", async (t) => {
  const f = await fixture(t);
  await f.run(["--grade", f.directory]);
  const grade = JSON.parse(await readFile(join(f.job, "grade.json"), "utf8"));
  assert.equal(grade.judgeBackend, "claude");
  assert.equal(grade.judgeModel, "opus");
  assert.equal(grade.judgeCostUsd, 0.01);
});

test("invalid judge rubric length cannot overwrite a saved grade", async (t) => {
  const f = await fixture(t);
  const saved = '{"original":true}';
  await writeFile(join(f.job, "grade.json"), saved);
  await assert.rejects(f.run(["--grade", f.directory, "--judge-backend", "pi", "--judge-model", "test/judge"], "invalid"), /Invalid judge response/);
  assert.equal(await readFile(join(f.job, "grade.json"), "utf8"), saved);
});

test("Claude error responses and pi process failures fail grading", async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.run(["--grade", f.directory], "claude-error"), /judge failed: usage limit/);
  await assert.rejects(f.run(["--grade", f.directory, "--judge-backend", "pi", "--judge-model", "test/judge"], "exit"), /judge unavailable/);
});

test("pi judging requires an explicit model and rejects an empty worker pool", async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.run(["--grade", f.directory, "--judge-backend", "pi"]), /explicit --judge-model/);
  await assert.rejects(f.run(["--grade", f.directory, "--concurrency", "0"]), /positive integer/);
});

test("summary reads legacy grades without making model calls", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.job, "grade.json"), JSON.stringify({ caught: 1, total: 1, falsePositiveCount: 0, verdict: "KEEP" }));
  const { stdout } = await f.run(["--summary", f.directory], "exit");
  assert.match(stdout, /Graded 1\/3 reviews\. Judges: claude opus/);
});
