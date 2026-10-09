#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { prepareReviewCase } from "./prepare.mjs";
import { REVIEW_CASES } from "./cases.mjs";

const CONTRACT = fileURLToPath(new URL("../references/review-contract.md", import.meta.url));
const BOUNDS = { seconds: 180, toolCalls: 40 };
const text = content => typeof content === "string" ? content
  : (content ?? []).filter(block => block.type === "text").map(block => block.text).join("\n");

// One fresh session per case: the contract as the whole system prompt, read/search tools only,
// and no extensions, skills, MCP servers, context files or saved session.
const HOSTS = {
  pi: {
    args: ({ prompt, task, model, thinking }) => [
      "--mode", "json", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-themes",
      "--no-context-files", "--no-mcp", "--no-approve", "--tools", "read,grep,find,ls",
      "--system-prompt", prompt, "--model", thinking ? `${model}:${thinking}` : model, task,
    ],
    read(event, run) {
      if (event.type === "tool_execution_start") run.toolCalls.push({ name: event.toolName, args: event.args });
      if (event.type === "message_end" && event.message?.role === "assistant") {
        run.report = text(event.message.content);
        run.cost += event.message.usage?.cost?.total ?? 0;
        if (event.message.errorMessage) run.error = event.message.errorMessage;
      }
    },
  },
  claude: {
    args: ({ prompt, task, model, thinking }) => [
      "--print", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--strict-mcp-config",
      "--tools", "Read,Grep,Glob", "--system-prompt", prompt, "--model", model, ...(thinking ? ["--effort", thinking] : []), task,
    ],
    read(event, run) {
      if (event.type === "assistant") {
        for (const block of event.message?.content ?? []) {
          if (block.type === "tool_use") run.toolCalls.push({ name: block.name, args: block.input });
        }
      }
      if (event.type === "result") {
        run.report = event.result ?? "";
        run.cost += event.total_cost_usd ?? 0;
        if (event.is_error) run.error = event.result || event.subtype;
      }
    },
  },
};

function review(host, bin, options, cwd) {
  return new Promise(done => {
    const run = { toolCalls: [], report: "", cost: 0, trace: "", stderr: "" };
    const child = spawn(bin, host.args(options), { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stop = reason => { run.stop ??= reason; child.kill("SIGTERM"); };
    const timer = setTimeout(() => stop(`exceeded ${BOUNDS.seconds} seconds`), BOUNDS.seconds * 1000);
    let pending = "";
    const parse = line => {
      let event;
      try { event = JSON.parse(line); } catch { return; } // Hosts may print non-JSON notices.
      host.read(event, run);
      if (run.toolCalls.length > BOUNDS.toolCalls) stop(`exceeded ${BOUNDS.toolCalls} tool calls`);
    };
    child.stdout.setEncoding("utf8").on("data", chunk => {
      run.trace += chunk;
      const lines = (pending + chunk).split("\n");
      pending = lines.pop();
      lines.forEach(parse);
    });
    child.stderr.setEncoding("utf8").on("data", chunk => { run.stderr = (run.stderr + chunk).slice(-4000); });
    let finished = false;
    const finish = (exitCode, error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      parse(pending);
      done({ ...run, exitCode, error: run.error ?? error });
    };
    child.on("error", error => finish(null, error.message));
    child.on("close", code => finish(code));
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    model: { type: "string" }, thinking: { type: "string" }, host: { type: "string", default: "pi" }, bin: { type: "string" },
    case: { type: "string" }, working: { type: "boolean" }, "prompt-file": { type: "string" }, output: { type: "string" },
  } });
  const host = HOSTS[values.host];
  if (!host) throw new Error(`Unknown host ${values.host}; use pi or claude.`);
  if (!values.model) throw new Error("Pass --model explicitly: a live evaluation spends provider tokens. eval/prepare.mjs prepares cases for free.");
  const cases = values.case ? REVIEW_CASES.filter(item => item.id === values.case) : REVIEW_CASES;
  if (!cases.length) throw new Error(`Unknown case: ${values.case}`);
  const prompt = await readFile(resolve(values["prompt-file"] ?? CONTRACT), "utf8");
  const root = resolve(values.output ?? join(process.env.DATA || join(homedir(), "data"), "apps", "pi-prune", "evaluations"));
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(root, `${new Date().toISOString().replaceAll(":", "-")}-`));
  await writeFile(join(directory, "prompt.txt"), prompt, { mode: 0o600 });
  console.log(`Evaluation ${directory}: ${values.host} ${values.model}${values.thinking ? ` thinking ${values.thinking}` : ""}. Rubrics are written after each review.`);
  for (const reviewCase of cases) {
    const caseDirectory = join(directory, reviewCase.id);
    const { cwd, packet } = await prepareReviewCase(reviewCase, caseDirectory, !values.working, prompt);
    const started = Date.now();
    const options = { prompt, task: await readFile(packet.taskPath, "utf8"), model: values.model, thinking: values.thinking };
    const run = await review(host, values.bin ?? values.host, options, cwd);
    const failure = run.stop ?? run.error ?? (run.exitCode !== 0 ? `exit code ${run.exitCode}` : run.report.trim() ? undefined : "no report");
    if (run.report.trim()) await writeFile(packet.reportPath, run.report, { mode: 0o600 });
    await writeFile(join(caseDirectory, "trace.jsonl"), run.trace, { mode: 0o600 });
    await writeFile(join(caseDirectory, "observations.json"), JSON.stringify({
      host: values.host, model: values.model, thinking: values.thinking ?? null, seconds: (Date.now() - started) / 1000,
      cost: run.cost, toolCalls: run.toolCalls, exitCode: run.exitCode, failure: failure ?? null, stderr: run.stderr || null,
    }, null, 2), { mode: 0o600 });
    // Gold expectations land only after the review, outside both the fixture repository and the packet.
    await writeFile(join(caseDirectory, "rubric.json"), JSON.stringify(reviewCase.rubric, null, 2), { mode: 0o600 });
    if (failure) {
      process.exitCode = 1;
      console.error(`${reviewCase.id}: ${failure}. Stopping without retry.`);
      break;
    }
    console.log(`${reviewCase.id}: ${packet.reportPath} (${run.toolCalls.length} tool calls; grade by hand)`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
