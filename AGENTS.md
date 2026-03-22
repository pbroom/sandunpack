# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **sandunpack** workspace — a Sandpack root-cause research environment. It contains four Vite+React fixture apps under `fixtures/` that depend on a vendored fork of `codesandbox/sandpack` at `vendor/sandpack/`. There are no backend services, databases, or Docker containers. All commands are documented in `package.json` scripts.

### Node version

Node **20.x** is required. The vendored sandpack fork fails to build on Node 22+/24+. The VM snapshot pins Node 20 via nvm.

### Two package managers

- **pnpm 10.16.1** manages the outer workspace (`/workspace`).
- **Yarn Classic 1.22.19** manages the vendored sandpack workspace (`vendor/sandpack/`). Yarn >= 1.22.20 refuses to run inside the outer pnpm workspace because it detects the parent `packageManager` field; 1.22.19 avoids this.

### Key commands (all from repo root)

| Command | Purpose |
|---|---|
| `pnpm install` | Install fixture dependencies (pnpm workspace) |
| `pnpm install:vendor` | Install vendored sandpack dependencies (yarn) |
| `pnpm build:vendor` | Build sandpack-client, sandpack-react, sandpack-themes |
| `pnpm check:fixtures` | TypeScript check (`tsc --noEmit`) all four fixtures |
| `pnpm build:fixtures` | Production build all four fixtures |
| `pnpm dev:minimal-race-react` | Dev server on port 4173 |
| `pnpm dev:minimal-race-client` | Dev server on port 4174 |
| `pnpm dev:timeout-restart` | Dev server on port 4175 |
| `pnpm dev:heavy-repro` | Dev server on port 4176 |

### Gotchas

- The `vite.config.ts` in each fixture aliases `react`/`react-dom` to `vendor/sandpack/node_modules` to avoid duplicate React instances. New fixtures must replicate this pattern.
- There are no automated test suites or ESLint configs in this workspace. The vendored sandpack fork has its own tests (`cd vendor/sandpack/sandpack-client && yarn test`); `sandpack-react` tests are timezone-sensitive — use `TZ=UTC`.
- The `sandpack-client` build emits TS18046 warnings from `static-browser-server/src/lib/mime.ts` — these are harmless.
- The Sandpack preview iframe connects to an external CodeSandbox bundler service at runtime; "preview waiting" status is expected and demonstrates the race conditions being investigated.
