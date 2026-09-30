# Delivery, QA, and provenance

A creative artifact is not finished when generation or rendering succeeds. It is finished
when the real exported files are inspected, meet channel constraints, and can be traced
back to editable sources and authorized inputs.

## Suggested directory

```text
artifact-root/
  index.md
  assets/
  sources/
  previews/
```

Use predictable names:

```text
<campaign>-<concept>-<channel>-<aspect>-<locale>-<variant>.<ext>
```

Avoid `final-final-2` naming. Increment a documented variant or revision identifier.

## Inspect files

When available:

```bash
./scripts/preflight.sh
./scripts/media-info.sh path/to/output.mp4
```

For images, inspect dimensions, color mode/profile, alpha, file size, and visible pixels.
For video/audio, inspect container, codec, dimensions, frame rate, duration, stream layout,
sample rate/channels, and loudness where delivery requirements specify it.

Useful tools include `ffmpeg`, `ffprobe`, ImageMagick, browser capture, and the host's image
inspection capability. Use what is available; do not install heavy tooling without consent.

## Visual review

Review at three scales:

1. Full resolution for artifacts and geometry.
2. Intended display size for readability and hierarchy.
3. Thumbnail/feed size for immediate recognition.

For motion, inspect representative frames and watch the complete final encode with audio.
Check first/last frames, cuts, fades, caption timing, CTA dwell, loop seam where applicable,
and portrait safe areas.

## Manifest template

```markdown
# Creative manifest

## Direction
<one concise rationale>

## Assets
| Final path | Editable source | Purpose/channel | Dimensions/duration | Format/codec | Variant |
|---|---|---|---|---|---|

## Provenance
| Asset | Origin/provider | Model/version | Inputs/references | Material edits | Approval/rights |
|---|---|---|---|---|---|

## Usage notes
- safe areas and crop behavior
- background and contrast requirements
- animation/audio/caption notes
- prohibited modifications

## Validation
- commands run
- rendered previews inspected
- known limitations
```

## Provenance requirements

For generated media, record provider/tool and model when known, prompt or prompt file,
reference inputs, masks, seed when exposed, generation date, material edits, and approval
status. For fonts, stock, music, voices, logos, and customer content, record source and
usage constraints.

Do not infer that a provider's availability grants rights to third-party inputs or depicted
brands and people. Flag unresolved licensing, likeness, voice, customer-data, or geography
constraints before publication.

## Failure behavior

Do not report a file that does not exist. Do not substitute a prompt, storyboard, or source
file for a requested final export without saying so. If rendering or validation fails,
retain the source and previews, report the exact blocker, and identify the smallest next
step that would produce the requested medium.
