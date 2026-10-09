# Prune

A removal-first, intent-aware review for coding agents. After each increment it asks of every new part: does this earn its place, and what breaks if it goes? It proposes what to delete, narrow or simplify, and leaves every decision to you. It never edits.

## Why

Agents add working software faster than anyone can shape it. Each increment brings something that looks reasonable on its own: an option nobody asked for, a fallback for a case that cannot happen, an interface with one implementation, a copy of an existing helper, a test that pins the implementation. The next agent copies what it finds, so the accumulation compounds. Ordinary reviews make it worse, because reviewers suggest additions.

Prune is the counterweight, run while each increment is still small:

- **The burden of proof is on additions.** Existing code and tests do not prove they are needed.
- **Intent decides necessity.** The user's own words define the goal. Agent-written plans drift, so they explain the step but cannot turn an assumption into a requirement.
- **Independent.** A fresh subagent sees the evidence and the code, never the conversation or the implementer's reasoning.
- **Proposals, not work orders.** Findings say who must decide. Nothing is applied without your approval.
- **KEEP is success.** No quota, no praise, no improvement backlog.

It is judgment support, not proof of quality or a merge gate.

## Use

```text
/prune
/prune focus on unnecessary fallbacks
/prune challenge the export abstraction
/prune --reference abc123
/prune --reference abc123 challenge surviving fallbacks
```

The loop: implement one increment, run `/prune`, read the proposals, accept what you want, apply and verify, continue. A dirty tree reviews all uncommitted changes; a clean tree reviews the latest commit. For older commits, review one `--reference` at a time, newest first. Focus text sets priorities; it never narrows the Git scope or grants permission to edit.

## Install

Requires Node 22+ and Git. Link this directory into your agent's skills directory; that is the whole install, on any host that loads Agent Skills. Don't overwrite existing paths.

```sh
ln -s "$SRC/skills/prune" ~/.claude/skills/prune      # Claude Code
ln -s "$SRC/skills/prune" ~/.pi/agent/skills/prune    # pi
```

The review runs in a fresh subagent with your session's model and thinking level: Claude Code's `general-purpose` agent, or pi-subagents' built-in `delegate` on pi. Hosts without subagents get a review in the same session, labeled as not independent. No reviewer agent needs installing.

- **pi:** install pi-subagents (`pi install npm:pi-subagents`) for independent reviews. Pi does not tell the model its thinking level, so the parent asks once per session unless you've said it. `pi install "$SRC/skills/prune"` also adds a `/prune` shortcut for `/skill:prune`. Run `/reload` after changes.
- **Claude Code:** packets live outside your project, so reading them may ask for permission. To skip that, allow `Read(~/data/apps/pi-prune/reviews/**)` in `~/.claude/settings.json`.

A general-purpose subagent could edit files, so read-only is an instruction there, and the parent runs `capture.mjs --verify` after every review to prove nothing changed.

## How it works

1. The parent writes the user's relevant requests, verbatim, to `intent.json`, plus optional plans and task notes in `workflow.json`.
2. `scripts/capture.mjs` captures the Git increment and that evidence into a private packet under `$DATA/apps/pi-prune/reviews/` (default `~/data/apps/pi-prune/reviews/`). It never changes the repository, runs tests or calls a model.
3. A fresh subagent gets `task.txt` and follows the packet's copy of `references/review-contract.md`. It returns a verdict (KEEP, PRUNE, REBUILD CANDIDATE or NEEDS INTENT) with at most five findings, each labeled SAFE SIMPLIFICATION, APPROVAL REQUIRED or INVESTIGATE.
4. The parent checks that nothing changed during the review, relays the findings without adding to them, and waits for your decision.

Packets can contain prompts, code and task context, are private (`0700`/`0600`) and are never deleted automatically. Everything the reviewer reads goes to its model provider.

## Files

- `SKILL.md`: the procedure the parent follows on any host.
- `references/review-contract.md`: the reviewer's complete instructions, copied into every packet as `contract.md`.
- `references/evidence.md`: evidence formats, Git scope, limits, privacy and the `.pi/prune-intent.md` anchor.
- `prompts/prune.md`: the optional pi `/prune` shortcut.
- `scripts/`: dependency-free capture and verification.
- `eval/`: behavioral fixtures with human rubrics and a live runner. `test/`: plumbing tests.

## Development

```sh
npm test
npm run eval:prepare -- --list
npm run eval -- --model PROVIDER/MODEL --thinking high --case 08
```

Tests check capture, packets and verification. They do not prove review judgment. Measure any change to `references/review-contract.md` with the live evaluation; see [eval/README.md](eval/README.md).

## History

Prune began as the pi-prune extension (`$SRC/pi/pi-prune`), which recorded original input through session hooks and registered a dedicated reviewer agent. The skill keeps its rubric, Git capture and fixtures but relies on the parent to supply intent, so compacted or older requests are disclosed as gaps instead of recovered, and it uses the host's ordinary subagents instead of an installed reviewer. The approach borrows from [Exhale](https://github.com/tools4imps/exhale-ruby): contraction after expansion, change-relative review and justified exceptions, without its Ruby analysis, scores or whole-codebase gate.
