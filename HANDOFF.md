# Sandunpack Handoff

This document is a handoff for the existing `sandunpack` workspace dedicated to Sandpack root-cause research, fork validation, and upstream PR work.

The goal is to keep `color-kit` focused on shipping a stable Plane API playground while using it as a strong consumer fixture for Sandpack debugging.

## Executive Summary

`color-kit` explored four parallel tracks for the Plane API playground:

- simplify the current Sandpack integration
- try Sandpack's experimental bundler
- replace Sandpack with a custom in-repo runtime
- investigate Sandpack root causes and possible fork/patch paths

The outcome was clear:

- The custom runtime was the only reliable ship candidate for `color-kit`.
- The Sandpack-based branches still reproduced the same failure class:
  - preview/editor divergence
  - long stalls ending in `TIME_OUT`
  - white or blank preview panes after refresh/restart

That makes `color-kit` a very useful validation fixture, but a poor primary research environment. It combines several Sandpack stressors at once, which makes it hard to isolate root cause.

The best next step is to keep using this `sandunpack` workspace to validate targeted fixes in `vendor/sandpack/`, prioritize smaller deterministic reproductions, and then test those fixes back against a `color-kit`-derived fixture.

## Current Status

- The workspace and planned repro fixtures already exist under `fixtures/`.
- `minimal-startup-race-react` was fixed and merged as a fixture/harness bug, not as a proven Sandpack-core patch.
- That merged harness fix stabilized `SandpackProvider` props, deduped debug-log rerenders, corrected the template update path from `'/src/App.tsx'` to `'/App.tsx'`, stabilized delayed update scheduling, and removed `React.StrictMode` from the React wrapper fixture. The current workspace also normalizes StrictMode across the remaining repros with a shared `VITE_STRICT_MODE` toggle, so baseline runs stay non-Strict in both the host app and the iframe sandbox unless double-mount behavior is the explicit thing under test.
- No vendored `Sandpack` patch has been proven by that merged change yet.
- A fresh `pnpm install` under Node 20 repaired stale fixture links that had drifted back to the sibling `sandpack/` checkout. The current workspace install resolves fixture links into `vendor/sandpack`, and `pnpm check:fixture-links`, `pnpm build:vendor`, and `pnpm build:fixtures` all pass against the vendored tree.
- `minimal-startup-race-client` now behaves like a clean control fixture: baseline startup is single-pass and succeeds, while `VITE_STRICT_MODE=true` duplicates initialization work but still lands on the expected preview state.
- `timeout-restart-repro` still reproduces its failure in the non-Strict baseline: startup is single-pass, then times out.
- `vendor/sandpack/sandpack-react/src/contexts/utils/useClient.ts` had a real registration-lifetime bug: unmounting a live preview could leave a stale iframe registration behind, and the next `runSandpack()` would recreate that unmounted client. There is now a focused regression test for that case and a fix that separates timeout cleanup from actual preview unmount cleanup.
- `vendor/sandpack/sandpack-react/src/contexts/utils/useClient.ts` also now guards in-flight `runSandpack()` calls, with a focused regression test proving the same registered client is not initialized twice while a run is already in progress.
- After the registration-lifetime fix plus the in-flight `runSandpack()` guard, a strict-mode browser spot-check no longer shows duplicate client initialization in the `sandpack-react` fixtures.
- `timeout-restart-repro` now exposes preview diagnostics too: preview client id, preview client status, preview URL, iframe `src`, last `urlchange`, and last probe source.
- Those diagnostics show that timeout cleanup clears the live preview URL and iframe `src` back to `none`, while the last `urlchange` remains visible in the log history.
- In the small timeout repro, `runSandpack()` reuses the same preview client id and registration, while a full remount creates a fresh client id and fresh preview state. No broken preview reset or reconnect path is proven there yet.
- `color-kit-plane-api-repro` was re-checked as the heavier consumer harness after switching it to guarded manual autorun behavior. In both baseline and `VITE_STRICT_MODE=true`, the browser log now shows one `runSandpack()` on mount, one `updateFile` per click, and a clean unregister/register cycle on remount.
- In that compact heavy fixture, `Remount preview` intentionally reapplies the current hue state after remount instead of resetting to the blank default, so that behavior should not be treated as proof of stale preview state by itself.
- Those `color-kit` browser spot-checks were still limited by the hosted bundler sitting in `waiting`, so they clear the local duplicate-lifecycle suspicion without proving that all end-to-end preview connectivity risk is gone.
- `heavy-timeout-disconnect-repro` now exists as the active heavy timeout/disconnect probe. It combines a `color-kit`-style hidden file graph, heavy external dependencies, guarded manual `runSandpack()`, rerun/remount controls, and preview diagnostics that now keep client id/status aligned with the Sandpack debug lifecycle events.
- First browser smoke on that new heavy timeout fixture is more interesting than the small timeout control: after remount, `react:register-bundler` can reach a fresh client in `idle` while the visible preview still sits at `waiting` with no preview URL or iframe `src`.
- Timeout-budget matrix results in that heavy fixture are now split three ways: at `4000`, manual `runSandpack()` reliably times out during dependency installation; at `12000`, remount lands in `running` with client `idle`, dispatch refresh/restart are ignored with `clientIds: []`, and only manual `runSandpack()` starts the client; at `30000`, manual `runSandpack()` registers a `30000` timeout but the client can sit in `installing-dependencies` for 43s+ without the timeout ever firing.
- `vendor/sandpack/sandpack-react/src/contexts/utils/useClient.ts` now emits `react:timeout:clear` for the runtime-message paths too (`message-done`, `message-connected`, `message-show-error`), and nulls the timeout hook on clear/fire so the next heavy `30000` run can distinguish early clear vs never-fired timer more directly.
- `heavy-timeout-disconnect-repro` now persists `Last show-error` and `Last notification` in the metrics panel too, and the vendored timeout-clear payload now carries the active global client id plus `show-error` metadata (`title`, `path`, `message`). The next external `30000` run should therefore identify exactly which runtime error cleared the timer and which client owned that clear.
- `heavy-timeout-disconnect-repro` now also derives a dedicated `Timeout-clearing error` metric from the exact `react:timeout:clear` payload, stamped with the same timestamp as `Last timeout clear`, so later `show-error` / `notification` events can no longer obscure the specific error that canceled the timer.
- A focused vendor regression test now confirms a likely root cause for part of that heavy-fixture behavior: rerunning the same registered client could lose the provider-global timeout and message-listener lifecycle. `useClient.ts` now tracks the active global client so same-client reruns re-arm the timeout and rebind the global listener, and the focused `useClient.test.ts` file passes with that patch.
- An external `30000` run now confirms the clear cause too: the active global client arms the timeout, then clears it roughly 6-7 seconds later via `message-show-error` with `Could not fetch dependencies, please try again in a couple seconds:`. That means the remaining bug is no longer timeout registration; it is that `sandpack.error` could still end up back at `none` while provider status remained `running`.
- `vendor/sandpack/sandpack-react/src/contexts/utils/useClient.ts` now preserves the last runtime error across retry `start` messages and only clears it on an actual recovery signal (`connected` or successful `done`). A new focused `useClient.test.ts` regression covers the `show-error -> start -> connected` sequence so dependency-fetch failures should stay surfaced in the UI until the client genuinely recovers.
- Further validation against the real `color-kit` docs app uncovered one more non-hosted bug in the Plane API Sandpack playground: after the custom preview `Refresh` remounted the last preview, one more edit could leave the editor changed while the preview stayed stale, and a second consecutive refresh could blank the iframe with no surfaced error.
- That refresh/remount failure is now traced to `sandpack-react` `useClient`: unmounting the last preview set provider status to `idle`; a remounted preview could recreate a client via a stale `"running"` closure without restoring provider status, so later file updates were skipped because `watchFileChanges` only pushes updates while status is `running`; and once a later remount used an `idle` closure, `registerBundler()` neither recreated the client nor queued a fresh run.
- `vendor/sandpack/sandpack-react/src/contexts/utils/useClient.ts` now restores provider status to `running` whenever `createClient()` successfully registers a client, and `registerBundler()` now immediately calls `runSandpack()` when autorun is enabled and a new bundler registers while provider status is `idle`. There is a focused regression test for that `running -> unregister last client -> idle -> register new client` path in `useClient.test.ts`.
- After rebuilding the vendored packages and linking the real `color-kit` docs app to them, the previously failing focused smoke now passes in the real Plane API playground: initial load, first edit, first custom refresh, second edit after refresh, and second custom refresh all preserve the expected preview state.
- `heavy-timeout-disconnect-repro` now also supports selectable dependency profiles in the UI: `core-only`, `date-fns`, `framer-motion`, `emotion-bundle`, `mui-bundle`, and `full`. Changing the selector remounts the sandbox against the chosen dependency bundle without changing the dev command, and the generated preview app now prints the active profile so shared results remain attributable.
- The current profile matrix already narrows the failure boundary: `core-only`, `date-fns`, `framer-motion`, and `emotion-bundle` all succeed quickly and clear via `message-done`, while `mui-bundle` and `full` both fail with the same early dependency-fetch `message-show-error`. That means Emotion alone is not the trigger; the current failure boundary is the point where `@mui/material` joins the bundle. The raw manual results now live in `z-tests-manual/test-results-1.md` and `z-tests-manual/test-results-2.md`.
- `heavy-timeout-disconnect-repro` now also includes `mui-system-bundle` and `mui-bundle-v5`. `mui-system-bundle` explicitly exercises `@mui/system` on top of Emotion, while `mui-bundle-v5` pins `@mui/material` to the current `latest-v5` line (`5.18.0`) instead of `latest` (`7.3.9`).
- The third manual comparison narrows the boundary further: `mui-system-bundle` fails with the same early dependency-fetch `message-show-error` as `mui-bundle`, while `mui-bundle-v5` passes cleanly. That means `@mui/material` is not required to reproduce the problem and the failure is unlikely to be raw dependency count; the issue now looks tied to the newer MUI shared core line.
- `heavy-timeout-disconnect-repro` now also includes `mui-system-v6`, pinned to `@mui/system@6.5.0`, and that comparison passes cleanly. That keeps the working hypothesis focused on the 7.x shared MUI core line rather than a general Emotion or MUI 5/6 issue.
- `heavy-timeout-disconnect-repro` now also includes pinned `@mui/system` probes across `7.0.0`, `7.0.2`, `7.1.0`, `7.2.0`, `7.3.0`, `7.3.1`, `7.3.5`, and `7.3.8`, and those were re-run in headless Chrome using the explicit `Call runSandpack()` path after each profile change.
- That automated sweep shows a different failure class across the early 7.x line: `@mui/system@7.0.0`, `7.0.2`, `7.1.0`, `7.2.0`, `7.3.0`, and `7.3.1` all fail with `ModuleNotFoundError` for `@mui/system`, clearing the timer via `message-show-error` within roughly 1-3 seconds.
- The hosted dependency-fetch failure starts later. `@mui/system@7.3.5` and `7.3.8` both pass cleanly, while `@mui/system@latest` (`7.3.9`) fails with `Could not fetch dependencies, please try again in a couple seconds:`. That makes the current best boundary for the original failure mode last-good `7.3.8`, first-bad `7.3.9`.
- Fresh `7.3.9` automation still shows the same dependency-fetch error, `message-show-error`, and a `waiting` preview, but the preview client status now settles to `done` rather than the earlier `installing-dependencies` observation. Carry that status drift as a caveat in the evidence bundle, not as proof that the failure class changed.
- Browser-side tracing now identifies the exact hosted failure path for the original `@mui/system@7.3.9` repro. The first bad request is `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/system/7.3.9.json` -> `403`, followed by `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Fsystem%407.3.9` -> `500 {"error":"...Cannot read properties of null (reading 'browser')"}`.
- Raw host-message capture shows Sandpack only surfaces the generic `Could not fetch dependencies, please try again in a couple seconds:` notification / `show-error`. The host does also receive a `console` error with `Error: 500`, but not the upstream response body, so the precise `null.browser` detail is lost before it reaches the visible overlay.
- Direct package-generation probes show the hosted generator failure is broader than the single top-level `@mui/system@7.3.9` request. The same `500 null.browser` response appears for `@mui/private-theming@7.3.8`, `@mui/private-theming@7.3.9`, `@mui/styled-engine@7.3.9`, `@mui/utils@7.3.9`, and `@mui/types@7.4.12`.
- That means `@mui/system@7.3.9` is the first visible top-level repro because its manifest is not prebuilt in the hosted cache and therefore falls into a package-generation path that is already broken for this newer MUI shared-core family.
- The reduction is tighter than `@mui/system` now. `@mui/types@7.4.11` passes cleanly, while `@mui/types@7.4.12` alone reproduces the same hosted dependency-fetch failure. Browser capture for the direct type-only repro shows `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.11.json` -> `200`, while the same path for `7.4.12` returns `403 AccessDenied`.
- Published tarball/manifest diffs support that reading: there is no meaningful new runtime JS in `@mui/system@7.3.9` or the bumped internal packages. The key behavioral change is the dependency tree moving onto `@mui/types@^7.4.12`.
- `disableDependencyPreprocessing` did not avoid the failure in this fixture, and adding only a top-level `@mui/types@7.4.11` next to `@mui/system@7.3.9` did not help because the `7.3.9` manifests still request `^7.4.12`.
- The best current upstream evidence bundle is now `z-tests-manual/test-results-7.md`, not just the earlier version-boundary matrix in `test-results-6.md`.
- The next recommended step is to prepare the upstream report from `test-results-7.md` and `notes/upstream-mui-types-7.4.12.md` with three concrete asks:
  - real fix: restore/fix the hosted package artifact / generator path for `@mui/types@7.4.12`
  - diagnostics fix: propagate upstream status/body into the emitted `show-error` payload instead of collapsing everything to the generic dependency-fetch message
  - temporary mitigation: if needed, roll the MUI `7.3.9` manifests back to `@mui/types@^7.4.11` until the hosted packager issue is fixed
