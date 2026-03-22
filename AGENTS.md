# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **sandunpack** workspace — a Sandpack root-cause research environment. It contains four Vite+React fixture apps that use a locally-built fork of `codesandbox/sandpack` via `link:` dependencies. There are no backend services, databases, or Docker containers.

### Node version

Node **20.x** is required. The sandpack fork fails to build on Node 22+/24+. After environment startup, verify with `node --version`.

### Two package managers

- **pnpm 10.16.1** (via corepack) manages the outer workspace (`/workspace`).
- **yarn classic 1.22.19** manages the sandpack fork (`/workspace/sandpack`). Yarn >= 1.22.22 refuses to run inside the outer pnpm workspace because it detects the parent `packageManager` field; use 1.22.19 to avoid this.

### Sandpack fork

The fork lives at `/workspace/sandpack/` (gitignored). It must be cloned from `https://github.com/pbroom/sandpack` and three packages must be built before the fixtures work:

```sh
cd /workspace/sandpack/sandpack-client && yarn build
cd /workspace/sandpack/sandpack-react && yarn build
cd /workspace/sandpack/sandpack-themes && yarn build
```

The `sandpack-client` build emits TS18046 warnings from `static-browser-server/src/lib/mime.ts` — these are harmless and don't block the build.

### Fixture dev servers

| Script | Fixture | Port |
|---|---|---|
| `pnpm dev:minimal-race-react` | minimal-startup-race-react | 4173 |
| `pnpm dev:minimal-race-client` | minimal-startup-race-client | 4174 |
| `pnpm dev:timeout-restart` | timeout-restart-repro | 4175 |
| `pnpm dev:heavy-repro` | color-kit-plane-api-repro | 4176 |

### Checks and builds

- **TypeScript check**: `pnpm check:fixtures` (runs `tsc --noEmit` on all four fixtures)
- **Production build**: `pnpm build:fixtures` (runs `tsc --noEmit && vite build` on all four fixtures)
- There are no automated test suites or lint configurations in this workspace. The sandpack fork has its own tests (`cd sandpack/sandpack-client && yarn test`, etc.), which are timezone-sensitive — use `TZ=UTC` for `sandpack-react` tests.

### Gotchas

- The `vite.config.ts` in each fixture aliases `react` and `react-dom` to the sandpack fork's `node_modules` to avoid duplicate React instances. If you add new fixtures, replicate this pattern.
- Fixtures use `// @ts-nocheck` on some files because sandpack-react types can lag behind builds.
- The Sandpack preview iframe connects to an external CodeSandbox bundler service. The "preview waiting" status in fixtures is expected — it demonstrates the race conditions being investigated.
