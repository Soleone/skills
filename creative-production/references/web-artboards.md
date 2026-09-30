# Web-native artboards

Use SVG or HTML/CSS for precise typography, layout systems, diagrams, banners, social
cards, posters, and reusable responsive variants. Use Canvas for procedural pixels and
WebGL/Three.js only when depth, lighting, or 3D motion earns the added complexity.

## Medium selection

- **SVG:** logos, icons, geometric illustration, diagrams, sharp scalable text/shapes.
- **HTML/CSS:** typography-led layouts, responsive cards, product UI framing, compositing.
- **Canvas:** particles, noise, generative fields, image processing, dense 2D drawing.
- **WebGL/Three.js:** real 3D scenes, shaders, cameras, lighting, spatial product visuals.

Do not use Canvas merely because it is available. DOM/SVG sources are easier to edit,
inspect, localize, and make accessible.

## Artboard contract

Create a deterministic root with explicit dimensions and no network-dependent assets:

```html
<div class="artboard" data-variant="social-square">
  <!-- semantic layers with stable class names -->
</div>
```

```css
.artboard {
  position: relative;
  width: 1080px;
  height: 1080px;
  overflow: hidden;
  isolation: isolate;
}
```

- Bundle or deliberately reference licensed fonts.
- Use CSS custom properties or design tokens for palette, type scale, spacing, radii,
  shadows, safe areas, and motion timing.
- Keep important text as real text until export.
- Separate background imagery, decorative layers, brand marks, product imagery, copy, and
  CTA into named layers.
- Parameterize content and dimensions; do not clone near-identical files for every variant.

## Composition principles

1. Establish a dominant focal point.
2. Make message hierarchy survive thumbnail size.
3. Use alignment and spacing systems rather than arbitrary coordinates.
4. Reserve negative space intentionally.
5. Treat texture and effects as support, never compensation for weak hierarchy.
6. Use the exact approved logo asset with defined clear space.
7. Design crops and safe areas for each channel, not by naive scaling.

## Browser capture

Use the host's browser automation or screenshot capability. When `agent-browser` is
installed, load its current core workflow before use:

```bash
agent-browser skills get core
```

Otherwise use Playwright or another reproducible Chromium capture path already present in
the project. Capture at the exact viewport and device scale required by delivery. Wait
for fonts and images to load; disable unintended transitions; use a stable local URL.

For review, produce either a contact sheet or one preview per variant. Inspect the rendered
pixels, not only DOM source.

## Animation and interactivity

For interactive web delivery, Motion or GSAP can be appropriate for DOM/SVG timing. For
video rendering, prefer frame-driven Remotion animation rather than wall-clock timers or
CSS animations. Interactive production code belongs to the application's implementer; a
creative producer should provide sources, motion intent, assets, and a rendered reference
when they do not own app code.

## Canvas/WebGL safeguards

- Make output deterministic when possible by recording seeds and fixed dimensions.
- Account for device-pixel ratio deliberately.
- Avoid per-frame allocations in animation loops.
- Provide a static fallback or poster frame.
- Test capture/render parity; GPU and font differences can alter output.
- Keep a non-3D fallback when the concept does not depend on spatial interaction.

## Acceptance

Render every required aspect ratio and inspect line breaks, text clipping, image crops,
logo safe area, contrast, and edge artifacts. Test the smallest intended display size.
Record the capture command and viewport in the manifest or source README.