- Only probe `7.3.2` or `7.3.3` later if upstream explicitly wants the exact end of the earlier `ModuleNotFoundError` range. Keep `minimal-startup-race-client` as the small control fixture, `timeout-restart-repro` as the timeout control, and `color-kit-plane-api-repro` as the heavy validation fixture.

## Recommended Project Shape

Current repo note:

- the control-repo source of truth lives at `vendor/sandpack/`
- an ignored sibling clone at `sandpack/` is optional scratch space for direct upstream operations
- future agents should prefer the vendored path unless they are explicitly preparing an upstream branch outside this repo
- verify linked package realpaths before debugging or patching; stale installs can still point fixture `node_modules` at the sibling `sandpack/` tree instead of `vendor/sandpack/`

Use `sandunpack` as a single control repo. The Sandpack fork source, fixtures, and notes should all be operable from one remote.

Suggested layout:

```text
sandunpack/
  HANDOFF.md
  fixtures/
    minimal-startup-race-react/
    minimal-startup-race-client/
    timeout-restart-repro/
    color-kit-plane-api-repro/
    heavy-timeout-disconnect-repro/
  notes/
  scripts/
  vendor/
    sandpack/               # tracked Sandpack source of truth
```

Why this shape:

- cloud agents only need write access to one repo.
- `vendor/sandpack/` keeps Sandpack edits under the same control plane as the fixtures and notes.
- `fixtures/` can be messy, app-specific, and disposable without needing a second writable remote.
- `color-kit-plane-api-repro/` can stay focused on validation rather than discovery.

