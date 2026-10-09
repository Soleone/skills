#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { captureChange } from "./git.mjs";

const USAGE = `Usage: node capture.mjs [--cwd PATH] [--intent JSON_PATH] [--workflow JSON_PATH] [--reference COMMIT] [--focus TEXT] [--output STORAGE_ROOT]
Captures Git evidence into a private review packet. No model calls, session scraping, tests or repository edits.`;
const INTENT_NOTE = "Requests selected by the parent session from its available context; compacted or earlier messages may be missing. Select those relevant to the captured change. A referencedProposal only explains what a short reply accepted; it is not a requirement. Attachments are counted, not copied.";
const WORKFLOW_NOTE = "Operational evidence supplied by the parent session, not authoritative intent. Capture does not inspect session history. No task backend, format or command names are assumed. Activity is historical and may be stale. Plan snapshots show a file's current text, not necessarily the accepted version. A project intent note's filename proves neither authorship nor approval.";
const WORKING_NOTE = "All changes in this scope are included, not only agent-authored ones. The patch is a snapshot; repository reads see live files. Binary patches are not expanded and no tests were run.";
const REFERENCE_NOTE = "The patch is the reference commit's first-parent diff, not today's working diff. Review its surviving implementation in the live current tree; later changes and removals are expected. head and status describe the current checkout. Binary patches are not expanded and no tests were run.";

export function reviewStorageRoot() {
  return join(process.env.DATA || join(homedir(), "data"), "apps", "pi-prune", "reviews");
}

export async function capturePacket({ cwd = process.cwd(), reference, focus = "", intent, workflow, storageRoot = reviewStorageRoot() } = {}) {
  const { note: intentNote, ...evidence } = intent ?? { requests: [], gaps: ["No intent was supplied to capture."] };
  if (!Array.isArray(evidence.requests) || evidence.requests.some(request => typeof request?.text !== "string")) {
    throw new Error("Intent JSON must contain a requests array of { source, text } objects.");
  }
  const sessionCwd = resolve(cwd);
  const { note: workflowNote, ...operational } = { sessionCwd, taskContext: [], plans: [], activity: [], warnings: [], ...workflow };
  for (const field of ["taskContext", "plans", "activity", "warnings"]) {
    if (!Array.isArray(operational[field])) throw new Error(`Workflow JSON must contain an array for ${field}.`);
  }
  const change = await captureChange(sessionCwd, reference);
  await addIntentAnchor(change.root, operational);

  const storage = resolve(storageRoot);
  await mkdir(storage, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(storage, `${new Date().toISOString().replaceAll(":", "-")}-`));
  const path = name => join(directory, name);
  const write = (name, content) => writeFile(path(name), content, { mode: 0o600 });
  const { patch, latestCommit, ...scope } = change;
  if (latestCommit) await write("latest-commit.diff", latestCommit.patch);
  const plans = await Promise.all(operational.plans.map(async ({ content, ...plan }, index) => {
    if (content === undefined) return plan;
    await write(`plan-${index + 1}.md`, content);
    return { ...plan, snapshotPath: path(`plan-${index + 1}.md`) };
  }));
  const activity = await Promise.all(operational.activity.map(async ({ text, ...observation }, index) => {
    if (text === undefined) return observation;
    await write(`activity-${index + 1}.txt`, text);
    return { ...observation, outputPath: path(`activity-${index + 1}.txt`) };
  }));
  const packet = {
    root: change.root, scope: change.scope, directory,
    intentPath: path("intent.json"), scopePath: path("scope.json"), workflowPath: path("workflow.json"),
    patchPath: path("change.diff"), taskPath: path("task.txt"), reportPath: path("review.md"),
  };
  await Promise.all([
    write("intent.json", JSON.stringify({ note: [INTENT_NOTE, intentNote].filter(Boolean).join(" "), ...evidence }, null, 2)),
    write("scope.json", JSON.stringify({
      ...scope,
      ...(latestCommit ? { latestCommit: { head: latestCommit.head, base: latestCommit.base, files: latestCommit.files, patchPath: path("latest-commit.diff") } } : {}),
      capturedAt: new Date().toISOString(),
      focus: focus || null,
      note: change.referenceCommit ? REFERENCE_NOTE : WORKING_NOTE,
    }, null, 2)),
    write("change.diff", patch),
    write("workflow.json", JSON.stringify({ note: [WORKFLOW_NOTE, workflowNote].filter(Boolean).join(" "), ...operational, plans, activity }, null, 2)),
    write("task.txt", reviewTask(packet, latestCommit && path("latest-commit.diff"))),
  ]);
  return packet;
}

// The operator's optional anchor travels with every review, like any supplied plan.
async function addIntentAnchor(root, workflow) {
  const anchor = join(root, ".pi", "prune-intent.md");
  if (workflow.plans.some(plan => plan.path && resolve(workflow.sessionCwd, plan.path) === anchor)) return;
  try {
    const content = await readFile(anchor, "utf8");
    workflow.plans = [...workflow.plans, { path: anchor, referencedBy: ["optional project intent note; authorship and approval are not assumed"], content }];
  } catch (error) {
    if (error.code !== "ENOENT") workflow.warnings = [...workflow.warnings, `Project intent note unreadable: ${error.message}`];
  }
}

function reviewTask(packet, latestCommitPath) {
  return [
    `Review the captured change in ${JSON.stringify(packet.root)}.`,
    "Read these files completely first, paging through large ones:",
    `- Scope, mode and optional focus: ${JSON.stringify(packet.scopePath)}`,
    `- Captured patch: ${JSON.stringify(packet.patchPath)}`,
    ...(latestCommitPath ? [`- Latest-commit alternative, for a bookkeeping-only working diff: ${JSON.stringify(latestCommitPath)}`] : []),
    `- User requests: ${JSON.stringify(packet.intentPath)}`,
    `- Plans, task notes and tool outputs: ${JSON.stringify(packet.workflowPath)}`,
    "  Of the snapshotPath and outputPath files it lists, read only those relevant to this change. Resolve a plan's relative links against its original path, and task paths against sessionCwd.",
    "Follow the prune review contract: references/review-contract.md in the prune skill, already your instructions if you are the reviewer agent. A focus sets priorities; it never widens the review.",
    `Return the complete report as your final response and write no files. It is saved to ${JSON.stringify(packet.reportPath)}.`,
  ].join("\n") + "\n";
}

async function main() {
  const { values } = parseArgs({ options: {
    cwd: { type: "string" }, reference: { type: "string" }, focus: { type: "string" },
    intent: { type: "string" }, workflow: { type: "string" }, output: { type: "string" },
    help: { type: "boolean" },
  } });
  if (values.help) { console.log(USAGE); return; }
  const json = async path => path && JSON.parse(await readFile(resolve(path), "utf8"));
  const packet = await capturePacket({
    cwd: values.cwd, reference: values.reference, focus: values.focus,
    intent: await json(values.intent), workflow: await json(values.workflow), storageRoot: values.output,
  });
  console.log(JSON.stringify(packet, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Prune capture failed: ${error.message}`); process.exitCode = 1; });
}
