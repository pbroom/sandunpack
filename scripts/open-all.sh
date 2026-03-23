#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.sandunpack/run/fixtures.tsv"
TARGET="${1:-minimal-race-react}"
PRINT_ONLY="${SANDUNPACK_PRINT_ONLY:-0}"

if [ ! -f "$PID_FILE" ]; then
  echo "No sandunpack fixture servers are recorded as running."
  exit 1
fi

declare -a AVAILABLE=()
declare -a URLS=()

while IFS=$'\t' read -r name pid port log_file; do
  if [ -z "${pid:-}" ] || ! kill -0 "$pid" 2>/dev/null; then
    continue
  fi

  url="http://localhost:$port/"
  AVAILABLE+=("$name")

  case "$TARGET" in
    all)
      URLS+=("$url")
      ;;
    "$name")
      URLS=("$url")
      ;;
  esac
done < "$PID_FILE"

if [ "$TARGET" != "all" ] && [ "${#URLS[@]}" -eq 0 ]; then
  echo "No running fixture matched '$TARGET'." >&2
  if [ "${#AVAILABLE[@]}" -gt 0 ]; then
    printf "Available fixtures: %s\n" "${AVAILABLE[*]}" >&2
  fi
  exit 1
fi

if [ "$TARGET" = "all" ] && [ "${#URLS[@]}" -eq 0 ]; then
  echo "No running fixture servers were found."
  exit 1
fi

open_url() {
  local url="$1"

  if command -v open >/dev/null 2>&1; then
    open "$url"
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
    return 0
  fi

  return 1
}

opened=0
if [ "$PRINT_ONLY" != "1" ]; then
  for url in "${URLS[@]}"; do
    if open_url "$url"; then
      opened=1
    fi
  done
fi

if [ "$PRINT_ONLY" = "1" ]; then
  echo "Fixture URLs:"
elif [ "$opened" -eq 1 ]; then
  if [ "$TARGET" = "all" ]; then
    echo "Opened all running fixtures:"
  else
    echo "Opened $TARGET:"
  fi
else
  echo "No supported browser opener was found. Use these URLs:"
fi

for url in "${URLS[@]}"; do
  printf "  %s\n" "$url"
done