## Bootstrap / Environment Caveats

- use Node 20.x in this workspace
- install vendored dependencies via `pnpm install:vendor`
- do not use bare `yarn` in `vendor/sandpack`; use the wrapper script and Yarn classic `1.22.19`
- build `sandpack-client`, `sandpack-react`, and `sandpack-themes` before using the fixtures
- use `pnpm check:fixtures` and `pnpm build:fixtures` for repo-wide validation; `pnpm turbo ...` is not applicable here
- run `pnpm check:fixture-links` after installs or dependency churn; it compares fixture manifest targets, installed symlink targets, and canonical realpaths, and fails if anything resolves outside `vendor/sandpack`. In this workspace, a plain `pnpm install` under Node 20 repaired stale fixture symlinks that had drifted back to the sibling `sandpack/` checkout.
- fixture `dev`, `build`, and `check` scripts now run that link verifier automatically, and `pnpm start:all` does the same before building or launching fixtures

## What We Learned In `color-kit`

### Current integration hotspots

The current Sandpack playground in `color-kit` is under:

- `apps/docs/src/components/plane-api-playground.sandpack.tsx`
- `apps/docs/src/lib/plane-api-playground-source.ts`
- `apps/docs/src/components/plane-api-demos.tsx`

The biggest stressor is that the docs playground injects the full raw `@color-kit/core` source tree into Sandpack:

