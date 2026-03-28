## Learned User Preferences

- When maintaining `AGENTS.md`, update stale guidance in place, process only new or changed transcripts via `.cursor/hooks/state/continual-learning-index.json`, keep only high-signal repeated preferences or durable workspace facts, and reply exactly `No high-signal memory updates.` when nothing qualifies.
- Treat repro fixture defaults (for example non-Strict baseline) as investigation controls, not as the intended long-term standard for production integrations; use stress toggles such as `VITE_STRICT_MODE=true` when double-mount behavior is explicitly under test.

## Learned Workspace Facts

- `sandunpack` is a single root repo; `vendor/sandpack` is the tracked Sandpack source of truth, but a sibling top-level `sandpack/` clone may also exist as scratch space, so verify linked package realpaths before debugging or patching.
- Use Node 20.x in this workspace; the vendored Sandpack build is unreliable on Node 22+ and 24+.
- The outer workspace is managed by `pnpm` (`pnpm@10.16.1`) and exposes the root scripts in `package.json`, including `pnpm start:all`.
- Install vendored Sandpack dependencies with Yarn classic `1.22.19` through `scripts/vendor-yarn.sh` or `pnpm install:vendor`; do not use bare `yarn` in `vendor/sandpack`.
- Running Yarn Berry against `vendor/sandpack` creates `.yarn/` and `.yarnrc.yml` artifacts and rewrites `vendor/sandpack/yarn.lock`; the root `.gitignore` guards against those files.
- Build the vendored packages before using the fixtures: `sandpack-client`, `sandpack-react`, and `sandpack-themes`.
- The fixture apps are `minimal-startup-race-react`, `minimal-startup-race-client`, `timeout-restart-repro`, `color-kit-plane-api-repro`, and `heavy-timeout-disconnect-repro` under `fixtures/`; root also exposes `pnpm dev:heavy-timeout-disconnect` for the last. Repro harnesses default to a non-Strict baseline in the host and in the iframe sandbox entry where overridden; set `VITE_STRICT_MODE=true` to stress-test React 18 dev double-mount behavior.
- Use `pnpm check:fixtures` and `pnpm build:fixtures` for repo-wide validation; this workspace does not have a `turbo.json`, so `pnpm turbo ...` commands are not applicable.
- The outer workspace does not have a dedicated lint or automated test suite; library tests live inside `vendor/sandpack`.
- The `sandpack-client` build can emit the known `TS18046` warning from `static-browser-server/src/lib/mime.ts`; treat it as non-blocking unless behavior changes.
- Fixture `vite.config.ts` files need `react` and `react-dom` aliases that point at the vendored Sandpack dependency tree to avoid duplicate React instances.
- The repro fixtures still depend on the external CodeSandbox bundler service, so waiting or connectivity states in the preview iframe are expected during investigation.
- Vendored `sandpack-react` `useClient` drives the bundler timeout from a single shared timer (wired when the first client subscribes), not per Sandpack client instance; when debugging timeouts, correlate behavior with `react:timeout:register`, `react:timeout:clear`, and `react:timeout:fired` events rather than assuming per-client isolation.
