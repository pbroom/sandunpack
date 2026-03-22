# Instrumentation Baseline

## Scope resumed here

- Added gated debug event emitters inside the local `sandpack/` fork for:
  - `sandpack-react` provider/client lifecycle
  - `sandpack-react` update scheduling and skipped-vs-applied preview updates
  - `sandpack-client` load/runtime lifecycle
- Stabilized the `fixtures/minimal-startup-race-react` harness so one `runNonce` only schedules one race sequence and log rows keep unique keys.

## Files touched in the fork

- `sandpack/sandpack-react/src/utils/debug.ts`
- `sandpack/sandpack-react/src/contexts/utils/useClient.ts`
- `sandpack/sandpack-client/src/utils/debug.ts`
- `sandpack/sandpack-client/src/clients/index.ts`
- `sandpack/sandpack-client/src/clients/runtime/index.ts`

## Workspace fixture touchpoint

- `fixtures/minimal-startup-race-react/src/App.tsx`

## How to run the current repro

1. Build the linked fork packages:
   - `cd sandpack/sandpack-client && yarn build`
   - `cd sandpack/sandpack-react && yarn build`
2. Start a fresh fixture server:
   - `pnpm --filter minimal-startup-race-react exec vite --port 4273 --force`
3. Open `http://localhost:4273/`.
4. Use `Clear logs`, `Remount sandbox`, then `Run race update`.

## Current observed behavior

- The fixture is now stable enough to inspect in-browser without the earlier runaway React update loop from the harness itself.
- The event log shows lifecycle traces such as:
  - `react:create-client:start`
  - `react:create-client:ready`
  - `react:run:complete`
  - `client:load:ready`
  - `client:runtime:init`
  - `client:runtime:initialized`
  - `client:runtime:update-sandbox`
- The startup-race repro still shows the important failure signal:
  - preview stays at `waiting`
  - `Preview matches` stays `false`

## Next likely slice

- Run the same instrumentation against the direct client fixture and timeout fixture, then compare:
  - whether skipped updates are wrapper-only or also visible in the direct client path
  - whether refresh/restart traces show stale client reuse after timeout/remount