```ts
const rawCoreSourceFiles = import.meta.glob(
	'../../../../packages/core/src/**/*.{ts,tsx}',
	{
		eager: true,
		import: 'default',
		query: '?raw',
	},
) as Record<string, string>;
```

The runtime setup is also heavy:

- `template="react-ts"`
- pinned virtual `react` / `react-dom`
- `autorun: true`
- `bundlerTimeOut: 120000`
- `initMode: 'immediate'`
- `recompileMode: 'delayed'`
- explicit `sandpack.runSandpack()` on mount
- manual `Refresh` remount via `key={refreshNonce}`

Relevant current behavior:

- the code snippet is derived from `plane-api-playground.demo.tsx`
- `plane-api-playground-source.ts` rewrites `@color-kit/core` imports to `./color-kit-core/index.ts`
- `Open Sandbox` is a custom POST flow, not Sandpack's default UI

That means this repo is stressing:

- large virtual file graphs
- import rewriting
- Sandpack React lifecycle behavior
- preview remount behavior
- CodeSandbox export payload mapping

### Important distinction: app bugs vs upstream bugs

Not everything observed in `color-kit` is a Sandpack root-cause bug.

Consumer-side bugs:

- `Open Sandbox` invalid responses were caused by app-level export mapping details
- some simplified branch failures were caused by consumer file-path rewrites

Likely upstream/runtime bugs:

- preview not reflecting editor changes reliably
- preview timing out and disconnecting
- restart/refresh leaving a white or blank pane
- long-lived or large sandboxes becoming unrecoverable

Do not mix those two categories in the fork work.

## Results From The Four Tracks

These results are worth carrying into the new project so you do not repeat already-tested assumptions.

### 1. Simplify current Sandpack

Branch:

- `feat/plane-playground-simplify-sandpack`

What it proved:

