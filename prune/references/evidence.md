# Evidence collection and scope

This skill replaces pi-prune's extension capture with explicit, best-effort evidence assembly. Preserve the distinction between a human request, an approved proposal, an operational plan and an agent assumption. Do not compensate for missing provenance with confident reconstruction.

## Human intent

- Select user requests relevant to the increment from available session context. Preserve actual wording, source IDs and timestamps when available. Include clarifications, non-goals and constraints. Exclude identifiable extension-generated notifications.
- Respect explicit omissions and redactions. Never recover deliberately omitted text from raw session logs or abandoned branches. Do not scrape the full parent transcript, import reasoning, or send the full conversation to the reviewer.
- Compaction summaries are secondary evidence, not original requests. A skill does not automatically record original interactive/RPC input before prompt/skill expansion, exact-match queued steers/follow-ups, or read the active branch's pre-compaction originals. Mark missing originals, uncertain source provenance and missing approval rather than claiming the extension's guarantees.
- An assent such as “yes, do that” needs the immediately preceding final assistant proposal as a non-authoritative referent. Copy only the necessary proposal, never thinking or tool-driving narration. Only unambiguous acceptance establishes a decision; partial or ambiguous acceptance remains a question.
- Count attachments when known, but do not silently copy them. Flag attachment-dependent intent as incomplete unless the necessary content has been explicitly supplied for review.
- A new session cannot recover an earlier session's unstated requests. Available project evidence can still support useful implementation findings. Missing intent is not permission to infer preferences or blindly rebuild.

`intent.json` contains a chronological `requests` array. Use this shape when evidence is available, without inventing identifiers or timestamps:

```json
{
  "note": "Available user evidence only; missing originals and approvals are disclosed.",
  "requests": [
    {
      "entryId": "actual source ID, or an explicitly labeled context pointer",
      "source": "original user message, or clearly labeled secondary source",
      "text": "Actual available request text",
      "attachmentCount": 0,
      "referencedProposal": { "entryId": "proposal source", "text": "Necessary final proposal referent" }
    }
  ],
  "gaps": ["Any missing provenance, omitted attachments, or unavailable original intent"]
}
```

`timestamp` and `referencedProposal` are optional. Empty requests are legitimate when intent is unavailable, but disclose why. Do not populate them with the implementing agent's interpretation.

## Task and plan evidence

A short “continue” is navigation, not a new specification. A growing agent-written plan is not ground truth.

- Learn task conventions from actual user/project instructions and task-related context. No built-in backend names, commands, queue locations, environment conventions, metadata schemas, storage formats or status vocabulary are assumed.
- Identify the task/plan step that produced the reviewed diff. It may be completed and differ from the next ready task. Assignments, titles, statuses and generated descriptions do not establish human approval.
- Inspect only relevant available historical outputs. Index their tool names, input previews, source IDs and capture paths rather than copying unrelated history into the reviewer prompt. Executed operations are evidence, not requirements. Never replay commands or silently refresh/update task state as part of review.
- Copy referenced Markdown plans from relevant user messages, approved proposal referents, task-context notes and available plan-related tool evidence. Keep the original source path and referencing source IDs. Sources may be outside the Git root or ignored by Git. Resolve relative links against their original path, not the capture directory; use the recorded session cwd for workflow-relative paths.
- Exclude prune notices, prior prune reports and report-read activity from automatic task/plan discovery. Explicit human/proposal references to a report still count. Unavailable sources are gaps, not invitations to guess.
- Current plan contents are not proof of the version accepted earlier. A task description cannot launder speculative additions into requirements. Separate human goal, operational step, supported scope, assumptions and consequential uncertainty.

`workflow.json` uses this shape (arrays may be empty):

```json
{
  "sessionCwd": "/actual/session/cwd",
  "taskContext": [
    { "entryId": "source", "source": "actual context source", "text": "Relevant note", "truncated": false }
  ],
  "plans": [
    { "path": "/original/plan.md", "referencedBy": ["user:source"], "content": "Available complete plan content" }
  ],
  "activity": [
    { "entryId": "source", "tool": "actual tool name", "inputPreview": "Relevant bounded input", "text": "Historical output", "truncated": false, "isError": false }
  ],
  "warnings": ["Missing original intent; historical evidence may be stale"]
}
```

When supplied with `--workflow`, the capture script turns plan `content` into private `plan-N.md` files with `snapshotPath`, and activity `text` into `activity-N.txt` files with `outputPath`. It does not discover source files or retrieve session history. If assembling after capture, write those files yourself inside the returned packet directory and index them using the same fields. Mark unavailable plans with `error`; disclose truncations and retain uncopied source pointers. Do not fabricate absent tool outputs.

