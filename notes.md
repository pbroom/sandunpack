# notes

## Status

1. Fixed the package-source mismatch. `pnpm install` under Node 20 repointed all fixture links back to `vendor/sandpack`, and `pnpm check:fixture-links`, `pnpm build:vendor`, and `pnpm build:fixtures` now pass against the vendored tree.
2. Normalized StrictMode across the repros. The fixtures now default to a non-Strict baseline in both the host app and the iframe sandbox, with `VITE_STRICT_MODE=true` as an explicit stress toggle.
3. Re-ran the startup-race question in `fixtures/minimal-startup-race-client`. Baseline startup is single-pass and succeeds; StrictMode duplicates initialization work, but the fixture still lands on the expected preview state.
4. Re-ran the timeout/restart question in `fixtures/timeout-restart-repro`. Baseline startup is single-pass and times out; StrictMode duplicates initialization and increases pressure before the same timeout path.
5. Confirmed timeout recovery semantics in the small repro. After timeout, `refresh` and `shell/restart` dispatches are skipped while the provider is not running, but `runSandpack()` and a full remount do create new client attempts. If the timeout budget is raised, both recover successfully.
6. Read the vendored UI paths too. This matches Sandpack's built-in behavior: the timeout `LoadingOverlay` uses `runSandpack()` for `Try again`, and the normal Preview refresh button is only shown while status is `running`.
7. Added a `useClient` regression test and fix for unmounted preview registrations. A live client unmount no longer leaves a stale registration behind that gets recreated on the next `runSandpack()`.
8. Added an in-flight `runSandpack()` guard in `sandpack-react` and a regression test for overlapping runs on the same registered client.
9. Re-checked the StrictMode repros after that fix. The `sandpack-react` fixtures no longer show duplicate client initialization on initial startup in the browser spot-check.

## Next

1. Keep `fixtures/timeout-restart-repro` as the main timeout control, but with the StrictMode replay issue narrowed down: no client-recreation failure is proven yet in the small repro if `runSandpack()` gets a realistic timeout budget.
2. Focus on timeout-specific behavior now: preview reset, reconnect behavior, and preview URL lifecycle in cases that still fail even after explicit rerun or remount. The current timeout fixture does not enable Sandpack's experimental service-worker mode, so service-worker state is probably not part of this small repro.
3. Keep `fixtures/minimal-startup-race-client` as the control fixture unless new baseline evidence shows a real dropped-update race.
4. Only validate on `fixtures/color-kit-plane-api-repro` after a vendored fix survives the smaller repros.