- reducing compile surface can materially shrink the Sandpack chunk
- the branch built with a `plane-api-playground.sandpack` chunk around `623 kB` minified

What it did not prove:

- it did not yield a working live playground in the browser
- the tested branch still failed on module-path resolution in the preview

Conclusion:

- compile-surface reduction helps performance footprint
- it is not enough, by itself, to resolve the core runtime instability

### 2. Experimental bundler

Branch:

- `feat/plane-playground-experimental-bundler`

What it proved:

- simply switching to the experimental bundler did not solve the reliability problem

Observed behavior:

- browser testing still ended in `Couldn't connect to server`
- the overlay reported `ERROR: TIME_OUT`

Conclusion:

- the experimental bundler is not a drop-in fix for this failure class

### 3. Custom runtime replacement

Branch:

- `feat/plane-playground-custom-runtime`

What it proved:

- a constrained editor plus deterministic local preview is much more stable for this use case
- it avoided Sandpack entirely and removed the external bundler/runtime failure mode

Observed behavior:

- first render worked
- repeated hue edits updated reliably
- `Reset` recovered cleanly

Conclusion:

- this is the right shipping choice for `color-kit`
- it also lowers the pressure on the upstream fork work, because the app no longer has to block on Sandpack

### 4. Root-cause / fork feasibility

Branch:

- `feat/plane-playground-sandpack-root-cause`

What it tested:

- replacing the full raw core source tree with a compiled core bundle

What it proved:

- packaging alone is probably not the main root cause
- chunk size stayed large, around `844 kB` minified for the Sandpack chunk
- browser behavior still reproduced the key instability:
  - edit did not clearly recompile the preview
  - manual `Refresh` could blank the preview white

Conclusion:

- a simple consumer-side packaging tweak is not enough
- if Sandpack is going to be fixed, the interesting work is in update queueing, timeout cleanup, client restart, service worker / preview reset, or related runtime flow

## Why `sandunpack` Should Exist

The point of `sandunpack` is not "replace `color-kit` as a repro."

The point is:

- isolate Sandpack-specific bugs in smaller fixtures
- keep a realistic hostile consumer case around for validation
- build and test fork patches without distracting the product repo
- create upstreamable PRs with narrow scope and clean reproductions

`color-kit` should remain the "real-world validation fixture", not the first place you debug.

## Upstream Docs And Issues To Read First

Start here before writing code:

- Sandpack client docs: <https://sandpack.codesandbox.io/docs/advanced-usage/client>
- Race condition when updating files during recompile: <https://github.com/codesandbox/sandpack/issues/1181>
- Issues after Sandpack times out and restart breaks: <https://github.com/codesandbox/sandpack/issues/1063>
- Server timeout issue with workers / large instances / idle tabs: <https://github.com/codesandbox/sandpack/issues/920>
- Fix timeout cleanup on syntax error: <https://github.com/codesandbox/sandpack/pull/1087>
- Fix loading message / bundler coordination: <https://github.com/codesandbox/sandpack/pull/1157>
- Bundler update in client package: <https://github.com/codesandbox/sandpack/pull/1160>
- Service worker fix for transpiled files: <https://github.com/codesandbox/sandpack/pull/1196>

Focus on these Sandpack client APIs from the docs:

- `loadSandpackClient`
- `updateSandbox`
- `updateOptions`
- `listen`
- `dispatch`
- `getCodeSandboxURL`
- `bundlerURL`

Those APIs are the best entry point for building a minimal harness that bypasses `sandpack-react` and lets you determine whether the bug is:

- in the React wrapper lifecycle
- in the client/runtime contract
- in preview iframe reset and service worker behavior

## Primary Hypotheses

The research should start with concrete hypotheses, not a broad "make Sandpack reliable" effort.

### Hypothesis 1: file updates are dropped while the client is initializing or recompiling

Why this matters:

- it matches the editor/preview divergence
- it lines up directly with issue `#1181`
- it explains cases where the editor visibly changes but the preview never catches up

Likely areas:

- update queueing
- conditions that skip file propagation while client status is `initializing`
- missing replay of the latest queued file state after compile completes

### Hypothesis 2: timeout and restart cleanup is incomplete

Why this matters:

- it matches the white pane after `Refresh`
- it matches issue `#1063`
- it matches the "Try again does not truly recover" reports in `#920`

Likely areas:

- timeout registration and clearing
- client disposal and recreation
- preview iframe URL reuse vs regeneration
- stale listeners or stale client references

### Hypothesis 3: large instances or long-lived instances break preview/runtime connectivity

Why this matters:

- it matches the idle-tab and large-instance reports in `#920`
- `color-kit` is a large and complex consumer
- even if file-update races are fixed, large-instance reliability may still fail

Likely areas:

- service worker behavior
- runtime ping / beacon logic
- preview URL lifetime or reconnect path
- browser-specific lifecycle behavior after inactivity

