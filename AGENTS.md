## Learned User Preferences

- When maintaining `AGENTS.md`, update stale guidance in place instead of only appending new memory.

## Learned Workspace Facts

- `sandunpack` is a single root repo; the Sandpack source is vendored under `vendor/sandpack` instead of cloned into a separate top-level `sandpack/` directory.
- Use Node 20.x in this workspace; the vendored Sandpack build is unreliable on Node 22+ and 24+.
- The outer workspace is managed by `pnpm` (`pnpm@10.16.1`) and exposes the root scripts in `package.json`, including `pnpm start:all`.
- Install vendored Sandpack dependencies with Yarn classic `1.22.19` through `scripts/vendor-yarn.sh` or `pnpm install:vendor`; do not use bare `yarn` in `vendor/sandpack`.
- Running Yarn Berry against `vendor/sandpack` creates `.yarn/` and `.yarnrc.yml` artifacts and rewrites `vendor/sandpack/yarn.lock`; the root `.gitignore` guards against those files.
- Build the vendored packages before using the fixtures: `sandpack-client`, `sandpack-react`, and `sandpack-themes`.
- The fixture apps are `minimal-startup-race-react`, `minimal-startup-race-client`, `timeout-restart-repro`, and `color-kit-plane-api-repro` under `fixtures/`.
- `pnpm check:fixtures` runs `tsc --noEmit` across all four fixtures, and `pnpm build:fixtures` runs their production builds.
- The outer workspace does not have a dedicated lint or automated test suite; library tests live inside `vendor/sandpack`.
- The `sandpack-client` build can emit the known `TS18046` warning from `static-browser-server/src/lib/mime.ts`; treat it as non-blocking unless behavior changes.
- Fixture `vite.config.ts` files need `react` and `react-dom` aliases that point at the vendored Sandpack dependency tree to avoid duplicate React instances.
- The repro fixtures still depend on the external CodeSandbox bundler service, so waiting or connectivity states in the preview iframe are expected during investigation.
