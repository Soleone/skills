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

## Use

```text
/prune
/prune focus on unnecessary fallbacks
/prune --reference abc123
/prune --reference abc123 challenge surviving fallbacks
```

Implement one increment, run `/prune`, accept the proposals you want, apply and verify, continue. A dirty tree reviews all uncommitted changes; a clean tree reviews the latest commit. For older commits, review one `--reference` at a time, newest first. In pi, the same arguments go after `/skill:prune`.

## Install

Requires Node 22+ and Git. Link this directory into your agent's skills directory:

```sh
ln -s "$SRC/skills/prune" ~/.claude/skills/prune      # Claude Code
ln -s "$SRC/skills/prune" ~/.pi/agent/skills/prune    # pi
```

The review runs in a fresh subagent with your session's model and thinking level: Claude Code's `general-purpose` agent, or pi-subagents' built-in `delegate` (install pi-subagents for independent reviews in pi). Hosts without subagents get a review in the same session, labeled as not independent.

In Claude Code, packets live outside your project, so reading them may ask for permission; allowing `Read(~/data/apps/pi-prune/reviews/**)` in `~/.claude/settings.json` removes the prompts.

## How it works

1. The parent pipes the user's relevant requests, verbatim, into `scripts/capture.mjs`, which captures the Git increment into a private packet under `$DATA/apps/pi-prune/reviews/` (default `~/data/apps/pi-prune/reviews/`). Capture also writes an inventory of what the patch adds (lines by kind, top-level declarations) and, when the repository has knip installed, the unused files and exports in the changed files. It never changes the repository, runs tests or calls a model.
2. A fresh subagent gets the packet's `task.txt` and follows its copy of the review contract. It returns a verdict (KEEP, PRUNE, REBUILD CANDIDATE or NEEDS INTENT) with at most five findings, each labeled SAFE SIMPLIFICATION, APPROVAL REQUIRED or INVESTIGATE.
3. `capture.mjs --verify` proves the repository is unchanged, since a general-purpose subagent could edit files.
4. The parent relays the findings without adding to them and waits for your decision.

Packets contain prompts, code and task context, are private (`0700`/`0600`) and are never deleted automatically. Everything the reviewer reads goes to its model provider.
