# Prune

An intent-aware, removal-first review skill. It challenges both whether behavior is needed and how it is implemented. Independent read-only proposals, not automatic fixes or a general enhancement backlog.

## Layout and progressive disclosure

- `SKILL.md`: principle, required reading, invocation, complete workflow and output essentials.
- `references/review-contract.md`: the original review prompt, preserved verbatim.
- `references/evidence.md`: authority/provenance, task/plan collection, Git scope, privacy and limitations.
- `agents/prune-reviewer.md`: the same full rubric in a standard fresh read-only pi-subagents agent definition. No pi-prune extension or runtime registration.
- `scripts/`: dependency-free Node/Git capture and packet writing, migrated from pi-prune.
- `prompts/prune.md`: optional `/prune` shortcut.
- `eval/`: all seven original behavioral fixtures, human rubrics and no-token preparation.
- `test/`: migrated Git regressions plus skill/packet/fixture tests.

The references are **required**, not optional reading. Progressive disclosure keeps the entry point navigable without compressing away the review contract.

## Install

Requires Node 22+, Git and pi-subagents for independent review. The simplest distributable install loads the skill, prompt and agent without any prune extension:

```sh
pi install npm:pi-subagents
pi install "$SRC/skills/prune"
```

Alternatively symlink the resources into the existing Pi directories:

```sh
agent_dir="${PI_CODING_AGENT_DIR:-${PI:-$HOME/.pi/agent}}"
mkdir -p "$agent_dir/skills" "$agent_dir/agents" "$agent_dir/prompts"
ln -s "$SRC/skills/prune" "$agent_dir/skills/prune"
ln -s "$SRC/skills/prune/agents/prune-reviewer.md" "$agent_dir/agents/pi-prune-reviewer.md"
ln -s "$SRC/skills/prune/prompts/prune.md" "$agent_dir/prompts/prune.md"
```

Do not overwrite existing paths blindly. Disable/remove the old pi-prune extension discovery link or package before `/reload`: its extension command otherwise wins over the `/prune` prompt, and its runtime agent may collide with the file-defined reviewer. Keep its source/archive if desired. A skill-only installation works for explicitly requested direct review, but does not install the independent reviewer or slash shortcut.

Run `/reload` after changing resources. Then:

```text
/prune
/prune focus on unnecessary fallbacks
/prune challenge the export abstraction
/prune --reference abc123
/prune --reference abc123 challenge surviving fallbacks
```

`/skill:prune` accepts the same arguments. Run after each coherent increment: implement, review, inspect proposals, apply accepted changes, verify, continue. A clean tree reviews only the latest commit; a dirty tree includes all working changes. Focus does not narrow Git scope or grant edit permission.

## What changed from the extension

The pruning rubric, three passes, verdicts, finding classifications, safeguards, rebuild criteria, reference-commit semantics, Git capture and evaluation fixtures remain. Capture scripts never launch models, run tests, update tasks or change the Git index/checkout.

**Intent collection is now best-effort by the parent.** There are no input/session hooks, pre-expansion original recording, automatic active-branch traversal across compaction, exact queued-input provenance matching, automatic task/plan discovery, runtime agent registration or live thinking-level inheritance. Missing originals and uncertain approval must be disclosed, not reconstructed. The skill asks for relevant evidence explicitly; it does not dump parent reasoning into the fresh reviewer.

The optional `.pi/prune-intent.md` continuity anchor remains supported. Reports and packets stay under `$DATA/apps/pi-prune/reviews/` (fallback `~/data/apps/pi-prune/reviews/`), with private permissions and no automatic deletion. Capture limits and live-file caveats are detailed in `references/evidence.md`.

The bundled reviewer uses only `read,grep,find,ls`, no ambient extensions/skills/global context and no nested delegation. This is a tool ceiling, not an OS sandbox. Direct review is explicitly labeled non-independent and instruction-level read-only. A child infrastructure failure never silently becomes a direct/CLI review.

The parent passes the current session's exact model and live thinking level together as `model:"provider/model:level"`, unless the operator explicitly requests a reviewer override. The reviewer definition pins neither model nor thinking. The explicit per-run pair takes precedence over subagent defaults and configured reviewer model/thinking values; request a reviewer-specific override explicitly if you want to use it. Startup settings are not proof of the current thinking level. If the pair is unavailable, the parent asks rather than guessing; unsupported or policy-blocked pairs stop the launch rather than silently downgrading. Supported Pi thinking levels are `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. There is no universal `high` or `max` default and no extension hook automatically propagating the live level.

## Development

```sh
npm test
npm run eval:prepare -- --list
npm run eval:prepare -- --case 02 --working
```

No dependencies or install step are required for capture, tests or fixture preparation. Tests do not prove useful model judgment or a successful paid child launch. See `eval/README.md` for human grading and live-evaluation boundaries.

The approach borrows from [Exhale](https://github.com/tools4imps/exhale-ruby): contraction after expansion, change-relative complexity review, justified exceptions and executable evidence. It does not port Ruby analysis, deterministic scores, whole-codebase gating or Contract configuration.