### Hypothesis 4: some failures are consumer-only and should stay out of the fork

Why this matters:

- not every observed error belongs upstream
- you should avoid spending fork time on problems that are really consumer integration details

Known consumer-only area:

- CodeSandbox export environment mapping for `react-ts` / `react` templates

## Phase Plan

## Phase 0: verify the existing workspace

Deliverables:

- existing `sandunpack/` workspace verified
- vendored Sandpack source verified under `sandunpack/vendor/sandpack`
- dependencies installed
- fixture/package realpaths verified
- upstream docs / tests runnable where applicable

Checklist:

1. Verify `vendor/sandpack` is present and in the expected repo state.
2. Run `pnpm check:fixture-links`; reinstall if it reports stale fixture links or any resolution outside `vendor/sandpack`.
3. Keep any direct upstream clone optional and outside the control flow.
4. Verify the repo builds and fixture checks pass before making any changes.
5. Keep this handoff file updated in the workspace root as findings land.

Success criterion:

- clean baseline build in the fork before any local modifications

## Phase 1: freeze the known evidence

Deliverables:

- a short `notes/baseline.md`
- links to upstream issues and PRs
- screenshots or short notes of the current `color-kit` symptoms

Record:

- editor changes not affecting preview
- white pane after refresh
- `Couldn't connect to server` / `TIME_OUT`
- large injected file graph in `color-kit`
- custom runtime chosen as shipping fallback

The point is to avoid re-learning the same history after a few days.

## Phase 2: use and refine the three fixtures

### Fixture A: minimal startup race

Purpose:

- keep a small deterministic baseline for startup/update behavior
- distinguish repro/harness bugs from real Sandpack runtime bugs

Status:

- both versions already exist: `minimal-startup-race-react` and `minimal-startup-race-client`
- the React wrapper fixture was fixed and merged as a harness issue; treat it as a cleaned baseline, not proof of a Sandpack-core startup/update bug
- the low-level client fixture was the right place to re-run the startup-race question after the React harness cleanup
- current result: baseline startup is single-pass and succeeds in `minimal-startup-race-client`
- current result: `VITE_STRICT_MODE=true` duplicates initialization work in `minimal-startup-race-client`, but does not currently produce a stale preview or dropped update
- there is now a vendor-side regression test proving that unmounted preview registrations must be dropped before a later `runSandpack()`
- there is now a vendor-side regression test proving that overlapping `runSandpack()` calls must not initialize the same registered client twice
- current result: after the `runSandpack()` in-flight guard, strict-mode browser startup no longer shows duplicate client initialization in the `sandpack-react` fixtures

Shape:

- React app
- one file initially blank or template-default
- update to real code shortly after initialization
- compare editor state vs preview state
- keep `React.StrictMode` off unless double-mount behavior is the explicit thing under test
- use `VITE_STRICT_MODE=true` when intentionally testing that double-mount path; the repro fixtures now wire that toggle through both the host mount and the iframe entrypoint

Maintain both forms:

- `sandpack-react` wrapper fixture
- low-level `sandpack-client` fixture

### Fixture B: timeout / restart repro

Purpose:

- reproduce timeout plus bad recovery behavior

Status:

- the non-Strict baseline already reproduces the timeout path with single-pass startup work
- the non-Strict baseline remains the best control for timeout work
- treat StrictMode as a stress variant here, not as the baseline control
- after timeout, dispatch-based `refresh` and `shell/restart` are skipped because the provider is no longer `running`
- `sandpack.runSandpack()` and a full remount both recreate clients after timeout; if the timeout budget is increased, both recovery paths succeed in the small repro
- this matches vendored UI behavior: the built-in timeout `LoadingOverlay` uses `runSandpack()` for `Try again`, and the normal Preview refresh button is only shown while status is `running`
- no timeout cleanup or client-recreation bug is proven yet in the small repro when the rerun path gets a realistic timeout budget
- the recent `runSandpack()` in-flight guard removed the browser-visible same-client duplicate initialization that strict mode was surfacing in the `sandpack-react` fixtures
- preview diagnostics confirm that timeout cleanup clears the live preview URL and iframe `src`, so seeing `none` there after timeout is expected in this small repro
- `runSandpack()` keeps the same preview client id, while `Remount sandbox` creates a fresh one; both paths look consistent with the current vendored cleanup logic
- because this fixture now looks mostly correct, it should be treated as a control for timeout lifecycle checks rather than proof of a remaining Sandpack reconnect bug by itself

Shape:

- intentionally heavy or slow-to-evaluate example
- explicit restart button
- instrumentation around timeout registration, client recreation, and preview reload
- prioritize preview reset, reconnect behavior, and preview URL state over generic "can any new client be created?" checks, since the basic rerun/remount path already works here
- the current timeout fixture does not enable Sandpack's experimental service-worker mode, so service-worker lifecycle is probably not part of this specific small repro

