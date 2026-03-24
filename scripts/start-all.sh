#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATE_DIR="$ROOT/.sandunpack"
RUN_DIR="$STATE_DIR/run"
LOG_DIR="$STATE_DIR/logs"
PID_FILE="$RUN_DIR/fixtures.tsv"

FIXTURES=(
  "minimal-race-react|$ROOT/fixtures/minimal-startup-race-react|4173"
  "minimal-race-client|$ROOT/fixtures/minimal-startup-race-client|4174"
  "timeout-restart|$ROOT/fixtures/timeout-restart-repro|4175"
  "heavy-repro|$ROOT/fixtures/color-kit-plane-api-repro|4176"
)

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR/nvm.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$NVM_DIR/nvm.sh"

echo "Using Node 20..."
nvm use 20 >/dev/null 2>&1 || nvm install 20 >/dev/null
nvm use 20 >/dev/null

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but not installed." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing workspace dependencies..."
  pnpm install
fi

pnpm check:fixture-links

if [ -f "$PID_FILE" ]; then
  while IFS=$'\t' read -r _ pid _ _; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      echo "Fixture servers are already running. Use 'pnpm status:all' or 'pnpm stop:all'." >&2
      exit 1
    fi
  done < "$PID_FILE"

  rm -f "$PID_FILE"
fi

for fixture in "${FIXTURES[@]}"; do
  IFS="|" read -r name _ port <<< "$fixture"

  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use, so fixture startup is aborting before Vite can auto-increment." >&2
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >&2
    exit 1
  fi
done

if [ "${SANDUNPACK_SKIP_BUILD:-0}" = "1" ]; then
  echo "Skipping vendored Sandpack build because SANDUNPACK_SKIP_BUILD=1."
else
  pnpm build:vendor
fi

if [ "${SANDUNPACK_SKIP_DEV:-0}" = "1" ]; then
  echo "Skipping fixture dev servers because SANDUNPACK_SKIP_DEV=1."
  exit 0
fi

mkdir -p "$RUN_DIR" "$LOG_DIR"
: > "$PID_FILE"

cleanup_failed_start() {
  if [ ! -f "$PID_FILE" ]; then
    return
  fi

  while IFS=$'\t' read -r _ pid _ _; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      pkill -TERM -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"

  rm -f "$PID_FILE"
}

wait_for_port() {
  local name="$1"
  local pid="$2"
  local port="$3"
  local log_file="$4"

  for _ in $(seq 1 50); do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name exited before opening port $port. See $log_file." >&2
      return 1
    fi

    sleep 0.2
  done

  echo "$name did not open port $port in time. See $log_file." >&2
  return 1
}

trap cleanup_failed_start ERR INT TERM

echo "Starting fixture servers in the background..."
for fixture in "${FIXTURES[@]}"; do
  IFS="|" read -r name fixture_dir port <<< "$fixture"
  log_file="$LOG_DIR/$name.log"

  : > "$log_file"

  nohup bash -c 'cd "$1" && exec pnpm exec vite --host localhost --port "$2" --strictPort' _ "$fixture_dir" "$port" >"$log_file" 2>&1 &
  pid=$!

  printf "%s\t%s\t%s\t%s\n" "$name" "$pid" "$port" "$log_file" >> "$PID_FILE"
done

while IFS=$'\t' read -r name pid port log_file; do
  wait_for_port "$name" "$pid" "$port" "$log_file"
done < "$PID_FILE"

trap - ERR INT TERM

echo "Fixture servers are running:"
while IFS=$'\t' read -r name pid port log_file; do
  printf "  - %s: http://localhost:%s/ (pid %s, log %s)\n" "$name" "$port" "$pid" "$log_file"
done < "$PID_FILE"

open_target="${SANDUNPACK_OPEN:-minimal-race-react}"
if [ "$open_target" != "none" ]; then
  bash "$ROOT/scripts/open-all.sh" "$open_target" || true
fi

echo "Use 'pnpm status:all' to see URLs again."
echo "Use 'pnpm open:all' to open every running fixture in the browser."
