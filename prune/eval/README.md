# Evaluating review judgment

Behavioral evaluations, not prompt-string tests. Each case in `cases.mjs` builds a small Git repository with before and after source and an explicit request (or deliberately missing intent), captures it with the skill's real capture code, and carries a human grading rubric. Passing `npm test` proves plumbing only.

## Prepare without spending tokens

```sh
node eval/prepare.mjs --list
node eval/prepare.mjs --case 02 --working
```

Writes fixture repositories, packets and `rubric.json` files under `$DATA/apps/pi-prune/evaluations/` (or `--output PATH`). The default scope is the latest commit; `--working` leaves the increment uncommitted. Preparation shows the rubric next to the fixture, so it is for inspection, not a blind run.

## Run a live evaluation

```sh
node eval/run.mjs --model PROVIDER/MODEL --thinking high
node eval/run.mjs --model PROVIDER/MODEL --thinking high --case 08
node eval/run.mjs --host claude --model sonnet --thinking high
node eval/run.mjs --model PROVIDER/MODEL --prompt-file /path/to/baseline-contract.md
```

**This spends provider tokens.** Nothing runs without an explicit `--model`. Each case gets a fresh headless session of the host (`pi` by default, or `claude`) with the contract as its entire system prompt, only read and search tools, and no extensions, skills, MCP servers, context files or saved session. Cases run in order within a bound of three minutes and forty tool calls each; a failure or bound violation stops the run without retrying. The bound limits time and tool use, not dollars, so check pricing before a full suite.

Each case directory receives the fixture `repo/`, the packet with `review.md`, `trace.jsonl` (the host's raw events), `observations.json` (model, duration, cost, tool calls, failure) and `rubric.json`, written only after the review finishes. Rubrics never enter the fixture repository, the packet or the reviewer's task. Use `--bin PATH` when the host binary is not on `PATH`.

The runner exercises the contract under the strictest isolation, with read and search tools only. It does not exercise the host's subagent launch, which in real use may allow more tools, or completion delivery. Each packet's `contract.md` is the contract under test, including a `--prompt-file` baseline.

## Grade

| Case | Should demonstrate |
| --- | --- |
| 01 | KEEP without an improvement backlog for a direct, correct implementation |
| 02 | A demonstrated cleanup defect, with verification tied to that defect |
| 03 | Reusing an existing implementation, with both sites cited |
| 04 | Removing single-purpose abstraction machinery without a grand rewrite |
| 05 | Keeping justified external validation and recognizing meaningful tests |
| 06 | Keeping deliberate duplication when shared code would couple independent policies |
| 07 | Removing redundant control flow even without intent evidence |
| 08 | Proposing removal of an unrequested format as APPROVAL REQUIRED, not an approval question |
| 09 | Keeping the same code when the user did request it (counterexample to 08) |

Read each report beside `rubric.json` and the source. Mark every expected catch **caught**, **missed** or **uncertain**: a keyword is not a catch; it needs the right location, supported reasoning and a concrete smaller shape. Record any avoidance violation as a false positive, and check claims against what the reviewer actually read (see `trace.jsonl`). Unsolicited additions are false positives, not useful catches. Exit status 0 means the runs completed, not that judgment passed.

## Compare contracts and models

Hold the host, model, thinking level, cases and scope fixed, and change one thing. Compare useful catches, false positives, unsupported claims and cost, never finding counts. Output varies between runs, so repeat a questionable result before calling a change an improvement. Running the same suite on a smaller model shows where the contract is too subtle.

The only recorded live run used the earlier "quality and simplification" prompt, which still asked for small improvements. The removal-first contract has not been evaluated live yet. Add new cases from real misses, each paired with a clean counterexample, rather than tuning to these nine.
