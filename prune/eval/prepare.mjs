#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, mkdtemp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { capturePacket } from "../scripts/capture.mjs";
import { REVIEW_CASES } from "./cases.mjs";

export async function prepareReviewCase(reviewCase, directory, committed = true) {
  const cwd = join(directory, "repo");
  await mkdir(cwd, { recursive: true, mode: 0o700 });
  const git = (...args) => execFileSync("git", [
    "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false",
    "-c", "user.name=Prune Evaluation", "-c", "user.email=prune-eval@example.invalid", ...args,
  ], { cwd, stdio: "pipe" });
  git("init", "-b", "main");
  for (const [path, content] of Object.entries(reviewCase.before)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), content, { mode: 0o600 });
  }
  git("add", ".");
  git("commit", "-m", "Initial implementation");
  for (const [path, content] of Object.entries(reviewCase.after)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), content, { mode: 0o600 });
  }
  if (committed) { git("add", "."); git("commit", "-m", "Next increment"); }
  const requests = reviewCase.request === null ? [] : [{
    entryId: "fixture-request", timestamp: new Date().toISOString(), source: "user-message",
    text: reviewCase.request, attachmentCount: 0,
  }];
  const packet = await capturePacket({ cwd, intent: { requests }, storageRoot: join(directory, "reviews") });
  return { cwd, packet };
}

async function main() {
  const { values } = parseArgs({ options: {
    list: { type: "boolean" }, case: { type: "string" }, working: { type: "boolean" }, output: { type: "string" },
  } });
  if (values.list) { console.log(REVIEW_CASES.map(item => `${item.id}: ${item.request ?? "Missing intent"}`).join("\n")); return; }
  const cases = values.case ? REVIEW_CASES.filter(item => item.id === values.case) : REVIEW_CASES;
  if (!cases.length) throw new Error(`Unknown case: ${values.case}`);
  const root = resolve(values.output ?? join(process.env.DATA || join(homedir(), "data"), "apps", "pi-prune", "evaluations"));
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(root, "prepared-"));
  for (const reviewCase of cases) {
    const caseDirectory = join(directory, reviewCase.id);
    const { cwd, packet } = await prepareReviewCase(reviewCase, caseDirectory, !values.working);
    // Gold expectations stay outside both the evidence packet and the fixture repository.
    await writeFile(join(caseDirectory, "rubric.json"), JSON.stringify(reviewCase.rubric, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ case: reviewCase.id, cwd, taskPath: packet.taskPath, reportPath: packet.reportPath }));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
