#!/usr/bin/env node
import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs, promisify } from "node:util";
import { CASES } from "./cases.mjs";

const exec = promisify(execFile);
const SKILL_DIR = resolve(import.meta.dirname, "..");
const USAGE = `Usage:
  node eval/run.mjs --list
  node eval/run.mjs --prepare [--case 08,13]
  node eval/run.mjs --backend claude --model opus --effort high [--runs 3] [--case 08,13] [--skill-ref REV] [--label NAME]
  node eval/run.mjs --backend pi --model openai-codex/gpt-6-luna:max [...]
  node eval/run.mjs --grade RUN_DIR [--judge-backend pi --judge-model provider/model:thinking]
  node eval/run.mjs --summary RUN_DIR... compare runs
--backend and --grade make model calls. Judging defaults to claude opus. See eval/README.md.`;

const JUDGE = `You grade one code review against a rubric. The review was written by a removal-first reviewer that proposes what to delete or simplify in a code change.

For each "catch" criterion, decide whether the review caught it:
- caught: a finding names the right location, gives reasoning that holds, and proposes a concrete change in the criterion's direction. A passing mention, or the right spot with the wrong reasoning, is not a catch.
- partial: the finding points at the right code but misses part of the criterion (for example removes the code but not its test, or names the problem without a usable change).
- missed: nothing in the review covers it.

Then list false positives: findings or proposals that violate an "avoid" criterion, are wrong about the code, or propose additions (new tests, options, abstractions, docs) that are not the smallest fix for a demonstrated defect. A finding that covers a catch criterion is never a false positive.

Answer with only this JSON, no code fence:
{"verdict": "KEEP|PRUNE|REBUILD CANDIDATE|NEEDS INTENT|OTHER", "catches": [{"result": "caught|partial|missed", "note": "one short sentence"}], "falsePositives": [{"finding": "short quote or title", "why": "one short sentence"}], "coverageLine": true|false}

catches has exactly one entry per catch criterion, in order. coverageLine is whether the review states how many added declarations it judged.`;

const { values, positionals } = parseArgs({ options: {
  list: { type: "boolean" }, prepare: { type: "boolean" }, help: { type: "boolean" },
  backend: { type: "string" }, model: { type: "string" }, effort: { type: "string" },
  runs: { type: "string", default: "3" }, case: { type: "string" }, "skill-ref": { type: "string" },
  label: { type: "string" }, "judge-backend": { type: "string", default: "claude" }, "judge-model": { type: "string" }, concurrency: { type: "string", default: "4" },
  output: { type: "string" }, grade: { type: "string" }, summary: { type: "boolean" },
}, allowPositionals: true, strict: true });

values["judge-model"] ??= values["judge-backend"] === "claude" ? "opus" : undefined;
if (values.backend || values.grade) {
  if (!["claude", "pi"].includes(values["judge-backend"])) throw new Error("--judge-backend is claude or pi");
  if (!values["judge-model"]) throw new Error("pi judging needs an explicit --judge-model");
  if (!Number.isInteger(Number(values.concurrency)) || Number(values.concurrency) < 1) throw new Error("--concurrency must be a positive integer");
}

const storage = resolve(values.output ?? join(process.env.DATA || join(homedir(), "data"), "apps", "pi-prune", "evaluations"));
const selected = values.case ? CASES.filter((reviewCase) => values.case.split(",").includes(reviewCase.id)) : CASES;

if (values.help || values.list || (!values.prepare && !values.backend && !values.grade && !values.summary)) {
  console.log(CASES.map((reviewCase) => `${reviewCase.id}  ${reviewCase.title ?? reviewCase.rubric.catch[0].slice(0, 70)}`).join("\n"));
  console.log(`\n${USAGE}`);
} else if (values.summary) {
  for (const directory of positionals) console.log(await summarize(resolve(directory)));
} else if (values.grade) {
  const directory = resolve(values.grade);
  const results = await pool(await reviewsIn(directory), Number(values.concurrency), async (review) => {
    await grade(review);
    console.log(`graded ${review.case.id} run ${review.run}`);
  });
  if (results.length) console.log(await summarize(directory));
} else {
  if (!selected.length) throw new Error("Unknown case; use --list");
  if (values.backend && !["claude", "pi"].includes(values.backend)) throw new Error("--backend is claude or pi");
  if (values.backend && !values.model) throw new Error("--backend needs an explicit --model");
  await evaluate();
}

