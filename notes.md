# notes

## Todo

1. Fix or explain the package-source mismatch first. Right now the fixture manifests target vendor/sandpack, but the installed links still resolve to sandpack/.... Until that is reconciled, vendor edits can be silently tested against the wrong source tree.
2. Normalize StrictMode across the repros, especially fixtures/minimal-startup-race-client and fixtures/timeout-restart-repro, so comparisons are apples-to-apples.
3. Re-run the startup-race question in fixtures/minimal-startup-race-client. That is now the best place to prove whether there is still a real client/init/update race after the React harness cleanup.
4. Put most effort into fixtures/timeout-restart-repro next. That still looks like the highest-value path for a real Sandpack fix: timeout cleanup, client recreation, preview reset, reconnect behavior, and service-worker/preview URL lifecycle.
5. Only validate on fixtures/color-kit-plane-api-repro after a vendored fix survives the smaller repros.
