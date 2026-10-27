---
name: lean
description: Build the simplest thing that does what was asked, organized so the next reader understands it fast. Load before writing or changing code. Covers what earns its place, scope, where errors are handled, when to extract or abstract, naming, comments and a check before finishing. For reviewing existing code, use prune.
license: MIT
---

# Lean

Agents tend to only add; good engineers also decline, merge and delete. The codebase is the prompt: every line you leave is read and imitated by the next agent, so unneeded code doesn't sit still, it spreads. Code is a liability, and the burden of proof is on additions.

## The test

For every addition, ask: what breaks if it's gone? If nothing the user needs, cut it. Usual suspects:

- unrequested options, flags, parameters and config
- fallbacks for cases that can't happen
- checks on data your own code already checked
- helpers, layers, interfaces or files with one use
- tests that pin implementation instead of behavior

Simple means less to understand, not fewer lines.

## Rules

1. **Scope.** Do what was asked. If the request is ambiguous, take the simplest reasonable reading and go; ask only when a wrong guess would be expensive to undo. Don't clean up existing code unless asked. If it's in the way, say so in one line.
2. **Read the neighborhood first.** Scan two or three nearby files. Follow their conventions (naming, error style, layout), not their excess: existing code is not proof the same thing is needed again.
3. **Errors and validation.** Check data once, where it enters the program: user input, files, network, env. Code that gets it from your own code doesn't check it again. Leaf code throws or returns errors; one boundary (request handler, CLI entry, event loop) catches and decides. Only catch a failure you can name and handle; otherwise let it surface.
4. **Duplication.** Reuse an existing helper before writing a second one. For new code, tolerate two copies and extract on the third, from the real call sites. Duplication is cheaper than the wrong abstraction.
5. **Patterns on demand.** An interface, factory or plugin point needs two real implementations today.
6. **Names.** One identity per name. No `utils`, `helpers`, `common` or `misc`; `handler` and `manager` need a domain.
7. **Comments** explain a non-obvious why, never the what. If a comment narrates, rename the code instead.
8. **Dependencies.** Add a library for real complexity (parsing, cryptography, protocols). For trivial glue, write the 20 lines.
9. **Override with a reason.** Any rule here can be broken when you can say why in one sentence.

When in doubt, prefer the earliest move: delete, simplify, rename, extract, and only then introduce a pattern.

## Before you finish

Reread your own diff once as an editor. Apply the test and the rules above to every addition, split any function that needs "and" to describe, flatten nesting that hides the main path, and revert files the task didn't require or temporary files left behind. Then run the repository's tests and linters.

In the final summary, add one line for assumptions made or things left out on purpose, only if there are any.

## References

- `references/recipes.md`: mechanical moves for placing, extracting, splitting, flattening or deleting code. Read before doing one of them.
