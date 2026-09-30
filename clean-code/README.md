# clean-code

A coding-agent skill for simplicity-first code organization: a priority ladder, hard rules against common LLM failure modes, mechanical recipes, and a binary review checklist.

Design notes:

- The always-loaded `SKILL.md` is kept short so weaker models can follow it; recipes and the review checklist load on demand.
- Rules are written as triggers plus actions, not abstract principles, so smaller models can execute them.
- Consistency with the host codebase always beats the skill's own rules.

## Install

Symlink or copy this directory into your agent's skills directory, for example:

```bash
ln -s "$PWD" ~/.pi/agent/skills/clean-code
```

## License

MIT
