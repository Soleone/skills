---
name: ux-prototype
description: "Build restrained, design-first shadcn app prototypes and revise them from visual annotations. Use for interactive form, settings, or workspace prototypes, requests for stock shadcn without custom styling, and continued work on a prototype governed by this contract. Owns scope, pattern selection, and approval. Not for marketing sites, media assets, arbitrary frontend bugs, or production backend work."
compatibility: "Initial implementation path requires the shadcn skill and browser inspection tooling. pi-annotate is preferred for visual feedback. Impeccable is optional."
---

# UX prototype

Make the task obvious and the interface familiar. Creativity belongs in simplifying the interaction, not redesigning the button. This skill owns the prototype workflow; it is not a general-purpose visual design director.

## Priority ladder

Apply in order: **Remove → reuse an approved pattern → compose stock components → adjust layout → request an exception.**

## Authority

Within the host's instruction hierarchy, honor: explicit user requirements → approved project decisions and incumbent design → official shadcn APIs/composition → restrained UX heuristics → agent discretion. A specialist suggestion is not approval to change the design.

## Hard rules

1. **Read before designing.** Inspect project instructions, design records, the target, and representative components/theme. Missing DESIGN.md does not make an existing app a blank canvas. Reuse settled requirements before asking.
2. **One task first.** Build the smallest useful flow. No invented dashboard, metrics, helper panels, badges, decorative icons, or filler copy. A container must earn its boundary; do not wrap every section in a Card.
3. **Pin the system.** Preserve the incumbent preset/base. For new projects, propose one documented preset for approval; do not invent tokens. Do not mix primitive bases, fonts, icon libraries, or component styles.
4. **Stock means stock.** Use installed shadcn components and documented variants. No hand edits to generated UI internals, appearance overrides, new custom CSS, or arbitrary visual values without approval. Layout utilities are allowed; use the project's spacing/width conventions. If none exist, propose a compact scale once and record it.
5. **Behavior before decoration.** Use realistic fixtures, semantic labels, clear actions, accessible focus, and the states the task needs. Do not simulate success for an interaction that is not wired, or invent decorative loading delays.
6. **Prototype, not infrastructure.** Local state and mocked I/O are enough. No backend, auth integration, database, speculative service layer, or new production architecture unless separately requested. Preserve the host stack.
7. **Revise narrowly.** Preserve approved hierarchy, copy, theme, behavior, and unrelated areas. An annotation is not an invitation to redesign the page.
8. **Make exceptions explicit.** State the unmet requirement, smallest departure, and affected scope; get approval before departing. Do not ask permission for ordinary choices already allowed by the contract.

## Companions: load by need

- **shadcn:** required before component work. Follow its project inspection and current component-documentation workflow; never guess APIs. If unavailable, finish the brief and report the prerequisite, not improvised components.
- **shadcn-theming:** use for preset setup or theme/style changes. Review worktree state and preserve unrelated changes. A preset update is not a primitive-base migration.
- **clean-code:** use during implementation if available; do not abstract from one example.
- **Browser tooling:** load the applicable browser/platform guidance for inspection, including WSL guidance in WSL. If inspection is unavailable, report an unverified preview, not a completed visual check.
- **pi-annotate:** preferred feedback path; use on the user's annotation request. Verify connectivity before promising it works. If unavailable, accept screenshot/text feedback and disclose the limitation; do not install a replacement automatically.
- **Impeccable:** optional critique/audit specialist, not a prerequisite. Do not load by default solely for this workflow. If the host requires it or the user requests it, follow its setup, choose task-oriented Operate guidance, and supply the approved constraints. Do not fork it or bypass its documented setup via direct playbook shortcuts.
- **creative-production:** only when a real media deliverable is requested. Do not introduce imagery to make a form look designed.

## Workflow

### 1. Brief

Capture the task, audience/context, primary action, realistic content, essential states, target device, and exclusions in a few bullets. Ask only for blocking decisions. A complete request can proceed on a stated interpretation; material ambiguity needs confirmation. A planning-only request ends at the brief.

### 2. Anchor

Read [references/patterns.md](references/patterns.md). Pick one incumbent or approved composition; name its source and what changes. If none is approved, label the first composition provisional and seek visual approval before treating it as reusable truth.

For a new project, confirm the preset/base before setup. Offer at most two structural alternatives only when a real interaction trade-off needs a decision. Keep the same visual system across alternatives. Do not generate cosmetic variants by default.

### 3. Prototype

Implement the agreed flow with realistic local fixtures and the meaningful validation/error/success states. Keep changes in the host's normal structure, or a clearly named prototype area when appropriate. Make reviewed UI reusable for the actual app without inventing future infrastructure.

### 4. Inspect

Load [references/review.md](references/review.md). Run available project checks and inspect actual desktop/small-screen behavior. Batch findings, fix them together, and confirm once by default. If failures remain, report them and stop expanding scope; do not declare a pass or keep polishing indefinitely.

### 5. Annotate and revise

Present the preview URL, what works, and any mocked/unverified boundaries. Invite `/annotate`; do not open annotation mode without the user's request. No additional annotation library is needed.

For feedback, inspect the current DOM/source because selectors can become stale. Map each comment to the smallest change. Translate pi-annotate Etch edits into approved variants/tokens/layout rather than pasting captured CSS. If feedback conflicts with an invariant, ask one focused question. Recheck affected behavior and report addressed/unresolved items.

### 6. Approve and preserve

Only the user can approve the visual baseline. Update the existing design source of truth, not a competing record. Preserve its schema and unrelated content. If none exists, use a concise DESIGN.md: task, preset/base, pattern source/status, layout conventions, invariants, exceptions, and relevant states. Do not invent specialist metadata.

At production handoff, retain the approved UI, identify mock boundaries and prototype-only controls, and agree a separate integration scope. Visual approval does not establish production readiness.

## Entry routing

- **New prototype:** brief → anchor → prototype → inspect → user review.
- **Annotation revision:** read the existing decisions → targeted change → affected checks; do not restart discovery.
- **Theme change:** use shadcn-theming; preserve interaction and scope, then update approved decisions.
- **Critique only:** report findings against this contract without editing; use an optional specialist only as needed/requested.
- **Marketing, media, or backend:** outside this workflow. Route to the appropriate capability without imposing this app policy.
