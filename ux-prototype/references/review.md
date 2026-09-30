# Prototype review

Read before presenting a prototype as inspected. For a narrow revision, check changed behavior and its immediate dependencies rather than restarting a full design exercise.

## Contract and source checks

- Does every section serve the agreed task? Remove invented features and filler.
- Does the composition match the chosen reference and recorded invariants?
- Is one approved preset/base used consistently?
- Are generated UI files, theme/preset files, and custom CSS unchanged except for approved setup or exceptions?
- Are components using documented composition and variants rather than appearance overrides?
- Are spacing/width choices using the project's recorded conventions?
- Are mock boundaries clear, with no unnecessary production infrastructure?
- Is the revision limited to requested feedback and required fixes?

Inspect the diff and run the repository's available typecheck, tests, lint, build, and whitespace checks. State which ran; do not invent commands or report checks as passed when they were skipped.

## Browser checks

Inspect the actual page, not just generated source or a single screenshot:

- The primary task and action are clear without explanation.
- Realistic content fits; long labels/values and validation text do not clip or obscure actions.
- The relevant desktop and small-screen layouts work without unintended overflow.
- Keyboard order is logical, focus is visible, controls have accessible names, and overlays return focus appropriately.
- Required and optional fields are understandable. Validation identifies the problem and preserves entered values.
- Actions work. Submission feedback and applicable error/empty/loading states can be exercised without an actual backend.
- Disabled/pending behavior prevents unintended duplicate actions when relevant.
- Semantic components and contrast support use, not just a pleasing screenshot. Disclose the limits of any accessibility check.

Do not require every possible state for every component. Select states from the task and brief; avoid artificial delays merely to demonstrate a spinner.

## Bounded correction loop

1. One batched initial inspection across target sizes and relevant states.
2. Fix the concrete findings together.
3. One confirmation pass by default.

If checks still fail, name the remaining failures and the next decision needed. Do not mark the prototype complete or silently expand into endless polish. A later user annotation round is a new targeted revision, not permission to redesign everything.

## Annotation resolution

For each comment: identify the current element, interpret the intent, apply an allowed change, then check the affected behavior. If intent requires breaking an invariant, ask before proceeding. Captured styles are evidence of intent, not source code to paste verbatim.

Report briefly:

- Preview URL and what is functional versus mocked.
- Checks actually run, and unresolved/unverified items.
- Which comments were addressed or need a decision.
- The next review decision. User approval establishes the baseline; silence does not.

## Mechanical guardrails: not implemented yet

Phase 1 uses source/diff review. Do not claim automatic enforcement exists.

Add checks only after the pilot identifies actual regressions. Prefer the project's existing lint/test infrastructure. Candidate checks are generated-UI drift against a known approved baseline, unauthorized theme changes, and appearance overrides. Begin uncertain detection as warnings.

Before making a check blocking, test forbidden edits alongside legitimate responsive layout, accessibility utilities, and approved exceptions. Do not compare against upstream latest as an implicit baseline. A reviewed component upgrade refreshes the baseline explicitly. Static checks do not certify usability or visual quality.
