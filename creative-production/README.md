# Creative production skill

A standalone, portable Agent Skill for producing polished campaign graphics, social
assets, product visuals, motion graphics, and promotional video.

It routes each deliverable to the smallest suitable workflow:

- native SVG or HTML/CSS for precise visual systems
- image generation/editing for raster imagery
- Canvas/WebGL only for procedural or spatial visuals
- Remotion for deterministic motion and video
- browser capture and FFmpeg/ffprobe for delivery QA

## Use locally with Pi

From this repository:

```bash
pi install -l .
```

Or load the skill directly:

```bash
pi --skill ./SKILL.md
```

Then invoke `/skill:creative-production` or ask for a marketing visual/media deliverable.

## Optional Remotion expertise

Install Remotion's maintained Agent Skills separately when doing video work:

```bash
npx skills add remotion-dev/skills
```

## Validate available local tooling

```bash
npm run validate
bash scripts/preflight.sh video
bash scripts/media-info.sh path/to/output.mp4
```

The skill does not install production dependencies or require Staffed. It can be made
available to any agent or persona whose scope permits creative output.
