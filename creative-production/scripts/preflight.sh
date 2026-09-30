#!/usr/bin/env bash
set -uo pipefail

usage() {
  cat <<'EOF'
Usage: preflight.sh [all|still|browser|video]

Reports available creative-production capabilities. This script never installs tools.
Exit status is non-zero only when a requested workflow lacks a hard requirement.
EOF
}

workflow="${1:-all}"
case "$workflow" in
  all|still|browser|video) ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

has() { command -v "$1" >/dev/null 2>&1; }
show() {
  local command="$1" label="$2"
  if has "$command"; then
    printf 'ok       %-18s %s\n' "$label" "$(command -v "$command")"
    return 0
  fi
  printf 'missing  %-18s %s\n' "$label" "$command"
  return 1
}

printf 'Creative production preflight (%s)\n\n' "$workflow"

node_ok=0 browser_ok=0 ffmpeg_ok=0 ffprobe_ok=0 image_tools=0
show node "Node.js" && node_ok=1
show npm "npm" || true
show ffmpeg "FFmpeg" && ffmpeg_ok=1
show ffprobe "ffprobe" && ffprobe_ok=1

if show agent-browser "agent-browser"; then
  browser_ok=1
else
  browser_command=""
  for candidate in chromium chromium-browser google-chrome; do
    if has "$candidate"; then browser_command="$candidate"; break; fi
  done
  if [[ -n "$browser_command" ]]; then
    show "$browser_command" "headless browser" && browser_ok=1
  elif (( node_ok == 1 )) && node -e 'const fs=require("fs"); try { const {chromium}=require("playwright"); fs.accessSync(chromium.executablePath()); process.exit(0); } catch {} try { const p=require("puppeteer"); fs.accessSync(p.executablePath()); process.exit(0); } catch {} process.exit(1)' 2>/dev/null; then
    printf 'ok       %-18s %s\n' "browser automation" "local Playwright/Puppeteer with browser executable"
    browser_ok=1
  else
    printf 'missing  %-18s %s\n' "browser capture" "agent-browser, headless Chromium, or local Playwright/Puppeteer"
  fi
fi

if show magick "ImageMagick"; then image_tools=1
elif show identify "ImageMagick identify"; then image_tools=1
fi
show file "file inspection" || true

printf '\nNotes\n'
printf '%s\n' '- Host-native image generation is a model tool and cannot be detected by this shell script.'
printf '%s\n' '- A project may provide Playwright/Remotion locally even when no global binary exists.'
printf '%s\n' '- Check credentials and licenses separately; command availability is not authorization.'

case "$workflow" in
  all) exit 0 ;;
  still)
    # Native SVG/HTML source only requires writable files; inspection tooling is optional.
    exit 0
    ;;
  browser)
    (( browser_ok == 1 )) || {
      printf '\nBlocked: browser workflow needs agent-browser, a headless browser executable, or a verified local Playwright/Puppeteer installation.\n' >&2
      exit 1
    }
    ;;
  video)
    (( node_ok == 1 && ffmpeg_ok == 1 && ffprobe_ok == 1 )) || {
      printf '\nBlocked: video workflow needs Node.js, ffmpeg, and ffprobe. Remotion project dependencies must also be checked locally.\n' >&2
      exit 1
    }
    ;;
esac
