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

nvm use 20 >/dev/null 2>&1 || nvm install 20 >/dev/null
nvm use 20 >/dev/null

if [ ! -d "$ROOT/vendor/sandpack/node_modules" ]; then
  echo "Installing vendored Sandpack dependencies..."
  bash "$ROOT/scripts/vendor-yarn.sh" install
fi

export PATH="$ROOT/vendor/sandpack/node_modules/.bin:$PATH"

echo "Building linked Sandpack packages..."
(
  cd "$ROOT/vendor/sandpack/sandpack-client"
  rm -rf dist sandpack src/clients/node/inject-scripts/dist
  rollup -c --bundleConfigAsCjs
)
(
  cd "$ROOT/vendor/sandpack/sandpack-themes"
  rm -rf dist
  rollup -c
  tsc -p tsconfig.json
)
(
  cd "$ROOT/vendor/sandpack/sandpack-react"
  rm -rf dist
  rollup -c
)
