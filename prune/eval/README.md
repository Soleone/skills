# Evaluating chiseling judgment

These are behavioral evaluations, not prompt-string tests. All seven original pi-prune cases and their human grading rubrics are preserved in `cases.mjs`. Each creates a small Git repository with before/after source and an explicit request (or deliberately missing intent), then uses the skill's actual capture/packet code. Preparation performs no model calls and does not launch subagents.

## Prepare without spending tokens

From this skill directory:

```sh
node eval/prepare.mjs --list
node eval/prepare.mjs
node eval/prepare.mjs --case 02 --working
```

Preparation writes fixture repositories, private evidence packets, `task.txt` and a human `rubric.json` outside the reviewer repository and packet. The default scope is the latest commit; `--working` leaves the increment uncommitted. Output defaults to `$DATA/apps/pi-prune/evaluations/` (fallback `~/data/apps/pi-prune/evaluations/`); `--output PATH` chooses another parent directory. Fresh subdirectories preserve earlier results.

**Do not supply the rubric or `cases.mjs` to a reviewer.** Preparation exposes expectations for human inspection, so it is not a blind reviewer run by itself. A live evaluation should expose only the prepared repository and evidence paths, with gold rubrics withheld until review finishes. Read-only tools are not an OS sandbox.

## Live evaluation

Explicitly authorize model/provider cost and use the installed fresh read-only `pi-prune-reviewer` with the prepared `task.txt` and fixture cwd, just as the skill does. Pin the same exact registered model, thinking level and scope across comparisons. No model is selected or called by the preparation script. Synthetic fixture evidence should be sent, not this skill's source, real project code or session history.

The old extension's paid SDK runner remains in the historical pi-prune repository; it is not a dependency of this skill and does not validate the skill workflow. This migration does not claim a paid run or a successful real child/provider launch.

When running a live evaluation, bound each case as in the original suite: three minutes and forty tool calls, sequential cases, stopping on provider/setup failure or bound violation without automatic retries. This bounds time/tool use, not dollars; inspect pricing before a full suite. Preserve reports, the exact reviewer prompt, human rubrics, tool traces, effective model/thinking and token/cost statistics privately. Never treat launch completion as semantic success.

## Cases and grading

| Case | What it should demonstrate |
| --- | --- |
| 01 | KEEP without an improvement backlog for a direct, correct implementation |
| 02 | A demonstrated cleanup defect and verification tied to that defect |
| 03 | Finding and reusing an existing implementation, with both sites cited |
| 04 | Removing single-purpose abstraction machinery without a grand rewrite |
| 05 | Keeping justified external validation and recognizing meaningful tests |
| 06 | Keeping deliberate duplication when shared code would couple independent policy |
| 07 | Removing redundant control flow even without product-intent evidence |

Read each report beside `rubric.json` and the source. For every expected catch, mark **caught**, **missed** or **uncertain**. A keyword mention is not a catch: the finding needs the right location, supported reasoning and a concrete better shape. For each avoidance criterion, record any violation as a false positive. Check findings against inspected code (consult tool traces), the captured increment and required behavior.

Unsolicited incremental additions are false positives, not useful catches. Concise KEEP reports need no assessment or improvement sections. New behavior requires an exceptional breakthrough and explicit approval.

There is no automatic semantic grader. Exit 0 means preparation or a model run completed, not that judgment passed. `node --test test/*.test.mjs` proves capture/packet behavior and instruction consistency without model calls, not review judgment or child runtime isolation.

## Comparing prompts

Keep model, thinking level, cases and scope identical. Compare the exact baseline rubric against `references/review-contract.md`; keep gold rubrics out of both prompts. Compare useful catches, false positives, unsupported claims and review cost, not finding counts. Model output varies; repeat questionable results before treating a change as an improvement. Add cases from real misses paired with clean counterexamples, rather than tuning only to these seven fixtures.
