---
name: creative-production
description: "Produce polished marketing visuals and media using the smallest appropriate workflow: generated or edited raster imagery, SVG/HTML/CSS artboards, browser-rendered stills, Canvas/WebGL visuals, Remotion video, and FFmpeg inspection or delivery. Use when the requested deliverable is a campaign image, social asset, launch graphic, product visual, motion graphic, promo video, or reusable creative template—not merely a written design recommendation."
license: MIT
compatibility: Requires only the tools selected for a deliverable; optional capabilities include image generation, a browser renderer, Node.js, Remotion, and FFmpeg.
---

# Creative production

Produce the actual deliverable and editable source, not only art direction or prompts.
Use this skill with any role that owns creative output; it does not change that role's
scope, permissions, approved copy, or product decisions.

## Start with the production brief

Before producing, establish or infer only what materially affects the asset:

- objective and intended audience
- exact approved copy and mandatory elements
- channel, dimensions/aspect ratio, duration, and file constraints
- brand references: palette, typography, logo rules, imagery, motion character
- source materials and rights constraints
- variants/locales and the decision each variant serves

Ask only for blocking information. If no brand system exists, state a compact temporary
direction and keep it internally consistent.

## Choose the smallest credible medium

| Deliverable | Default production path |
|---|---|
| Typography-led graphic, card, banner, poster, diagram | SVG or HTML/CSS artboard → browser capture |
| Logo, icon, simple geometric illustration | Native SVG; do not use raster generation |
| Photo, atmospheric hero, editorial illustration, texture | Image generation/editing → layout/compositing |
| Repeated channel or locale variants | Parameterized HTML/SVG or Remotion template |
| Motion graphic, product promo, kinetic type | Remotion → encoded video |
| Cinematic or organic footage | Generated/stock footage as an insert → deterministic edit |
| Procedural particles or pixel effects | Canvas; use WebGL/Three.js only when 3D materially improves the concept |
| Interactive web creative | Production web implementation; render a static/motion handoff if app changes are outside scope |

Prefer deterministic HTML/CSS/SVG and frame-driven composition for brand text, logos,
layout, timing, and final assembly. Generative tools supply imagery or footage; they do
not own typography, claims, or brand geometry.

## Load only the relevant workflow

- Raster generation or editing: [references/image-production.md](references/image-production.md)
- SVG, HTML/CSS, Canvas, WebGL, and browser capture: [references/web-artboards.md](references/web-artboards.md)
- Motion and video with Remotion: [references/remotion.md](references/remotion.md)
- Export inspection, QA, provenance, and handoff: [references/delivery.md](references/delivery.md)

For mixed-media work, load the production reference first and delivery last. Do not
load every reference preemptively.

## Preflight

Before promising an output:

1. Identify the exact capability needed.
2. Check that its tool, binary, dependency, credentials, and license are available.
3. Confirm the writable source/output directory.
4. Confirm source assets can legally and safely be used.
5. Choose a graceful fallback only if it still satisfies the requested medium.

Use `scripts/preflight.sh` when shell access is available. A missing image generator may
fall back to native SVG for an abstract visual. A requested video must not silently become
a storyboard; report the capability gap.

## Production loop

1. **Direct:** establish one coherent visual idea and why it fits.
2. **Prototype:** make the cheapest artifact that tests composition and hierarchy.
3. **Select:** compare no more than three materially different directions unless asked.
4. **Refine:** make targeted changes; preserve approved invariants.
5. **Adapt:** derive required sizes, durations, locales, or crops from the selected source.
6. **Inspect:** open or render the actual files, not just the source code.
7. **Deliver:** retain editable sources, final exports, previews, and provenance.

Do not call unfinished scaffolding a final asset. Do not generate speculative variants
without a concrete decision or channel need.

## Required quality gate

Check every applicable item:

- message hierarchy is legible at intended display size
- approved copy is verbatim; no invented claims
- typography, spacing, alignment, crops, and safe areas are deliberate
- logos and product UI are not hallucinated or distorted
- contrast, flashing, captions, and audio levels are appropriate
- dimensions, duration, frame rate, codec, color/alpha, and file size meet delivery needs
- variants remain one system rather than unrelated images
- final files exist and were visually inspected
- generated or third-party material has provenance and usage constraints recorded

## Output contract

Deliver, where the caller permits:

```text
<artifact-root>/
  index.md       # manifest and usage notes
  assets/        # final channel-ready exports
  sources/       # editable SVG/HTML/Remotion/Canvas/compositing sources
  previews/      # contact sheets, storyboards, or review renders
```

Each manifest entry records: final path, editable source, purpose/channel, dimensions or
duration, format/codec, variant, generation/edit provenance, and usage constraints.

If permissions restrict source-code writes, keep sources inside the role's artifact
boundary. Never modify application code merely to produce a creative deliverable.
