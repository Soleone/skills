#!/usr/bin/env bash
set -euo pipefail

usage() { printf 'Usage: media-info.sh [--] <image|video|audio-file>\n'; }

if [[ $# -eq 1 && ( "$1" == "-h" || "$1" == "--help" ) ]]; then
  usage
  exit 0
elif [[ $# -eq 2 && "$1" == "--" ]]; then
  input="$2"
elif [[ $# -eq 1 ]]; then
  input="$1"
else
  usage >&2
  exit 2
fi

[[ "$input" == -* ]] && input="./$input"
[[ -f "$input" ]] || { printf 'Not a file: %s\n' "$input" >&2; exit 1; }

if command -v realpath >/dev/null 2>&1; then
  input="$(realpath -- "$input")"
fi

printf 'Path: %s\n' "$input"
printf 'Bytes: %s\n' "$(wc -c < "$input" | tr -d ' ')"

mime=""
if command -v file >/dev/null 2>&1; then
  printf 'Type: %s\n' "$(file -b -- "$input")"
  mime="$(file -b --mime-type -- "$input" 2>/dev/null || true)"
fi

lower="$(printf '%s' "$input" | tr '[:upper:]' '[:lower:]')"
kind="unknown"
case "$mime" in
  image/*) kind="image" ;;
  video/*|audio/*) kind="av" ;;
esac
if [[ "$kind" == "unknown" ]]; then
  case "$lower" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.avif|*.tif|*.tiff|*.bmp|*.svg) kind="image" ;;
    *.mp4|*.mov|*.mkv|*.webm|*.avi|*.m4v|*.mp3|*.wav|*.m4a|*.aac|*.flac|*.ogg) kind="av" ;;
  esac
fi

case "$kind" in
  av)
    command -v ffprobe >/dev/null 2>&1 || { printf 'ffprobe is required for audio/video inspection.\n' >&2; exit 1; }
    exec ffprobe -v error \
      -show_entries format=format_name,duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,pix_fmt,r_frame_rate,sample_rate,channels,channel_layout \
      -of json "$input"
    ;;
  image)
    if command -v magick >/dev/null 2>&1; then
      exec magick identify -verbose "$input"
    elif command -v identify >/dev/null 2>&1; then
      exec identify -verbose "$input"
    else
      printf 'Image dimensions: unavailable (install ImageMagick or inspect with the host image tool).\n'
    fi
    ;;
  *)
    if command -v ffprobe >/dev/null 2>&1 && ffprobe -v error "$input" >/dev/null 2>&1; then
      exec ffprobe -v error -show_format -show_streams -of json "$input"
    elif command -v magick >/dev/null 2>&1 && magick identify "$input" >/dev/null 2>&1; then
      exec magick identify -verbose "$input"
    elif command -v identify >/dev/null 2>&1 && identify "$input" >/dev/null 2>&1; then
      exec identify -verbose "$input"
    fi
    printf 'No specialized inspector available for MIME type: %s\n' "${mime:-unknown}"
    ;;
esac
