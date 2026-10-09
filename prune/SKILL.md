---
name: prune
description: Intent-aware, removal-first review of a coherent increment or commit. Use when asked to prune, chisel, challenge unnecessary complexity, or review whether implemented behavior earns its place. Read-only proposals, not general polish or automatic fixes.
---

# Prune

> “Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.”
>
> Antoine de Saint-Exupéry, *Airman's Odyssey*

**Build the simplest justified behavior, with the clearest implementation, from the start.** Prune is a corrective backstop, not permission to overbuild. Question both how behavior is implemented and whether it is needed; existing code and tests do not establish necessity. Keep chiseling until every remaining part has a clear purpose. Judge simplicity by how much someone must understand, not line count, while preserving necessary behavior and safeguards.

Agents can accumulate duplicated logic, loose contracts, speculative abstractions, tangled state and tests that only confirm the implementation. Review after a new commit or a coherent set of uncommitted changes, while the increment is small, before the next agent copies avoidable complexity.

**Removal is the default.** No routine enhancements, extra artifacts, speculative safeguards or coverage for its own sake. Demonstrated violations of required behavior warrant the smallest correction, not extra capabilities. New behavior requires an exceptional breakthrough, consequential benefit, stated cost and explicit approval. Deliberate duplication and clear boundaries can remain. KEEP with no findings is a successful review.

This is judgment support, not proof of quality, a finding quota or an automatic merge gate.

## Required reading

Before preparing or reviewing anything, read both files completely:

- [Review contract](references/review-contract.md): the complete authority rules, all three review passes, safeguards, rebuild criteria and report format. Do not substitute this summary for it.
- [Evidence collection](references/evidence.md): intent provenance, task/plan discovery, packet format, scope rules, privacy and limits.

Resolve every bundled path against this skill directory, not the project cwd. Read large files in pages until complete. The reviewer also reads the complete contract, not just this entry point.

## Invocation and boundary

```text
/skill:prune
/skill:prune focus on unnecessary fallbacks
/skill:prune challenge the export abstraction
/skill:prune --reference abc123
/skill:prune --reference abc123 challenge surviving fallbacks
```

The installed `/prune` prompt is a shortcut for the same skill. Parse an optional leading `--reference <commit>`; everything remaining is focus text. A missing reference is an error. Focus prioritizes the review, never selects Git paths, expands scope or authorizes edits.

Never automatically edit, commit, run tests, update task state or start a review after every commit. Only writes to private review artifacts are permitted. Do not change reviewed files while a review runs.

## Procedure

1. **Establish evidence.** Record the session cwd. Collect relevant available user requests, clarifications, narrowly selected proposal referents, task-context notes, relevant historical tool evidence and referenced plans as described in `references/evidence.md`. Preserve source IDs/paths and evidence gaps. Never turn an agent-written summary into an original user quote. Do not export the full transcript or the implementer's reasoning. A skill cannot recover missing pre-compaction originals or original input before expansion.
2. **Capture the increment.** Run the bundled script with Node 22+ and Git. Use an absolute script path and the actual session cwd:
   ```sh
   node /absolute/path/to/prune/scripts/capture.mjs --cwd /absolute/project/cwd
   node /absolute/path/to/prune/scripts/capture.mjs --cwd /absolute/project/cwd --reference abc123 --focus "challenge surviving fallbacks"
   ```
   It returns packet paths including `taskPath` and `reportPath`. Read `scope.json`, `intent.json`, `workflow.json` and `task.txt`. Fill the deliberately empty intent/workflow evidence using the formats in `references/evidence.md`, retaining the script's limitation notes. Store relevant source snapshots privately in this packet directory. Alternatively, supply prepared JSON using `--intent PATH --workflow PATH` to capture and snapshot it in one step. Do not launch a review with empty evidence when relevant evidence is available.
