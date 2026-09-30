# Remotion motion and video

Use Remotion for deterministic motion graphics, product promos, animated explainers,
kinetic typography, social-video variants, and final assembly of generated or recorded
media. Do not use a generative-video model as the final layout or typography engine.

## Use current Remotion guidance

Remotion maintains official Agent Skills. Prefer those instructions over stale copied API
details:

```bash
npx skills add remotion-dev/skills
```

Relevant official skills include `remotion-best-practices`, `remotion-create`,
`remotion-markup`, `remotion-render`, `remotion-captions`, and `remotion-multimedia`.
If installed, make the smallest relevant skill available to the working agent.

Official documentation:

- https://www.remotion.dev/docs/ai/skills
- https://www.remotion.dev/docs/renderer
- https://www.remotion.dev/docs/player
- https://www.remotion.dev/pricing

Check licensing before commercial use.

## Composition contract

A reusable composition accepts a serializable creative specification rather than hidden
constants. Typical fields:

```ts
type CreativeSpec = {
  campaign: string;
  aspect: "1:1" | "4:5" | "9:16" | "16:9";
  locale: string;
  headline: string;
  body?: string;
  cta?: string;
  durationInFrames: number;
  theme: string;
  logo: string;
  media: Array<{src: string; kind: "image" | "video" | "audio"}>;
};
```

Use approved strings and asset paths. Validate inputs before render. Keep provider-specific
generation syntax out of compositions.

## Timeline design

1. Write a beat sheet before implementation.
2. Assign each beat an intent, duration, visual transition, and audio event.
3. Establish hierarchy in still frames before adding movement.
4. Drive animation from frame/time values supplied by Remotion.
5. Use easing and spring behavior consistently; avoid motion on every element.
6. Leave enough dwell time for copy to be read at actual delivery size.
7. Design sound, captions, and silence as part of the timeline.

Generated video, screen recordings, and stock clips are inserts. Normalize and compose
them under the deterministic timeline.

## Variant strategy

Build one source composition with explicit schemas for aspect, locale, copy length, theme,
and media. Do not rely on scaling a landscape composition into portrait. Define per-aspect
layout rules and safe areas while preserving the same creative system.

Render low-resolution or short-range previews first. After approval, render final variants
and verify each file independently.

## Product demonstrations

- Prefer approved captures or deterministic UI recreations over hallucinated product UI.
- Highlight the user outcome, not cursor choreography.
- Avoid unreadably fast interface sequences.
- Mask private data and unfinished features.
- Use zooms/crops that preserve legibility at mobile viewing size.

## Audio and captions

Record narration, music, SFX, and voice provenance. Duck music beneath speech. Avoid
clipping and jarring loudness changes. Provide captions when speech carries meaning, and
check line breaks and safe areas in every aspect ratio.

## Render acceptance

Use Remotion's supported render path and inspect with `ffprobe` or the media tools described
in [delivery.md](delivery.md). Verify duration, dimensions, frame rate, codec, audio stream,
caption behavior, first/last frames, cuts, and file size. Watch the final render in real
time at least once before calling it complete.
