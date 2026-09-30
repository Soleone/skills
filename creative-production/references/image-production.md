# Raster image production

Use this workflow for photographs, editorial illustrations, textures, atmospheric
backgrounds, concept art, and edits to existing raster images. Do not use it for logos,
icons, diagrams, or simple UI graphics that should remain SVG/HTML/CSS.

## Decide: generation, edit, or composition

- **Generate:** create a new bitmap from a brief and optional references.
- **Edit:** modify an existing image while preserving explicitly named invariants.
- **Compose:** generate or edit imagery, then place exact text/logos with deterministic
  SVG or HTML/CSS. This is the default for marketing graphics containing important text.

A model-generated poster is not a reliable final layout. Treat generated typography and
logos as suspect until checked character by character.

## Provider/tool behavior

Use the host's available image-generation capability. Do not assume a provider or model
name. Before calling it, determine whether it supports:

- image-to-image references
- masks/inpainting
- multiple reference images
- dimensions/aspect ratios
- quality or seed controls
- commercial use and data handling required by the project

When a host exposes a dedicated image-generation skill, load and follow it rather than
duplicating provider-specific parameters here.

## Prompt contract

Structure prompts in this order:

```text
Use case: <photo, editorial illustration, texture, product visual>
Purpose/channel: <where it will appear>
Primary request: <single main ask>
Input images: <Image 1 role; Image 2 role>
Scene/backdrop: <environment>
Subject: <main subject>
Style/medium: <specific visual treatment>
Composition: <framing, crop, subject placement, negative space>
Lighting/mood: <light and emotional register>
Palette: <brand-aligned colors>
Text (verbatim): "<only if generation must attempt text>"
Keep unchanged: <edit invariants>
Avoid: <specific failure modes>
```

Label each input by role: edit target, subject reference, style reference, composition
reference, or mask. For edits, repeat invariants on every iteration.

## Iteration

1. Create a low-cost composition draft.
2. Inspect subject integrity, anatomy/geometry, brand fit, crop, and negative space.
3. Select one direction.
4. Make one targeted change per iteration.
5. Move exact copy, logos, and layout into SVG/HTML composition.
6. Export required crops from the composed source, not independent generations.

Use multiple outputs only for variants of one concept. Distinct campaign assets need
distinct prompts and their own manifests.

## Brand and rights safeguards

- Never fabricate a customer's logo, product screenshot, testimonial, certification, or
  packaging detail.
- Do not use a person's likeness or cloned identity without authorization.
- Preserve prompt, provider/model when known, source/reference hashes or paths, generation
  date, edits, and human approval state.
- Record uncertainty about stock, font, model-output, or reference-image rights before
  publication.

## Acceptance

The final bitmap must be visually inspected at full size and intended crop. Check edges,
hands/faces where present, repeated structures, reflections, embedded text, product
geometry, and compression artifacts. If any exact branded element matters, composite the
approved source rather than relying on generation.
