# Recipes

Mechanical moves. Each recipe has a trigger and steps. If a recipe conflicts with an established repo convention, the convention wins.

## Where does new code go

Trigger: creating code that does not obviously belong in an existing module.

1. Grep for the concept name and its synonyms. If an existing file already owns the concept, add to it, even if the file grows a little.
2. Otherwise create a new file named after what the code does: `parse_invoice.py`, `retry.ts`. Never `invoice_utils.py`, `misc.ts`.
3. Never create `utils`, `helpers`, or `common` files. "Misc" is not an identity.

## Extract a function

Trigger: a function needs "and" to describe it, or a block inside a function deserves a name.

1. Name the block first. Prefer a specific verb plus object: `validate_license`, `load_cached_profile`. Avoid bare generic verbs such as `process`, `handle`, `do`, or `manage`.
2. Extract the whole block. Treat 4 or more parameters as a warning that the boundary may be wrong; move the extraction up or down if that gives the data a natural home. Do not create an options bag merely to meet a number.
3. Do not extract one-liners used once. Named clarity, not indirection, is the goal.

## Duplicate code

Trigger: about to write a block that resembles an existing block.

- First copy: write it.
- Second copy: write it again. Note the similarity, do not abstract yet.
- Third copy: extract from the three real call sites. Parameterize only what actually varies; keep the shared core intact.

Premature extraction from two examples encodes a wrong guess about what varies. Three examples show the real axis of variation.

## Split a growing file

Trigger: a file serves two concepts, or it no longer fits in your head.

1. Name the two halves first. If you cannot name both, do not split yet; the structure is not understood.
2. Move code by concept: whole functions, with their tests. Never split by line count.
3. Check imports after splitting. If the two halves mostly import each other, the split was wrong; merge back.

## Flatten nesting

Trigger: nesting deeper than two levels obscures the main path.

```ts
// before: real work buried 3 levels deep
function settle(order) {
  if (order) {
    if (order.isPaid) {
      if (order.items.length) {
        // ...
      }
    }
  }
}

// after: guard clauses, main path at depth 1
function settle(order) {
  if (!order) return
  if (!order.isPaid) return
  if (!order.items.length) return
  // ...
}
```

Use guard clauses when they make the main path clearer. If two branches share a long tail, extract the tail first.

## Switch on type in 3+ places

Trigger: `switch (kind)` or `if type ==` chains over the same discriminator in three or more places.

This earns a shared dispatch mechanism only when the branches represent the same behavior owned by one domain. Keep separate exhaustive switches when each call site owns different behavior.

1. Collect only the shared behavior into one table, or one interface with small implementations. Preserve exhaustive handling of the discriminator.
2. Replace only duplicate dispatch with a lookup.
3. Leave one or two switches alone; at that scale the scattered switch is clearer than the machinery.

```ts
// before: this switch exists in 3 files
if (shape.kind === "circle") { /* ... */ } else if (shape.kind === "rect") { /* ... */ }

// after: one table, lookup everywhere
const areaOf = {
  circle: (s) => Math.PI * s.r ** 2,
  rect: (s) => s.w * s.h,
}
const area = areaOf[shape.kind](shape)
```

## Too many parameters

Trigger: a function takes 4 or more independent parameters. This is a review signal, not a fixed limit.

1. Try splitting the function first; often the parameters belong to two different jobs.
2. Bundle parameters only when they truly form one piece of data (a parsed record, a configuration). Prefer a name after the data, such as `invoice`, over a generic `options` or `params`.
3. Never use an options bag to hide required data. `send(user, subject, body)` beats `send({ user, subject, body })` when all three are mandatory.

## Rename before refactor

Trigger: a misleading name stands in the way of a restructure.

1. Rename first, as a separate logical change. Commit it separately only when the project workflow calls for commits.
2. Run the checks. Then restructure in the next logical change.
3. If they must be combined, state why in the change description.

## Delete dead code

Trigger: unreferenced exports, commented-out blocks, paths disabled "temporarily", in code your change touches or when asked.

1. Grep for references, including strings and config files.
2. Delete. Do not comment out. Git remembers.
3. Run the tests. If deletion breaks something, the code was not dead; restore and investigate.

## Error handling stance

Trigger: adding or cleaning up error handling.

1. Read how the repo already handles errors: exceptions, Result types, error codes. Follow it.
2. If no convention exists: leaf functions throw or return errors without catching; exactly one boundary (request handler, CLI main, event loop) catches and decides what to log, retry, or report.
3. Every `catch` must point at a specific failure it handles. Validation at an untrusted input boundary is specific; scattered defensive code is not. If you cannot name the failure, delete the catch.
