# Prune

A removal-first, intent-aware review for coding agents. After each increment it asks of every new part: does this earn its place, and what breaks if it goes? It proposes what to delete, narrow or simplify, and leaves every decision to you. It never edits.

## Why

Agents add working software faster than anyone can shape it. Each increment brings something that looks reasonable on its own: an option nobody asked for, a fallback for a case that cannot happen, an interface with one implementation, a copy of an existing helper, a test that pins the implementation. The next agent copies what it finds, so the accumulation compounds. Ordinary reviews make it worse, because reviewers suggest additions.

Prune is the counterweight, run while each increment is still small:

- **The burden of proof is on additions.** Existing code and tests do not prove they are needed.
- **Intent decides necessity.** The user's own words define the goal. Agent-written plans drift, so they explain the step but cannot turn an assumption into a requirement.
- **Independent.** A fresh read-only reviewer sees the evidence and the code, never the implementer's reasoning.
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

Requires Node 22+ and Git. Don't overwrite existing paths.

**pi.** Installs the skill, the `/prune` prompt and the read-only `pi-prune-reviewer` agent:

```sh
pi install npm:pi-subagents
pi install "$SRC/skills/prune"
```

Or link the pieces yourself:

```sh
agent_dir="${PI_CODING_AGENT_DIR:-${PI:-$HOME/.pi/agent}}"
mkdir -p "$agent_dir/skills" "$agent_dir/agents" "$agent_dir/prompts"
ln -s "$SRC/skills/prune" "$agent_dir/skills/prune"
ln -s "$SRC/skills/prune/agents/prune-reviewer.md" "$agent_dir/agents/pi-prune-reviewer.md"
ln -s "$SRC/skills/prune/prompts/prune.md" "$agent_dir/prompts/prune.md"
```

Run `/reload` afterwards. Remove the old pi-prune extension first if it is installed: its `/prune` command wins over the prompt. The reviewer runs on your session's current model and thinking level. Pi does not expose the thinking level to the model, so the parent asks for it once per session unless you have already said it.

**Claude Code.** The skill is the `/prune` command; the agent is the independent reviewer:

```sh
mkdir -p ~/.claude/skills ~/.claude/agents
ln -s "$SRC/skills/prune" ~/.claude/skills/prune
ln -s "$SRC/skills/prune/claude/prune-reviewer.md" ~/.claude/agents/prune-reviewer.md
```

The reviewer has only `Read`, `Grep` and `Glob`, and inherits the session's model and effort.

**Other hosts.** Any agent that loads Agent Skills can run prune. Without a read-only reviewer agent it reviews directly in the same session and says so at the top of the report; that review is neither independent nor tool-enforced read-only.

## How it works

1. The parent writes the user's relevant requests, verbatim, to `intent.json`, plus optional plans and task notes in `workflow.json`.
2. `scripts/capture.mjs` captures the Git increment and that evidence into a private packet under `$DATA/apps/pi-prune/reviews/` (default `~/data/apps/pi-prune/reviews/`). It never changes the repository, runs tests or calls a model.
3. A fresh reviewer follows `references/review-contract.md` and returns a verdict (KEEP, PRUNE, REBUILD CANDIDATE or NEEDS INTENT) with at most five findings, each labeled SAFE SIMPLIFICATION, APPROVAL REQUIRED or INVESTIGATE.
4. The parent relays the findings without adding to them and waits for your decision.

Packets can contain prompts, code and task context, are private (`0700`/`0600`) and are never deleted automatically. Everything the reviewer reads goes to its model provider.

## Files

- `SKILL.md`: the procedure the parent follows on any host.
- `references/review-contract.md`: the reviewer's complete instructions, the single source for both agent files.
- `references/evidence.md`: evidence formats, Git scope, limits, privacy and the `.pi/prune-intent.md` anchor.
- `agents/prune-reviewer.md`: the pi-subagents reviewer. `claude/prune-reviewer.md`: the Claude Code reviewer. Both embed the contract verbatim.
- `prompts/prune.md`: the pi `/prune` shortcut.
- `scripts/`: dependency-free capture.
- `eval/`: behavioral fixtures with human rubrics and a live runner. `test/`: plumbing tests.

## Development

```sh
npm test
npm run sync-agents
npm run eval:prepare -- --list
npm run eval -- --model PROVIDER/MODEL --thinking high --case 08
```

Tests check capture, packets and that both agents carry the exact contract. They do not prove review judgment. Change the contract only in `references/review-contract.md`, run `npm run sync-agents` to copy it into both agents, and measure the change with the live evaluation; see [eval/README.md](eval/README.md).

## History

Prune began as the pi-prune extension (`$SRC/pi/pi-prune`), which recorded original input through session hooks and registered its reviewer at runtime. The skill keeps its rubric, Git capture and fixtures but relies on the parent to supply intent, so compacted or older requests are disclosed as gaps instead of recovered. The approach borrows from [Exhale](https://github.com/tools4imps/exhale-ruby): contraction after expansion, change-relative review and justified exceptions, without its Ruby analysis, scores or whole-codebase gate.
