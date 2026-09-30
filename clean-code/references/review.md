# Review checklist

Run before declaring the work done. Every item is yes/no. A yes means fix it or state the deliberate exception.

1. Any commented-out code left? Delete it.
2. Any comment that merely narrates what the code does? Rename the code until the comment is redundant, then delete it.
3. Any function that needs "and" to describe? Split it.
4. Any unqualified catch-all name (`utils`, `helpers`, `common`, `misc`, or bare `manager`, `handler`, `data`, `info`)? Give it a domain and responsibility.
5. Any interface, abstract class, or factory with exactly one implementation? Inline it.
6. Any parameter, flag, or hook added "for the future"? Delete it.
7. Any block duplicated 3 or more times? Extract it per recipes.md.
8. Any internal try/catch or null check that cannot point at a specific failure? Delete it; keep validation at untrusted boundaries.
9. Any nesting deeper than 2 that hides the main path? Flatten where guard clauses make it clearer.
10. Any new dependency whose non-security, non-protocol equivalent is ~20 lines? Write the lines.
11. Does the diff touch files the task did not require? Revert the drive-by changes.

Then run the repository's tests and linters. If they fail, the work is not done.
