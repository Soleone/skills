# ux-prototype

A small coding-agent skill for restrained, design-first shadcn app prototypes. Own the workflow, reuse stock components, and revise precisely through pi-annotate.

## Status

Phase 1: workflow contract and focused references. No bundled starter, approved visual reference, or automated CSS guardrails yet. The next milestone is one representative form reviewed by the user, not a large template library.

## Install in Pi

From this directory:

```bash
ln -s "$PWD" ~/.pi/agent/skills/ux-prototype
```

Do not overwrite an existing skill at that path. Start a fresh Pi session to discover the skill, then invoke:

```text
/skill:ux-prototype Build a small form prototype for [task]. Use stock shadcn, realistic mock data, and no backend.
```

The skill owns policy. There is no separate prompt alias to keep synchronized.

## Dependencies

- Required for component implementation: the official `shadcn` skill and browser inspection capability.
- Conditional: `shadcn-theming` for preset/theme changes; `clean-code` for implementation discipline when available.
- Preferred feedback: `pi-annotate`. Missing browser integration is reported; screenshot/text feedback remains usable.
- Optional: Impeccable for requested specialist critique/audit. It is not required and its guidance does not authorize changing the approved design.
- Creative-production is only for requested media assets.

Upstream skills remain untouched. Host instructions can independently require another skill; this contract explicitly constrains the product surface so those capabilities can coexist.

## Files

- `SKILL.md`: workflow, constraints, and routing.
- `references/patterns.md`: how to select and approve a reference; honestly empty of vetted templates until the pilot.
- `references/review.md`: bounded quality checks and feedback resolution.
- `tests/routing.md`: manual acceptance scenarios for maintainers, not runtime context.

## Validation boundary

Skill-loader validation checks discovery/frontmatter, not model compliance. Manual routing scenarios check that the policy has an explicit answer, not that an agent has demonstrated that behavior. The actual browser/annotation pilot remains necessary before claiming the workflow is proven.
