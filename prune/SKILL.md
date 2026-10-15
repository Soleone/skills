---
name: prune
description: Removal-first, intent-aware review of one increment (uncommitted changes, the latest commit, or a reference commit). Use when asked to prune, chisel, or challenge whether new behavior, options, fallbacks, abstractions or tests earn their place. Returns read-only proposals for approval, not fixes, polish or an improvement backlog.
compatibility: Requires Node 22+ and Git. Runs the review in a fresh subagent when the host has subagents (for example pi with pi-subagents, or Claude Code); otherwise it reviews in the same session and says so.
---

# Prune

> “Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.”
>
> Antoine de Saint-Exupéry, *Airman's Odyssey*

**Build the simplest justified behavior, with the clearest implementation, from the start.** Prune is the backstop, not permission to overbuild.

Coding agents add faster than anyone can shape. Each increment tends to bring something that looks reasonable on its own: an option nobody asked for, a fallback for a case that cannot happen, an interface with one implementation, a copy of a helper that already exists, a test that pins the implementation. The next agent copies what it finds, so this compounds. Ordinary reviews make it worse, because reviewers suggest more.

Prune pushes the other way. It reviews each increment while it is small and asks of every part: does this earn its place, and what breaks if it goes? The burden of proof is on additions; existing code and tests do not prove themselves necessary. Simpler means less to understand, not fewer lines. Required behavior and real safeguards stay. **KEEP with no findings is a successful review.**

## Rules

1. **Read-only.** A review never edits, commits, runs tests or changes task state. It writes only its packet and report. Don't change the reviewed files while it runs.
2. **Proposals, not work orders.** Apply a finding only after the user accepts it, then verify it.
3. **Explicit only.** One review per request. Never start reviews on your own, for example after every commit.
4. **Evidence, not reasoning.** The reviewer gets the user's words, the diff and the repository. Never the transcript or the implementer's reasoning.

## Invocation

```text
/prune
/prune focus on unnecessary fallbacks
/prune --reference abc123
/prune --reference abc123 challenge surviving fallbacks
```

In pi, `/skill:prune` takes the same arguments. An optional leading `--reference <commit>` selects a commit; `--reference` without a commit is an error, so stop and show the usage. The remaining text is the focus. It sets priorities; it never narrows the Git scope, widens the review or authorizes edits.

What gets reviewed:

- **Uncommitted changes exist:** all of them (staged, unstaged and untracked), not only yours.
- **Clean tree:** the latest commit. Older unreviewed commits need `--reference`, one commit per review, newest first.
- **`--reference <commit>`:** today's code that survives from that commit. Superseded parts are skipped, never restored.

## Procedure

`SKILL_DIR` is this skill's directory (in Claude Code: `${CLAUDE_SKILL_DIR}`). Use absolute paths.

### 1. Gather the intent evidence

The reviewer judges necessity against what the user actually asked for. Spend a few steps on this, not an investigation. The evidence is a small JSON document:

```json
{
  "requests": [
    { "source": "user message", "text": "The user's exact words" }
  ],
  "gaps": []
}
```

- Copy the user's requests, constraints and non-goals that concern this increment **verbatim** from this conversation, oldest first.
- Leave out the message that started this review: `/prune`, `/skill:prune` and any text they expand to. Only their focus text can be a request.
- A short assent ("yes", "do it", "option 2") needs what it answered: add `"referencedProposal": { "text": "..." }` holding only the final assistant proposal it accepted. No reasoning, no tool narration.
- A compaction summary, handoff or recap is not the user's words. Include it only with a `source` that says what it is.
- Missing intent is normal. Say what is missing in `gaps`, one sentence each, and move on. Don't search transcript archives, other sessions or task databases unless the user points you there. Never invent quotes, IDs or timestamps.
- Plans, task notes or tool outputs that explain the step go in an optional `workflow.json` file; see [evidence](references/evidence.md). Skip it when there are none. A `.pi/prune-intent.md` anchor at the repository root is picked up automatically.

### 2. Capture the increment

Pipe the intent JSON straight into the capture script, so no temporary file is needed:

```sh
node SKILL_DIR/scripts/capture.mjs --cwd <repository> --intent - <<'JSON'
{ "requests": [{ "source": "user message", "text": "The user's exact words" }], "gaps": [] }
JSON
```

