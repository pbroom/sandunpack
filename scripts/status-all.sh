#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.sandunpack/run/fixtures.tsv"

if [ ! -f "$PID_FILE" ]; then
  echo "No sandunpack fixture servers are recorded as running."
  exit 0
fi

running=0

while IFS=$'\t' read -r name pid port log_file; do
  if [ -z "${pid:-}" ]; then
    continue
  fi

  if kill -0 "$pid" 2>/dev/null; then
    running=1
    printf "%s: running on http://localhost:%s/ (pid %s)\n" "$name" "$port" "$pid"
    printf "  log: %s\n" "$log_file"
  else
    printf "%s: not running (stale pid %s)\n" "$name" "$pid"
  fi
done < "$PID_FILE"

if [ "$running" -eq 0 ]; then
  rm -f "$PID_FILE"
  echo "Removed stale fixture PID file."
fi
