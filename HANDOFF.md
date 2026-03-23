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
- That merged harness fix stabilized `SandpackProvider` props, deduped debug-log rerenders, corrected the template update path from `'/src/App.tsx'` to `'/App.tsx'`, stabilized delayed update scheduling, and removed `React.StrictMode` from the React wrapper fixture.
- No vendored `Sandpack` patch has been proven by that merged change yet.
- The next highest-value investigations are `minimal-startup-race-client`, `timeout-restart-repro`, and verifying which Sandpack tree the fixtures are actually executing.

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
- the fixture manifests point at `vendor/sandpack`, but installed links may still resolve to a sibling `sandpack/` clone from an older install, so verify package realpaths before assuming a vendored patch is active

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
2. Confirm which realpath the linked fixture packages resolve to, and reinstall if `node_modules` still points at a sibling `sandpack/` clone.
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
- the low-level client fixture is the better next place to prove or disprove a real initialization/update race

Shape:

- React app
- one file initially blank or template-default
- update to real code shortly after initialization
- compare editor state vs preview state
- keep `React.StrictMode` off unless double-mount behavior is the explicit thing under test

Maintain both forms:

- `sandpack-react` wrapper fixture
- low-level `sandpack-client` fixture

### Fixture B: timeout / restart repro

Purpose:

- reproduce timeout plus bad recovery behavior

Shape:

- intentionally heavy or slow-to-evaluate example
- explicit restart button
- instrumentation around timeout registration, client recreation, and preview reload

### Fixture C: `color-kit`-style heavy repro

Purpose:

- validate whether a fix survives a real consumer case

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
1. verify `vendor/sandpack/` and confirm which realpath the linked fixture packages currently resolve to
2. read the Sandpack client docs and issues listed in `HANDOFF.md`
3. extend the existing startup-race fixtures instead of rebuilding them from scratch
4. instrument update queueing and timeout/restart flow before attempting code changes
```

## Final Reminder

The key strategic choice is this:

- `color-kit` should be the place where fixes are validated
- `sandunpack` should be the place where Sandpack is understood, isolated, patched, and prepared for upstream contribution

That split is the best chance of learning something reusable without tying the product repo to a long exploratory fork.