3. **Choose the review mode honestly.** Explicit `/prune`, `/skill:prune` or a request to use this skill authorizes one independent reviewer as part of this workflow, subject to host delegation policy. Enable pi-subagents if necessary; read its skill and tool-reference guide, then call `subagent({action:"list",capabilities:true})`. Use the bundled `pi-prune-reviewer` only if its discovered configuration is executable and matches the read-only contract: `read,grep,find,ls`, fresh context, no ambient extensions, skills, global instructions or nested delegation; repository instructions are retained. Do not substitute a mutation-capable generic reviewer. Use the current session's exact model and current thinking level together, unless the operator explicitly requested a reviewer override. Before specifying a model, call `subagent({action:"models"})` to confirm its exact provider/id. Pass the resolved pair explicitly as `model:"provider/model:level"`; do not rely on subagent defaults. Use live session information, not startup settings as proof of the current level. If either value is unavailable, ask the user before launching rather than guessing. Never substitute a fixed `high` or `max`, change tiers, or silently downgrade. If the requested pair is unsupported or blocked by policy, report the blocker instead.
4. **Launch one bounded child.** Read `task.txt` and pass its complete text as the task, with `agent:"pi-prune-reviewer"`, `model:"provider/model:level"` using the pair resolved in step 3, `context:"fresh"`, `cwd:scope.root`, `async:true`, `skill:false`, `output:reportPath`, `outputMode:"file-only"`, `artifacts:true`. No forked transcript. The agent definition contains the full rubric. Record the actual run ID and output reference in the packet, announce scope/report location and yield for native completion. Never poll or call a wait tool merely to wait for native notifications. If the child is missing, disabled or misconfigured, report the blocker and preserved capture paths; do not silently install/update agents, widen tools or switch launchers. Follow pi-subagents failure/status/stop rules. Inspect an uncertain launch before retrying.
5. **Review directly only when appropriate.** If delegation is not authorized, or the user explicitly requests a direct review, perform the full contract yourself. Disclose that this is not an independent fresh-context review and that read-only behavior is instruction-level, not tool-enforced. Do not silently fall back to this mode after a child infrastructure failure. In direct mode, write only the final report to `reportPath`.
6. **Deliver proposals, not work orders.** Read the completed report. Return its verdict and material actionable findings with the report path and evidence limits. Check it against the removal-first contract rather than relaying an enhancement backlog. Completion does not authorize fixes. Apply only separately accepted findings, then verify, before continuing implementation.

## Review and output essentials

Perform **all three passes**: intent/necessity; implementation simplicity with actual callers, contracts and concrete execution paths; test necessity and evidence. Missing intent limits product judgments, not supported implementation findings. Inspect thoroughly, report sparingly.

Verdicts: **KEEP**, **PRUNE**, **REBUILD CANDIDATE**, **NEEDS INTENT**.

Every material finding needs current `file:line` evidence, the smallest better shape, what must remain, removal risk/tradeoff and targeted verification. Classify it as **SAFE SIMPLIFICATION**, **APPROVAL REQUIRED** or **INVESTIGATE**. Rebuilds always require approval: identify the exact discard boundary, explain why incremental cleanup is worse, preserve useful requirements/contracts/tests/security and unrelated work, and sketch a smaller replacement. Missing intent is not a reason to rebuild blindly.

A KEEP report needs only verdict, brief reason, scope and material limits. No praise, empty checklist sections, complexity scores or generic improvement backlog. State that tests were not run. Never claim verification or approval from a review.

## Continuity and evaluation

An optional operator-maintained `.pi/prune-intent.md` can anchor goals, non-goals and constraints across sessions. It is not another required ceremony and its filename is not proof of approval. See `references/evidence.md`.

For maintaining the skill, read [evaluation guidance](eval/README.md). Behavioral fixtures and human grading rubrics are preserved in `eval/cases.mjs`; do not give gold rubrics to reviewers. Plumbing tests are not proof of review judgment.
