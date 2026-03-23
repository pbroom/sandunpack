#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

pnpm build:vendor

if [ "${SANDUNPACK_SKIP_DEV:-0}" = "1" ]; then
  echo "Skipping fixture dev servers because SANDUNPACK_SKIP_DEV=1."
  exit 0
fi

pids=()
cleanup() {
  local exit_code=$?

  if [ "${#pids[@]}" -gt 0 ]; then
    kill "${pids[@]}" 2>/dev/null || true
  fi

  exit "$exit_code"
}
trap cleanup EXIT INT TERM

echo "Starting fixture servers..."
pnpm dev:minimal-race-react & pids+=($!)
pnpm dev:minimal-race-client & pids+=($!)
pnpm dev:timeout-restart & pids+=($!)
pnpm dev:heavy-repro & pids+=($!)

wait