Retain the original evidence budgets: at most twelve copied plans, 2 MiB per plan source, eight task-context notes of 16,000 characters each, forty historical tool outputs of 32,000 characters each, and 1,000-character input previews. These are collection instructions, not automatic limits enforced by the generic packet writer. Mark gaps/truncation explicitly; do not pretend an oversized source is complete. Prefer relevant evidence over filling slots.

## Git scope

The bundled capture script preserves the original Git scope implementation:

- Dirty tree: all staged, unstaged and non-ignored untracked changes, not just agent-authored work. Capture from the Git root even when invoked in a subdirectory. Supply the latest commit as an alternative if available, but never automatically switch to it or omit bookkeeping based on filenames. The reviewer chooses from actual workflow evidence; substantive requirement changes must remain in scope.
- Clean tree: the latest commit against its first parent, including merge commits. This does not cover all intervening increments if several commits accumulated. Root commits and unborn repositories are supported.
- `--reference <commit>`: resolve one hash/ref and capture its first-parent patch. Review **today's live code**, not a historical checkout. `scope.head` is current HEAD; `scope.referenceCommit` is the historical scope guide. Trace surviving/replaced/renamed behavior, callers and tests. Skip superseded/removed code rather than restoring or reverting it. Findings need current file:line evidence. Current dirty status is recorded, but the working diff is not captured in this mode. Stay within reference-related code and immediate dependencies.
- Use one reference per review, newest first for a retrospective queue. Track overlap/findings in the operator's plan. No automatic queue or fixes.
- Ignored files are excluded from the patch. Binary changes remain markers; generated/binary content not inspected must be disclosed. Dirty submodules may require capture inside their repository.
- No checkout switching, index mutation, external diff drivers or textconv. Each patch is bounded to 16 MiB and dirty capture to 500 untracked files. Oversized primary scope fails rather than truncating. An unavailable optional latest commit is disclosed without blocking working-scope capture. Focus cannot narrow an oversized patch.
- No reviewable patch, non-Git cwd, invalid reference or capture failure stops the workflow. Keep available paths/error evidence, never silently substitute another scope.

`scope.json` records root, current HEAD, base, status, changed files, chosen capture mode, capture time, focus, optional reference commit and optional latest-commit evidence/patch path.

The patch is captured, but repository reads see live files, not an isolated checkout. Avoid changing reviewed files until completion. Ordinary live/capture mismatches must be disclosed and findings qualified. In reference mode later changes are expected; disclose supersession and missing/untraceable implementations as coverage limits. Read-only tools are not an operating-system sandbox against malicious trusted extensions or repository instructions.

## Continuity anchor

An optional `.pi/prune-intent.md` can contain a short operator-maintained anchor:

```md
Goal: Export invoices as CSV.
Non-goals: Other formats, a reporting platform, plugin interfaces.
Constraints: Preserve account permissions and visible errors.
```

Keep it short and consciously approve/edit it. Auto-generating a long replacement plan merely relocates drift. The filename does not establish authorship or approval. If materially ambiguous intent blocks a product judgment, return NEEDS INTENT with one consequential decision, while still reporting supported implementation findings.

## Artifacts and privacy

Review artifacts live under `$DATA/apps/pi-prune/reviews/`, falling back to `~/data/apps/pi-prune/reviews/`. Each new private directory contains:

- `intent.json`: source-linked available user requests and narrow proposal referents.
- `scope.json`: repository, refs, files, time and optional focus.
- `workflow.json`: task context, historical activity index, plan references and gaps.
- `change.diff`: primary captured patch.
- `latest-commit.diff`: optional committed alternative for bookkeeping-only working changes.
- `plan-N.md`, `activity-N.txt`: supplied private evidence snapshots.
- `task.txt`: bounded review handoff, with packet paths.
- `review.md`: final review, saved by the subagent host or direct reviewer.
- Optional launch receipt: actual run ID/output reference, not a claim that review succeeded.

Directories are created with mode `0700` and captured files with `0600`. These durable files can contain prompts, code, task context and tool outputs and are not automatically deleted. Include only relevant evidence; requests, input previews and reviewer-selected evidence go to the configured model provider. Redact secrets and respect operator exclusions before capture. Passing tests or a successful launch proves neither judgment nor quality. Do not claim tests ran during review.