async function evaluate() {
  const runs = values.prepare ? 1 : Number(values.runs);
  const capture = await captureScript(values["skill-ref"]);
  await mkdir(storage, { recursive: true, mode: 0o700 });
  const label = values.label ?? (values.prepare ? "prepare" : `${values.backend}-${values.model}${values.effort ? `-${values.effort}` : ""}${values["skill-ref"] ? `-${values["skill-ref"]}` : ""}`);
  const directory = await mkdtemp(join(storage, `${new Date().toISOString().replaceAll(":", "-")}-${label.replace(/[^\w.-]+/g, "_")}-`));
  const settings = { backend: values.backend ?? null, model: values.model ?? null, effort: values.effort ?? null, runs, skillRef: values["skill-ref"] ?? "working tree", judgeBackend: values["judge-backend"], judgeModel: values["judge-model"], cases: selected.map((reviewCase) => reviewCase.id) };
  await writeFile(join(directory, "settings.json"), JSON.stringify(settings, null, 2));
  console.log(`Evaluation: ${directory}`);
  console.log(values.prepare ? "Preparing only; no model calls." : `Model calls: ${runs} run(s) x ${selected.length} case(s) on ${values.backend} ${values.model}, graded by ${values["judge-backend"]} ${values["judge-model"]}.`);

  const jobs = selected.flatMap((reviewCase) => Array.from({ length: runs }, (_, index) => ({ case: reviewCase, run: index + 1, directory: join(directory, `case-${reviewCase.id}`, `run-${index + 1}`) })));
  await pool(jobs, Number(values.concurrency), async (job) => {
    const packet = await prepare(job, capture);
    if (values.prepare) {
      console.log(`${job.case.id}: ${packet.taskPath}`);
      return;
    }
    try {
      await review(job, packet);
      await grade(job);
      const { caught, total, falsePositiveCount } = JSON.parse(await readFile(join(job.directory, "grade.json"), "utf8"));
      console.log(`${job.case.id} run ${job.run}: caught ${caught}/${total}, false positives ${falsePositiveCount}`);
    } catch (error) {
      await writeFile(join(job.directory, "error.txt"), String(error.stack ?? error));
      console.error(`${job.case.id} run ${job.run}: ${error.message}`);
      process.exitCode = 1;
    }
  });
  if (!values.prepare) console.log(await summarize(directory));
}

/** The capture script of the working tree, or of an older skill revision for an A/B comparison. */
async function captureScript(reference) {
  if (!reference) return join(SKILL_DIR, "scripts", "capture.mjs");
  const repository = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: SKILL_DIR, encoding: "utf8" }).trim();
  const prefix = execFileSync("git", ["rev-parse", "--show-prefix"], { cwd: SKILL_DIR, encoding: "utf8" }).trim();
  const checkout = await mkdtemp(join(storage, ".skill-"));
  execFileSync("sh", ["-c", `git -C "$1" archive "$2" "$3" | tar -x -C "$4"`, "sh", repository, reference, prefix, checkout]);
  return join(checkout, prefix, "scripts", "capture.mjs");
}

/** A fresh fixture repository per run, captured by the real capture script with the case's request as intent. */
async function prepare(job, capture) {
  const repository = join(job.directory, "repo");
  await mkdir(repository, { recursive: true, mode: 0o700 });
  const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false",
    "-c", "user.name=Prune Evaluation", "-c", "user.email=prune-eval@example.invalid", ...args], { cwd: repository, stdio: "pipe" });
  const write = async (files) => {
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(repository, path)), { recursive: true });
      await writeFile(join(repository, path), content);
    }
  };
  git("init", "-q", "-b", "main");
  await write(job.case.before);
  git("add", ".");
  git("commit", "-q", "-m", "Initial implementation");
  await write(job.case.after);
  git("add", ".");
  git("commit", "-q", "-m", "Next increment");
  const intent = job.case.request === null
    ? { requests: [], gaps: ["No user request is available for this change."] }
    : { requests: [{ source: "user message", text: job.case.request }], gaps: [] };
  await writeFile(join(job.directory, "intent.json"), JSON.stringify(intent));
  const { stdout } = await exec("node", [capture, "--cwd", repository, "--intent", join(job.directory, "intent.json"), "--output", join(job.directory, "packets")]);
  const packet = JSON.parse(stdout);
  await writeFile(join(job.directory, "packet.json"), stdout);
  return packet;
}

