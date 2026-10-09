# Evidence and scope

What the parent collects for the reviewer, what capture records, and the limits of both. The goal is honest evidence, not complete evidence: a missing source is disclosed, never reconstructed.

## Intent: `intent.json`

```json
{
  "requests": [
    {
      "source": "user message",
      "text": "The user's exact words",
      "entryId": "optional: a real message ID",
      "timestamp": "optional: a real time",
      "attachmentCount": 0,
      "referencedProposal": { "text": "The final assistant proposal this reply accepted" }
    }
  ],
  "gaps": ["One sentence per missing source"],
  "note": "Optional context for the reviewer"
}
```

Only `requests[].source` and `requests[].text` are required. Keep requests in chronological order. An empty `requests` array is legitimate when no intent is available; `gaps` says why.

- **The user's words establish intent.** Copy relevant requests, clarifications, constraints and non-goals verbatim. Skip identifiable tool or extension notifications.
- **Summaries are secondary.** A compaction summary, handoff or recap can be included with a `source` naming it, never as a quote. You only have what is in your context; if earlier messages were compacted or belong to another session, record that in `gaps`.
- **Assent needs its referent.** For "yes, do that", add the immediately preceding final assistant proposal as `referencedProposal`, and only the part needed. Never copy thinking or tool-driving narration. Only unambiguous acceptance establishes a decision; partial or ambiguous acceptance stays a question.
- **Respect omissions.** Never recover deliberately omitted or redacted text from logs or abandoned branches, and never send the full transcript.
- **Attachments are counted, not copied.** If intent depends on an attachment you cannot supply, add a gap.
- **Don't invent.** No made-up IDs, timestamps or quotes, and no implementer interpretation in place of a request.

## Plans, tasks and tool outputs: `workflow.json` (optional)

Use it when a plan or task record explains the step that produced the diff.

```json
{
  "sessionCwd": "/the/session/cwd",
  "taskContext": [{ "source": "where the note came from", "text": "Relevant note", "truncated": false }],
  "plans": [{ "path": "/original/plan.md", "referencedBy": ["user message 2"], "content": "Plan text" }],
  "activity": [{ "tool": "tool name", "inputPreview": "Short input", "text": "Output", "truncated": false, "isError": false }],
  "warnings": ["Anything the reviewer should know about these sources"]
}
```

All arrays may be empty, and `sessionCwd` defaults to `--cwd`. Set it when the session works outside the reviewed repository, because relative task paths resolve against it. Capture writes each plan's `content` to `plan-N.md` and each activity `text` to `activity-N.txt` inside the packet, replacing them with `snapshotPath` and `outputPath`. For a plan you could not read, give `path` and `error` instead of `content`. Capture reads nothing from your session: you supply everything.

- **Plans describe steps, not requirements.** A short "continue" is navigation, not a new specification, and a growing agent-written plan is not ground truth. Current plan contents do not prove which version was accepted. Task titles, statuses, assignments and generated descriptions do not establish approval.
- **Find the step that produced this diff.** It may be closed and differ from the next open task.
- **Assume no task system.** Learn conventions from the user's and project's instructions; no backend, command, schema or status names are built in.
- **Include only what is relevant.** Keep the original source path and what referenced it. Resolve a plan's relative links against its original path. Executed operations are evidence of what happened, not requirements. Never replay commands or refresh task state to collect evidence.
- **Leave prune out.** Exclude prune's own notices and earlier prune reports unless the user explicitly references one.
- **Budgets:** at most 12 plans of up to 2 MiB each, 8 task notes of 16,000 characters, 40 tool outputs of 32,000 characters, and 1,000-character input previews. Mark anything cut short as `truncated`. Capture does not enforce these limits; you do.

## Git scope

- **Dirty tree:** every staged, unstaged and non-ignored untracked change, not only agent-authored work, captured from the Git root even when run in a subdirectory. The latest commit is supplied as `latestCommit` in case the working diff is only task bookkeeping. Capture never switches to it or drops files by name; the reviewer decides from the evidence.
- **Clean tree:** the latest commit against its first parent, merge commits included. Several unreviewed commits need one `--reference` review each. Root commits and unborn repositories work.
- **`--reference <commit>`:** captures that commit's first-parent diff as a guide to today's code; `scope.head` is the current checkout and the dirty status is recorded. The working diff is not captured in this mode. Use one reference per review, newest first for a retrospective queue, and track the queue and findings in your own plan.
- **Limits:** ignored files are excluded; binary changes stay markers and must be disclosed as unreviewed. Each patch is limited to 16 MiB and a dirty capture to 500 untracked files. Oversized scopes fail instead of being truncated, and a focus cannot narrow them. An unavailable `latestCommit` is disclosed without blocking. A dirty submodule may need its own review.
- **Never mutates:** no checkout switching, index changes, external diff drivers or textconv.
- **Failures stop the review:** no reviewable change, a non-Git directory, an invalid reference or a capture error. Report it; never substitute another scope.

The patch is a snapshot, but the reviewer reads live files. Don't change reviewed files until the review finishes; mismatches are disclosed and qualify findings. Read-only tools are a tool ceiling, not an operating-system sandbox.

## Packet and privacy

Packets live under `$DATA/apps/pi-prune/reviews/`, falling back to `~/data/apps/pi-prune/reviews/`. Each review gets a new directory, mode `0700`, with files at `0600`:

- `intent.json`, `scope.json`, `workflow.json`: the evidence and the captured scope
- `change.diff`: the primary patch; `latest-commit.diff` when offered
- `plan-N.md`, `activity-N.txt`: snapshots of supplied evidence
- `task.txt`: the reviewer's task
- `review.md`: the final report; `launch.json`: the run ID, when launched

Packets can contain prompts, code, task context and tool output, and are never deleted automatically. Everything the reviewer reads is sent to its model provider, so include only relevant evidence, redact secrets and respect the user's exclusions. A completed launch proves neither good judgment nor quality, and no review runs tests.

## Continuity anchor

An optional, short `.pi/prune-intent.md` at the repository root carries goals across sessions. Capture adds it to `workflow.plans` automatically.

```md
Goal: Export invoices as CSV.
Non-goals: Other formats, a reporting platform, plugin interfaces.
Constraints: Preserve account permissions and visible errors.
```

The operator writes and approves it. Its filename proves neither authorship nor approval, and a long generated replacement plan only moves the drift somewhere else.
