#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <yarn-args...>" >&2
  exit 1
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR/nvm.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$NVM_DIR/nvm.sh"

nvm use 20 >/dev/null 2>&1 || nvm install 20 >/dev/null
nvm use 20 >/dev/null

YARN1_DIR="${TMPDIR:-/tmp}/yarn-1.22.19"
YARN1="$YARN1_DIR/yarn-v1.22.19/bin/yarn.js"

if [ ! -f "$YARN1" ]; then
  echo "Downloading Yarn 1.22.19..."
  rm -rf "$YARN1_DIR"
  mkdir -p "$YARN1_DIR"
  curl -fsSL https://registry.npmjs.org/yarn/-/yarn-1.22.19.tgz -o "$YARN1_DIR/yarn.tgz"
  tar -xzf "$YARN1_DIR/yarn.tgz" -C "$YARN1_DIR"
fi

cd "$ROOT/vendor/sandpack"
node "$YARN1" "$@"
