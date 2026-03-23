#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.sandunpack/run/fixtures.tsv"

if [ ! -f "$PID_FILE" ]; then
  echo "No sandunpack fixture servers are recorded as running."
  exit 0
fi

stop_pid() {
  local pid="$1"

  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  pkill -TERM -P "$pid" 2>/dev/null || true
  kill "$pid" 2>/dev/null || true
}

force_stop_pid() {
  local pid="$1"

  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  pkill -KILL -P "$pid" 2>/dev/null || true
  kill -KILL "$pid" 2>/dev/null || true
}

echo "Stopping fixture servers..."
while IFS=$'\t' read -r name pid port _; do
  if [ -z "${pid:-}" ]; then
    continue
  fi

  if kill -0 "$pid" 2>/dev/null; then
    printf "  - %s on port %s (pid %s)\n" "$name" "$port" "$pid"
    stop_pid "$pid"
  fi
done < "$PID_FILE"

for _ in $(seq 1 20); do
  remaining=0

  while IFS=$'\t' read -r _ pid _ _; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      remaining=1
      break
    fi
  done < "$PID_FILE"

  if [ "$remaining" -eq 0 ]; then
    rm -f "$PID_FILE"
    echo "Fixture servers stopped."
    exit 0
  fi

  sleep 0.2
done

while IFS=$'\t' read -r _ pid _ _; do
  if [ -n "${pid:-}" ]; then
    force_stop_pid "$pid"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
echo "Fixture servers were force-stopped."