`--cwd` is the repository to review, normally the session's working directory. Add `--reference <commit>`, `--focus "<focus text>"` and `--workflow <file>` when they apply. The script prints JSON with `root`, `scope`, `directory`, `taskPath`, `reportPath` and `stats` (lines added by kind, declarations added). It also writes `inventory.json`: what the patch adds file by file, plus unused code that knip reports in the changed files when the repository has knip installed. The packet in `directory` is a complete handoff: `task.txt` is the reviewer's task, and `contract.md` is its instructions. Capture never changes the repository. If it fails, report its error and stop; don't choose another scope.

**Size.** Review quality drops as the increment grows: past reviews of 800-line diffs came back KEEP while knip found unused files in them. If `stats.codeAdded + stats.testAdded` is over about 400, say so in one line when you launch, and suggest reviewing it commit by commit with `--reference` next time. Don't block on it.

### 3. Run the review in a fresh subagent

Independence comes from a fresh context: the reviewer must not see this conversation. Start exactly one subagent with:

- **Context:** fresh, with no conversation history and no skills.
- **Model and thinking level:** the same as this session, unless the user explicitly asks for a reviewer override.
- **Task:** the full text of `task.txt`. It tells the subagent to read `contract.md` first.
- **Where the host allows it:** `contract.md` as the subagent's system prompt, and only read and search tools. Otherwise the subagent is read-only by instruction alone, and the check in step 4 catches any edit.

Save `launch.json` in the packet directory with the host, model, thinking level and any run ID. If a launch fails or its model and thinking level are unsupported or blocked by policy, report the error and the packet `directory`, then stop. Don't retry another way or downgrade unless the user asks.

**pi with pi-subagents.** If the `subagent` tool is not loaded, call `subagents_enable`. `subagent({action:"models"})` shows the model as `Current session model: provider/id`. Pi does not show you the thinking level: unless the user has stated it in this session, ask once, "The reviewer will use provider/id. Which thinking level: off, minimal, low, medium, high, xhigh or max?" Never take it from settings files or substitute a fixed `high` or `max`. Then launch the built-in `delegate` agent. The `acceptance` setting stops pi-subagents from appending its own report checklist to the task:

```js
subagent({ agent: "delegate", task: "<task.txt>", model: "provider/id:level", context: "fresh",
  cwd: "<root>", async: true, skill: false, acceptance: { level: "none", reason: "The prune contract defines the report" },
  output: "<reportPath>", outputMode: "file-only", artifacts: true })
```

Tell the user the scope and report path, then end your turn. Completion arrives as a notification, so don't poll or call a wait tool. If a launch's outcome is unclear, check its status before any retry.

**Claude Code.** Call the Agent tool with `subagent_type: "general-purpose"`, `description: "Prune review"` and the text of `task.txt` as the `prompt`. Don't pass `model` or `effort` unless the user asked for a reviewer override: the subagent inherits the session's model and effort. Write its final response, unchanged, to `reportPath`.

**No subagents, or the user asked for a direct review.** Review in this session: read `contract.md` completely and follow it for the task in `task.txt`. Start the report with `Direct review by the implementing session: not independent, read-only by instruction only.` The contract's "write no files" covers everything except this report: save it to `reportPath`.

### 4. Deliver

1. Run `node SKILL_DIR/scripts/capture.mjs --verify <directory>`. If it reports a change, say so before anything else: files changed during the review, so the report and the repository may disagree.
2. Read the report. If it reviewed a different scope than you captured, say the review failed instead of presenting it.
3. Reply with who reviewed (fresh subagent with its model and thinking level, or direct), the verdict and its reason, the report's Coverage line, each finding as written (label, location, proposed change), any `More:` line, any decision the user must make, the report path, and the evidence limits in one line. If Coverage is missing or shows unjudged additions, say so: a KEEP that skipped part of the increment is not a clean bill.
4. Add no findings of your own. Leave out any proposal to add tests, options, abstractions, logging or docs unless it is the smallest fix for a demonstrated defect or a labeled breakthrough, and say how many you left out.
5. End by saying nothing was changed and asking which findings to apply. Apply only accepted findings, then run the relevant checks before continuing other work.
6. Once the user has answered, record it in `decision.json` in the packet directory, so prune's precision can be measured over time: `{ "findings": [{ "number": 1, "label": "SAFE SIMPLIFICATION", "decision": "accepted" | "rejected" | "deferred", "reason": "the user's words, if they gave any" }] }`. For a KEEP, record `{ "findings": [], "note": "..." }` only if the user disputes it, for example by pointing at bloat it missed. Write nothing if the user doesn't answer.

## More

- [Review contract](references/review-contract.md): the reviewer's complete instructions. Capture copies it into every packet as `contract.md`.
- [Evidence](references/evidence.md): `workflow.json`, capture scope and limits, privacy, the `.pi/prune-intent.md` anchor.