### Fixture C: `color-kit`-style heavy repro

Purpose:

- validate whether a fix survives a real consumer case

Status:

- the compact `color-kit-plane-api-repro` fixture no longer reproduces a clear lifecycle bug after the latest harness dedupes
- baseline and `VITE_STRICT_MODE=true` both now show single mount/update/remount events in browser logs
- the fixture currently behaves more like a heavy validation harness than an active bug repro
- `Remount preview` replays the current state after remount; that is current fixture behavior, not by itself evidence of a stale-preview failure
- hosted-bundler availability can still leave the preview stuck at `waiting`, so treat this fixture as evidence about local lifecycle ordering first and full end-to-end connectivity second

Shape:

- derived from the Plane API playground
- can be smaller than the full docs app
- should preserve the important stresses:
  - multiple hidden files
  - import rewriting
  - `react-ts` template
  - manual refresh semantics

Important:

- do not try to clone the entire `color-kit` repo into `sandunpack`
- make a compact fixture that captures the failure mode, not the whole product

### Fixture D: heavy timeout / disconnect repro

Purpose:

- create a heavier active probe for timeout, idle, and reconnect behavior without turning `color-kit-plane-api-repro` back into the primary bug repro

Status:

- `heavy-timeout-disconnect-repro` combines the compact `color-kit` file-graph style with heavy external dependencies, guarded manual `runSandpack()`, rerun/remount controls, and live preview diagnostics
- the current harness size is 84 virtual files plus several external packages
- first browser smoke already shows a fresh `react:register-bundler` event reaching client status `idle` after remount while the preview label can remain `waiting` and preview URL / iframe `src` can remain `none`
- the diagnostics are now trustworthy enough to compare UI client id/status with lifecycle logs after rerun, remount, and manual probe
- timeout-budget matrix findings are now specific enough to guide patching:
  - `4000`: manual `runSandpack()` starts dependency installation and then times out as expected
  - `12000`: remount leaves the client `idle`; dispatch refresh/restart do nothing with `clientIds: []`; manual `runSandpack()` starts the client and populates iframe `src`
  - `30000`: remount still leaves the client `idle`; manual `runSandpack()` registers the timeout but can remain in `installing-dependencies` for 43s+ without a timeout event
- the vendored timeout debug stream is now more specific too: it reports timeout clears from runtime-message paths, which should make the next heavy `30000` comparison much more conclusive
- there is now also a focused `useClient` regression test for rerunning the same registered client under a timeout budget, and the current patch keeps the timeout armed in that rerun path instead of silently dropping the provider-global timeout/listener lifecycle
- because hosted-bundler availability is still external, use this fixture to separate local lifecycle state from upstream service availability in larger sandboxes

Shape:

- keep the `color-kit`-style hidden file graph and import rewriting
- keep explicit `runSandpack()`, refresh/restart, and remount controls
- expose preview client id, client status, preview URL, iframe `src`, last `urlchange`, and last probe
- use timeout-budget comparisons and retry-path differences first; only add more stressors if this fixture stops differentiating from generic hosted-bundler waiting

## Phase 3: instrument before patching

Do not start with blind fixes.

Add instrumentation around:

- client creation and disposal
- client status transitions
- file update enqueue / dequeue behavior
- timeout registration / clearing
- preview reload / restart actions
- message flow between parent and preview / bundler
- any explicit service worker or preview URL state you can observe

Useful places to inspect first:

- `sandpack-react` client lifecycle utilities
- update propagation paths from editor state to client
- timeout handling logic
- restart / rerun paths
- preview reset logic

The ideal output of this phase is a trace answering:

- was the latest file state actually sent?
- if yes, was it ignored?
- if ignored, why?
- after timeout, was a new client actually created?
- if yes, why did the preview remain stale or blank?

## Phase 4: patch one bug class at a time

Do not mix several root-cause theories into one branch.

Suggested branch sequence inside the fork:

- `research/baseline-instrumentation`
- `fix/timeout-hard-reset`
- `fix/reconnect-after-timeout`
- `fix/update-queue-after-init` only if the low-level startup-race fixture still proves a real dropped-update bug after the harness cleanup

Patch ideas worth testing:

### Patch candidate A: replay latest file updates after initialization

Intent:

- if file changes arrive while the client is initializing, keep the latest pending state and replay it once the client is ready

Why promising:

- directly addresses `#1181`

Caution:

- the merged `minimal-startup-race-react` fix was a repro-level harness cleanup, so treat queue-after-init as a hypothesis that still needs proof, not as the current leading cause
- do not start here unless the low-level `sandpack-client` fixture still reproduces a real dropped or ignored update after initialization

