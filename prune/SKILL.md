---
name: prune
description: Removal-first, intent-aware review of one increment (uncommitted changes, the latest commit, or a reference commit). Use when asked to prune, chisel, or challenge whether new behavior, options, fallbacks, abstractions or tests earn their place. Returns read-only proposals for approval, not fixes, polish or an improvement backlog.
compatibility: Requires Node 22+ and Git. Independent review needs a read-only reviewer agent (pi with pi-subagents, or Claude Code); other hosts get a disclosed direct review.
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

### 1. Write the intent evidence

The reviewer judges necessity against what the user actually asked for. Spend a few steps on this, not an investigation.

Create a temporary directory outside the repository (`mktemp -d`) and write `intent.json` there:

```json
{
  "requests": [
    { "source": "user message", "text": "The user's exact words" }
  ],
  "gaps": []
}
```

- Copy the user's requests, constraints and non-goals that concern this increment **verbatim** from this conversation, oldest first.
- `/prune` and the instructions it expands to are not a request about the code. Its focus text can be.
- A short assent ("yes", "do it", "option 2") needs what it answered: add `"referencedProposal": { "text": "..." }` holding only the final assistant proposal it accepted. No reasoning, no tool narration.
- A compaction summary, handoff or recap is not the user's words. Include it only with a `source` that says what it is.
- Missing intent is normal. Say what is missing in `gaps`, one sentence each, and move on. Don't search transcript archives, other sessions or task databases unless the user points you there. Never invent quotes, IDs or timestamps.
- Plans, task notes or tool outputs that explain the step go in an optional `workflow.json`; see [evidence](references/evidence.md). Skip it when there are none. A `.pi/prune-intent.md` anchor at the repository root is picked up automatically.

### 2. Capture the increment

```sh
node SKILL_DIR/scripts/capture.mjs --cwd <session cwd> --intent <tmp>/intent.json
```

`--cwd` is the repository to review, normally the session's working directory. Add `--workflow <tmp>/workflow.json`, `--reference <commit>` and `--focus "<focus text>"` when they apply. The script prints JSON with `root`, `scope`, `directory`, `taskPath` and `reportPath`. It never changes the repository. If it fails, report its error and stop; don't choose another scope.

### 3. Run the review

Use the first row that applies:

| Situation | Do this |
| --- | --- |
| The user asked for a direct review | Direct review |
| pi, with pi-subagents and the `pi-prune-reviewer` agent | [Launch on pi](#launch-on-pi) |
| Claude Code, with the `prune-reviewer` agent | [Launch on Claude Code](#launch-on-claude-code) |
| Anything else | Direct review. If this host can start a fresh-context subagent limited to read and search tools, use it instead: the [review contract](references/review-contract.md) as its instructions, the text of `task.txt` as its task. |

If an independent launch fails or the reviewer is misconfigured, report the error and the packet `directory`, then stop. Don't retry with another agent or launcher, widen its tools, install agents or switch to a direct review unless the user asks.

**Direct review:** read the [review contract](references/review-contract.md) completely and follow it for the task in `task.txt`. Start the report with `Direct review by the implementing session: not independent, read-only by instruction only.` The contract's "write no files" covers everything except this report: save it to `reportPath`.

#### Launch on pi

1. If the `subagent` tool is not loaded, call `subagents_enable`.
2. Call `subagent({action:"list", capabilities:true})`. The `pi-prune-reviewer` row must exist, be allowed to run and have exactly the tools `read, grep, find, ls`. Otherwise treat it as a failed launch. Never substitute another agent.
3. The reviewer runs on the current session's exact model and thinking level. `subagent({action:"models"})` shows the model as `Current session model: provider/id`. Pi does not show you the thinking level: unless the user has stated it in this session, ask once, "The reviewer will use provider/id. Which thinking level: off, minimal, low, medium, high, xhigh or max?" Never take it from settings files or substitute a fixed `high` or `max`. Use a different pair only when the user explicitly asks for a reviewer override.
4. Launch with the full text of `task.txt`:

   ```js
   subagent({ agent: "pi-prune-reviewer", task: "<task.txt>", model: "provider/id:level",
     context: "fresh", cwd: "<root>", async: true, skill: false,
     output: "<reportPath>", outputMode: "file-only", artifacts: true })
   ```

   If the pair is unsupported or blocked by policy, report the blocker; don't downgrade.
5. Save the run ID and output reference to `launch.json` in the packet directory. Tell the user the scope and report path, then end your turn. Completion arrives as a notification, so don't poll or call a wait tool. If a launch's outcome is unclear, check its status before any retry.

#### Launch on Claude Code

1. Call the Agent tool with `subagent_type: "prune-reviewer"`, `description: "Prune review"` and the full text of `task.txt` as the `prompt`. Don't pass `model` or `effort` unless the user asked for a reviewer override: the agent inherits the session's model and effort.
2. Write the agent's final response, unchanged, to `reportPath`.

### 4. Deliver

1. Read the report. If it reviewed a different scope than you captured, say the review failed instead of presenting it.
2. Reply with the verdict and its reason, each finding as written (label, location, proposed change), any decision the user must make, the report path, and the evidence limits in one line.
3. Add no findings of your own. Leave out any proposal to add tests, options, abstractions, logging or docs unless it is the smallest fix for a demonstrated defect or a labeled breakthrough, and say how many you left out.
4. End by saying nothing was changed and asking which findings to apply. Apply only accepted findings, then run the relevant checks before continuing other work.

## More

- [Review contract](references/review-contract.md): the reviewer's complete instructions. Required reading for a direct review.
- [Evidence](references/evidence.md): `workflow.json`, capture scope and limits, privacy, the `.pi/prune-intent.md` anchor.
- [Evaluation](eval/README.md): behavioral fixtures and a live runner for judging reviewer quality. Tests prove plumbing, not judgment.