/** One fresh, read-only reviewer with the contract as its system prompt, as the skill launches it. */
async function review(job, packet) {
  const task = await readFile(packet.taskPath, "utf8");
  const contract = await readFile(packet.contractPath, "utf8");
  const started = Date.now();
  let report;
  let meta = {};
  if (values.backend === "claude") {
    const { stdout } = await exec("claude", ["-p", task, "--system-prompt", contract, "--tools", "Read,Grep,Glob",
      "--add-dir", packet.directory, "--model", values.model, ...(values.effort ? ["--effort", values.effort] : []),
      "--output-format", "json", "--no-session-persistence", "--setting-sources", "", "--strict-mcp-config"],
    { cwd: packet.root, timeout: 15 * 60_000, maxBuffer: 64 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.is_error) throw new Error(`reviewer failed: ${result.result ?? result.terminal_reason}`);
    report = result.result;
    meta = { costUsd: result.total_cost_usd, turns: result.num_turns, models: Object.keys(result.modelUsage ?? {}) };
  } else {
    // pi -p waits for stdin to close, and execFile leaves it open.
    const running = exec("pi", ["-p", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates",
      "--no-context-files", "--no-mcp", "--no-themes", "--tools", "read,grep,find,ls", "--model", values.model,
      "--system-prompt", contract, task], { cwd: packet.root, timeout: 15 * 60_000, maxBuffer: 64 * 1024 * 1024 });
    running.child.stdin.end();
    report = (await running).stdout.trim();
  }
  if (!report?.trim()) throw new Error("reviewer returned no report");
  await writeFile(packet.reportPath, report);
  await writeFile(join(job.directory, "review.md"), report);
  await writeFile(join(job.directory, "review.json"), JSON.stringify({ ...meta, seconds: Math.round((Date.now() - started) / 1000) }, null, 2));
}


/** An LLM judge applies the rubric; its notes are saved so a person can audit any grade. */
async function grade(job) {
  const reviewText = await readFile(join(job.directory, "review.md"), "utf8");
  const packet = JSON.parse(await readFile(join(job.directory, "packet.json"), "utf8"));
  const diff = packet.patchPath ? await readFile(packet.patchPath, "utf8") : "";
  const prompt = [
    `## User request\n${job.case.request ?? "(none: the reviewer had no request)"}`,
    `## Change under review\n\`\`\`diff\n${diff}\n\`\`\``,
    `## Rubric\nCatch:\n${job.case.rubric.catch.map((item, index) => `${index + 1}. ${item}`).join("\n")}\nAvoid:\n${job.case.rubric.avoid.map((item) => `- ${item}`).join("\n")}`,
    `## Review\n${reviewText}`,
  ].join("\n\n");
  let answer, judgeCostUsd;
  if (values["judge-backend"] === "pi") {
    const running = exec("pi", ["-p", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates",
      "--no-context-files", "--no-mcp", "--no-themes", "--no-tools", "--model", values["judge-model"],
      "--system-prompt", JUDGE, prompt], { cwd: SKILL_DIR, timeout: 5 * 60_000, maxBuffer: 16 * 1024 * 1024 });
    running.child.stdin.end();
    answer = (await running).stdout;
  } else {
    const running = exec("claude", ["-p", prompt, "--system-prompt", JUDGE, "--tools", "", "--model", values["judge-model"],
      "--output-format", "json", "--no-session-persistence", "--setting-sources", "", "--strict-mcp-config"],
    { timeout: 5 * 60_000, maxBuffer: 16 * 1024 * 1024 });
    running.child.stdin.end();
    const result = JSON.parse((await running).stdout);
    if (result.is_error) throw new Error(`judge failed: ${result.result ?? result.terminal_reason}`);
    answer = result.result;
    judgeCostUsd = result.total_cost_usd;
  }
  const judged = JSON.parse(answer.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  const score = { caught: 1, partial: 0.5, missed: 0 };
  if (!Array.isArray(judged.catches) || judged.catches.length !== job.case.rubric.catch.length
    || judged.catches.some((item) => !Object.hasOwn(score, item?.result))
    || !Array.isArray(judged.falsePositives) || typeof judged.coverageLine !== "boolean"
    || !["KEEP", "PRUNE", "REBUILD CANDIDATE", "NEEDS INTENT", "OTHER"].includes(judged.verdict)) {
    throw new Error(`Invalid judge response for case ${job.case.id}: ${answer}`);
  }
  const graded = {
    ...judged,
    caught: judged.catches.reduce((sum, item) => sum + (score[item.result] ?? 0), 0),
    total: job.case.rubric.catch.length,
    falsePositiveCount: judged.falsePositives.length,
    judgeBackend: values["judge-backend"],
    judgeModel: values["judge-model"],
    judgeCostUsd,
  };
  await writeFile(join(job.directory, "grade.json"), JSON.stringify(graded, null, 2));
}

async function reviewsIn(directory) {
  const jobs = [];
  for (const caseDirectory of (await readdir(directory)).filter((name) => name.startsWith("case-"))) {
    const reviewCase = CASES.find((candidate) => `case-${candidate.id}` === caseDirectory);
    for (const runDirectory of await readdir(join(directory, caseDirectory))) {
      const path = join(directory, caseDirectory, runDirectory);
      if (reviewCase && existsSync(join(path, "review.md"))) jobs.push({ case: reviewCase, run: Number(runDirectory.slice(4)), directory: path });
    }
  }
  return jobs;
}

/** Per case: mean recall, its spread across runs, false positives and verdicts. */
async function summarize(directory) {
  const settings = JSON.parse(await readFile(join(directory, "settings.json"), "utf8"));
  const rows = [];
  const judges = new Set();
  let recall = 0, possible = 0, falsePositives = 0, reviews = 0, cost = 0, seconds = 0;
  for (const job of (await reviewsIn(directory)).sort((a, b) => a.case.id.localeCompare(b.case.id) || a.run - b.run)) {
    const graded = JSON.parse(await readFile(join(job.directory, "grade.json"), "utf8").catch(() => "null"));
    const reviewed = JSON.parse(await readFile(join(job.directory, "review.json"), "utf8").catch(() => "{}"));
    if (!graded) continue;
    judges.add(`${graded.judgeBackend ?? settings.judgeBackend ?? "claude"} ${graded.judgeModel ?? settings.judgeModel}`);
    let row = rows.find((candidate) => candidate.id === job.case.id);
    if (!row) rows.push(row = { id: job.case.id, title: job.case.title ?? "", caught: [], falsePositives: [], verdicts: [], total: graded.total });
    row.caught.push(graded.caught);
    row.falsePositives.push(graded.falsePositiveCount);
    row.verdicts.push(graded.verdict);
    recall += graded.caught; possible += graded.total; falsePositives += graded.falsePositiveCount; reviews++;
    cost += reviewed.costUsd ?? 0; seconds += reviewed.seconds ?? 0;
  }
  const lines = [
    `# ${settings.backend} ${settings.model}${settings.effort ? ` (${settings.effort})` : ""}, skill ${settings.skillRef}`,
    "",
    `Graded ${reviews}/${settings.cases.length * settings.runs} reviews. Judges: ${[...judges].join(", ") || "none"}.`,
    "",
    "| Case | Caught per run | False positives per run | Verdicts |",
    "|---|---|---|---|",
    ...rows.map((row) => `| ${row.id} ${row.title} | ${row.caught.join(", ")} of ${row.total} | ${row.falsePositives.join(", ")} | ${row.verdicts.join(", ")} |`),
    "",
    `Recall ${possible ? Math.round((recall / possible) * 100) : 0}% (${recall} of ${possible} across ${reviews} reviews), ${falsePositives} false positives, reviewer cost $${cost.toFixed(2)}, ${Math.round(seconds / 60)} reviewer-minutes.`,
  ];
  const text = lines.join("\n");
  await writeFile(join(directory, "summary.md"), text + "\n");
  return text;
}

async function pool(items, size, work) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await work(queue.shift());
  }));
  return items;
}
