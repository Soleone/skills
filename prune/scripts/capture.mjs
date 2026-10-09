#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { captureChange } from "./git.mjs";
import { reviewStorageRoot, writePacket } from "./packet.mjs";

export async function capturePacket({ cwd = process.cwd(), reference, focus = "", intent, workflow, storageRoot = reviewStorageRoot() } = {}) {
  const sessionCwd = resolve(cwd);
  const intentEvidence = intent ?? {
    requests: [],
    gaps: ["No user evidence supplied. The parent must add available relevant requests before review; this skill cannot recover missing original input or pre-compaction history."],
  };
  if (!Array.isArray(intentEvidence.requests)) throw new Error("Intent JSON must contain a requests array.");
  const workflowEvidence = {
    sessionCwd, taskContext: [], plans: [], activity: [], warnings: [],
    ...workflow,
  };
  for (const field of ["taskContext", "plans", "activity", "warnings"]) {
    if (!Array.isArray(workflowEvidence[field])) throw new Error(`Workflow JSON must contain an array for ${field}.`);
  }
  workflowEvidence.warnings = [
    ...workflowEvidence.warnings,
    "Skill capture does not inspect session history. Available evidence is selected by the parent; missing originals and uncertain provenance must be disclosed.",
  ];
  const change = await captureChange(sessionCwd, reference);
  const packet = await writePacket(change, intentEvidence.requests, focus, resolve(storageRoot), workflowEvidence);
  // Preserve explicit provenance/gap fields beyond the original packet's requests array.
  const capturedIntent = JSON.parse(await readFile(packet.intentPath, "utf8"));
  await writeFile(packet.intentPath, JSON.stringify({
    ...capturedIntent, ...intentEvidence,
    note: `${capturedIntent.note} Skill mode: only supplied evidence is captured; no automatic session/input history access. ${intentEvidence.note ?? ""}`.trim(),
  }, null, 2), { mode: 0o600 });
  const taskPath = join(packet.directory, "task.txt");
  await writeFile(taskPath, `${packet.task}\n\nThe complete review contract is bundled with the prune skill. In direct mode, read it before reviewing; in independent mode, the pi-prune-reviewer agent contains it as its system prompt.\n`, { mode: 0o600 });
  return { ...packet, taskPath };
}

async function main() {
  const { values } = parseArgs({ options: {
    cwd: { type: "string" }, reference: { type: "string" }, focus: { type: "string" },
    intent: { type: "string" }, workflow: { type: "string" }, output: { type: "string" },
    help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Usage: node capture.mjs [--cwd PATH] [--reference COMMIT] [--focus TEXT] [--intent JSON_PATH] [--workflow JSON_PATH] [--output STORAGE_ROOT]\nCaptures Git evidence only; no model calls, session scraping, tests or repository edits.");
    return;
  }
  const intent = values.intent ? JSON.parse(await readFile(resolve(values.intent), "utf8")) : undefined;
  const workflow = values.workflow ? JSON.parse(await readFile(resolve(values.workflow), "utf8")) : undefined;
  const { task, ...packet } = await capturePacket({
    cwd: values.cwd, reference: values.reference, focus: values.focus,
    intent, workflow, storageRoot: values.output,
  });
  console.log(JSON.stringify(packet, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Prune capture failed: ${error.message}`); process.exitCode = 1; });
}
