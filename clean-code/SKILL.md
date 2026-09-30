---
name: clean-code
description: Organize and clean up code. Naming, module boundaries, when to extract, pattern selection, removing slop. Use when writing new code, refactoring, reviewing code organization, or when asked to simplify, clean up, or declutter a codebase. Not for pure algorithm problems or product design.
license: MIT
---

# Clean code

Code is a liability. Every line must be read, tested, and maintained. The best change is often a net-negative one.

## Priority ladder

When in doubt, apply in order, top to bottom:

1. **Delete.** Remove code that is not required.
2. **Simplify.** Inline, merge, remove branches.
3. **Rename.** Rename until the code explains itself.
4. **Extract.** Move a named block into its own function or file.
5. **Pattern.** Last resort, only when real use cases force it.

## Hard rules

1. **Read the neighborhood first.** Before writing, scan two or three neighboring files. Match existing style, naming, error handling, and file layout. Consistency with the host codebase beats every rule in this skill.
2. **Boy Scout scope.** Clean only what the current task touches. No speculative repo-wide refactors, no drive-by edits.
3. **Rule of three.** Tolerate duplication twice. Extract a reusable abstraction on the third occurrence, from the three real call sites. Never abstract from one example.
4. **No future-proofing.** No parameter, option, hook, or abstraction for a need that does not exist yet. Delete "just in case" code. Git remembers.
5. **One identity per name.** Do not create generic dumping grounds such as `utils`, `helpers`, `common`, or `misc`. Generic role words such as `handler` or `manager` need a domain and responsibility.
6. **Comments explain non-obvious why, never obvious what.** Keep constraints, decisions, links, public contracts, or algorithmic context a name cannot carry. If a comment merely narrates behavior, rename the code until it is redundant, then delete it.
7. **Errors travel to the boundary.** Leaf code throws or returns errors. One boundary layer (request handler, CLI entry, event loop) catches and decides. Validate untrusted input at its boundary, not with scattered speculative try/catch or null checks.
8. **Patterns on demand only.** Use an interface or factory only when two concrete implementations need the same seam. That does not justify extracting duplicated code before its third real call site.
9. **Copy before dependency.** Add a library only for real complexity (parsing, cryptography, scheduling). For trivial glue, write the 20 lines.
10. **Override with a stated reason.** Any rule here may be broken when the code or the change description says why.

## Procedure

Before writing or changing code:

1. Read the files adjacent to the change.
2. Name the concept in one sentence. If the sentence needs "and", split the work.
3. Pick the smallest move from the ladder.

## References

- Read `references/recipes.md` before extracting, splitting, flattening, or moving code.
- Run `references/review.md` before declaring the work done.

If the repository has anti-slop lint rules (Oxlint `anti-slop` plugin), run them as part of the review.
