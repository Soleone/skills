# Prune evaluations

Development-only fixtures and a CLI runner. Nothing in this directory is needed to use the skill. Requires Node 22+, Git, and an authenticated `claude` or `pi` CLI for model calls.

## Cases and scoring

- 01–07: precision, including required safeguards and deliberate duplication that must stay.
- 08–12: bloat recall, including an unrequested option, a one-implementation interface, a duplicate helper, an impossible fallback, and an implementation-pinning test.
- 13: a larger bookmark CLI increment with eight planted problems. Its before/after source lives in `fixtures/13/`.

Each run creates a fresh Git repository, commits the before and after states, and uses the real capture script to prepare a review packet. Expectations stay in the host, never in the fixture repository or the reviewer's task. Reviewers get the captured contract as their system prompt and only read/search tools.

A separate, tool-free judge gets the user request, diff, rubric, and completed review. Each catch scores 1 (caught), 0.5 (partial), or 0 (missed). False positives are counted separately. Some criteria require KEEP, so “recall” includes correctly retaining justified behavior, not just finding bloat. Three runs per case expose variance; they do not make a small synthetic suite representative of real projects.

See the [2026-10-15 contract comparison](results/2026-10-15.md) for the recovered Luna results and earlier Opus evidence.

## Without model calls

```sh
node eval/run.mjs --list
node eval/run.mjs --prepare --case 08,13
node eval/run.mjs --summary /path/to/run-old /path/to/run-new
node --test eval/run.test.mjs
```

`--prepare` writes fixture repositories and packets but does not run their tests. Fixture tests are intended to pass even with the plants present. The runner tests use local fake CLIs and make no model calls.

## Run a comparison

Both `--backend` and `--grade` make model calls. Reviewer and judge backends are independent; judging defaults to Claude Opus even when the reviewer uses pi.

```sh
# Old versus current contract, three reviews per case.
node eval/run.mjs --backend claude --model opus --effort high --runs 3 --skill-ref 5f18258 --label opus-old
node eval/run.mjs --backend claude --model opus --effort high --runs 3 --label opus-new

# Use a Codex subscription for both review and judging.
node eval/run.mjs --backend pi --model openai-codex/gpt-6-luna:low --runs 3 \
  --judge-backend pi --judge-model openai-codex/gpt-6.1-sol:high --label luna-new
```

- `--case 08,13`: select cases; omit to run all 13.
- `--runs N`: reviews per case, default 3.
- `--skill-ref REV`: capture with that Git revision's skill, otherwise the working tree.
- `--judge-backend claude|pi`: default `claude`. Pi requires an explicit `--judge-model provider/model:thinking`.
- `--concurrency N`: simultaneous jobs, default 4.
- `--output DIR`: storage root, default `$DATA/apps/pi-prune/evaluations` (or `~/data/apps/pi-prune/evaluations`).

Use the same judge and settings on both sides of a comparison. A different judge can interpret the rubric differently, so do not treat its numbers as directly interchangeable with an earlier judge's numbers.

## Recover saved reviews

Review output is saved before judging. If judging fails, there is no need to pay for another review:

```sh
node eval/run.mjs --grade /path/to/run \
  --judge-backend pi --judge-model openai-codex/gpt-6.1-sol:high
```

`--grade` regrades **every saved review**, not only failures, and overwrites each `grade.json` and the run's `summary.md`. Back those files up first when preserving earlier judging. The reviews, fixture repositories, and captured contracts are not rewritten. Each new grade records its judge backend and model; summaries disclose judge identities and graded/expected review counts. Legacy grades fall back to the original run settings for judge identity.

Each run directory contains `settings.json`, `summary.md`, and `case-NN/run-N/` directories with the repository, packet, review, reviewer metadata, grade, and any evaluation error. Pi subscription calls have no dollar-cost metadata; the summary's `$0.00` does not mean the work consumed no usage. Reviewer cost excludes judging.

The pi reviewer and judge close child stdin explicitly: print mode waits for EOF before processing a prompt. Do not remove that close when changing process execution.
