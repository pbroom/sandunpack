# Baseline

Historical note: this file captures the original sibling-clone setup. The current control-repo layout vendors Sandpack under `vendor/sandpack/`; see `notes/control-repo-layout.md` for the active workflow.

## Workspace status

- Root workspace repo initialized at `sandunpack/`.
- Fork created at `https://github.com/pbroom/sandpack`.
- Local fork cloned into `sandunpack/sandpack`.
- `upstream` remote points at `https://github.com/codesandbox/sandpack.git`.
- Handoff preserved in `HANDOFF.md`.

## Upstream references

- Sandpack client docs: <https://sandpack.codesandbox.io/docs/advanced-usage/client>
- Hooks docs: <https://sandpack.codesandbox.io/docs/advanced-usage/hooks>
- Issue `#1181`: <https://github.com/codesandbox/sandpack/issues/1181>
- Issue `#1063`: <https://github.com/codesandbox/sandpack/issues/1063>
- Issue `#920`: <https://github.com/codesandbox/sandpack/issues/920>
- PR `#1087`: <https://github.com/codesandbox/sandpack/pull/1087>
- PR `#1157`: <https://github.com/codesandbox/sandpack/pull/1157>
- PR `#1160`: <https://github.com/codesandbox/sandpack/pull/1160>
- PR `#1196`: <https://github.com/codesandbox/sandpack/pull/1196>

## `color-kit` fixture notes

Primary integration hotspots:

- `color-kit/apps/docs/src/components/plane-api-playground.sandpack.tsx`
- `color-kit/apps/docs/src/lib/plane-api-playground-source.ts`
- `color-kit/apps/docs/src/components/plane-api-demos.tsx`

Important stressors confirmed from the current docs fixture:

- The playground injects the raw `@color-kit/core` source tree with `import.meta.glob('../../../../packages/core/src/**/*.{ts,tsx}', ...)`.
- The generated Sandpack file map hides a large number of virtual files under `/color-kit-core/...`.
- `plane-api-playground-source.ts` rewrites `@color-kit/core` imports to `./color-kit-core/index.ts`.
- The docs experience uses `SandpackProvider` with a `react-ts` setup plus explicit `sandpack.runSandpack()` on mount.
- The docs UI uses a custom `Open Sandbox` POST flow instead of Sandpack's default export UI.

Observed symptom set from prior `color-kit` work:

- Editor changes can diverge from the preview.
- Refresh or restart can leave the preview white or blank.
- Long-running or heavy sessions can end in `Couldn't connect to server` and `TIME_OUT`.
- The custom runtime branch was the only reliable shipping path for the Plane API playground.

Known branch context from the handoff:

- `feat/plane-playground-simplify-sandpack`
- `feat/plane-playground-experimental-bundler`
- `feat/plane-playground-custom-runtime`
- `feat/plane-playground-sandpack-root-cause`

## Local fork verification

Environment used for local verification:

- Default machine Node: `v24.4.1`
- Working verification Node: `v20.19.5`
- Yarn: `3.3.1`

What passed locally in the cloned fork under Node 20:

- `sandpack/sandpack-client`: `yarn build`, `yarn test`
- `sandpack/sandpack-react`: `yarn build`, `TZ=UTC yarn test`, `yarn typecheck`
- `sandpack/sandpack-themes`: `yarn build`, `yarn typecheck`

Local toolchain caveats to avoid misclassifying as Sandpack runtime bugs:

- Root `yarn build`, `yarn test`, and `yarn typecheck` fail through Turbo because this repo does not declare a root `packageManager` field.
- `sandpack-react` tests are timezone-sensitive; one test fails outside UTC and passes with `TZ=UTC`.
- `website/codesandbox-theme-docs` build fails locally in `lightningcss-cli` with `SyntaxError: Invalid or unexpected token`.
- `website/codesandbox-theme-docs` test reports `MISSING DEP  Can not find dependency 'vite'`.
- `sandpack-client` build emits TypeScript warnings from `static-browser-server/src/lib/mime.ts` (`TS18046: 'entry' is of type 'unknown'`) but still completes successfully.

## First fork touchpoints

The most relevant upstream files for the first investigation pass are:

- `sandpack/sandpack-react/src/contexts/utils/useClient.ts`
- `sandpack/sandpack-react/src/components/Preview/index.tsx`
- `sandpack/sandpack-react/src/hooks/useSandpackNavigation.ts`
- `sandpack/sandpack-react/src/hooks/useSandpackShell.ts`
- `sandpack/sandpack-client/src/clients/index.ts`
- `sandpack/sandpack-client/src/types.ts`

Current hypothesis ordering:

1. File updates are dropped while the client is still initializing or recompiling.
2. Timeout and restart cleanup is incomplete, leaving stale clients or blank previews behind.
3. Heavy or long-lived instances still have a separate connectivity failure mode even if update queueing improves.