### Patch candidate B: hard reset preview/runtime after timeout

Intent:

- when a timeout occurs, perform a stronger teardown/recreate flow instead of a shallow restart

Why promising:

- directly addresses white/blank pane recovery
- aligns with `#1063` and `#920`

### Patch candidate C: make disconnect state explicit and actionable

Intent:

- ensure timeout/disconnect state blocks stale optimism and leads to a real reconnect path

Why promising:

- users should not be left in a state where edits appear to succeed but nothing is truly connected

Avoid this first:

- large architectural rewrites
- changing hosted bundler infrastructure
- deep service worker redesign before a smaller patch is disproven

## Phase 5: validate the patch matrix

A patch is not real until it passes both minimal and hostile fixtures.

Minimum validation matrix:

- first render works
- editor changes update preview
- five successive edits do not desync
- manual refresh or restart recovers without white pane
- idle tab scenario does not permanently wedge the preview
- heavy fixture does not regress into immediate `TIME_OUT`

Run each candidate patch against:

- Fixture A: minimal startup race
- Fixture B: timeout / restart repro
- Fixture C: `color-kit` heavy repro

If a patch only fixes the tiny repro and fails on the heavy fixture, it is not ready.

## Phase 6: consume the fork locally before publishing anything

Do this first:

- workspace linking
- local package overrides
- whatever the new workspace uses for local dependency replacement

Do not do this first:

- publish `@your-scope/sandpack-react`
- publish `@your-scope/sandpack-client`

Only publish a scoped temporary fork if:

- the patch is stable in all three fixtures
- the consuming app really needs it now
- the upstream PR is small and already in flight

## Phase 7: upstream PR strategy

If a fix works, upstream it quickly and narrowly.

Rules:

- one bug class per PR
- include a minimal reproduction
- keep consumer-specific code out of the PR
- explain how the patch behaved in the heavier `color-kit`-style fixture, but do not require maintainers to run that fixture to review the fix

Good PR shape:

- `fix(react): replay queued file updates after init`
- `fix(client): fully recreate preview client after timeout`

Bad PR shape:

- `fix: make sandpack stable for our docs site`

## Kill Criteria

Do not let this turn into an unbounded fork project.

Stop and keep the custom runtime approach if any of these become true:

- the likely fix requires hosted infrastructure control rather than repo changes
- no small deterministic repro can be built outside `color-kit`
- the patch spans too many layers at once
- the fork only works with consumer-specific hacks that are unlikely to land upstream
- the maintenance burden is obviously larger than the benefit to this one project

## Short-Term Recommendation For `color-kit`

Treat the custom runtime as the product path and treat `sandunpack` as research.

That reduces pressure and lets the fork work be judged honestly.

The new `useClient` refresh/remount fix is promising and passes the focused real-app smoke in `color-kit`, but broader manual validation is still the bar before changing that recommendation.

The right order is:

1. ship or preserve the custom runtime in `color-kit`
2. keep `sandunpack` as the research workspace and verify the linked Sandpack path before each patch run
3. prove a narrow Sandpack fix there
4. validate it with a `color-kit`-derived fixture
5. only then decide whether a temporary maintained fork is worth using

## Suggested Prompt For The New Agent

Copy this into the `sandunpack` workspace if helpful:

```text
You are working in the `sandunpack` control repo. Your job is to investigate Sandpack root causes and validate targeted fixes in the vendored `vendor/sandpack/` source tree, while keeping `color-kit` as a validation fixture rather than the main debugging environment.

Start by reading `HANDOFF.md`.

Goals:
- work from the existing vendored fork and fixture workspace
- use the existing minimal startup-race, timeout/restart, and compact color-kit-plane-api repros
- instrument Sandpack before patching
- test whether bugs live in `sandpack-react`, `sandpack-client`, timeout/restart logic, or preview/service-worker flow
- create one patch branch per bug class
- validate every patch against all fixtures
- prepare small upstreamable PRs if a patch proves out

Constraints:
- do not start by publishing a scoped fork package
- do not treat `color-kit` as the only repro
- do not bundle several speculative fixes into one branch
- keep notes in the workspace so future agents do not repeat discovery work

Start with:
1. verify `vendor/sandpack/` and run `pnpm check:fixture-links` before assuming a vendored patch is active
2. read the Sandpack client docs and issues listed in `HANDOFF.md`
3. extend the existing startup-race fixtures instead of rebuilding them from scratch
4. instrument update queueing and timeout/restart flow before attempting code changes
```

## Final Reminder

The key strategic choice is this:

- `color-kit` should be the place where fixes are validated
- `sandunpack` should be the place where Sandpack is understood, isolated, patched, and prepared for upstream contribution

That split is the best chance of learning something reusable without tying the product repo to a long exploratory fork.
