# lean

A coding-agent skill for building the simplest thing that does what was asked. Agents tend to only add, and the codebase is the prompt: whatever they leave behind, the next agent imitates. Lean pushes the other way while the code is being written: a removal test for every addition, concrete rules against common LLM failure modes, a short self-review and mechanical recipes. [prune](../prune) is its counterpart for reviewing code after the fact.

Design notes:

- The always-loaded `SKILL.md` is kept short so weaker models can follow it; recipes load on demand.
- Rules are written as triggers plus actions, not abstract principles, so smaller models can execute them.
- Follow the host codebase's conventions, not its excess.

## Install

Symlink or copy this directory into your agent's skills directory, then have your AGENTS.md load it before coding:

```bash
ln -s "$PWD" ~/.pi/agent/skills/lean
ln -s "$PWD" ~/.claude/skills/lean
```

```markdown
Before writing or changing code, load the lean skill.
```

## License

MIT
