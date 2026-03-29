# Upstream Draft: Hosted `@mui/types@7.4.12` Packager Failure

## Filed Issue

- `codesandbox/sandpack#1296`
- `https://github.com/codesandbox/sandpack/issues/1296`

## Recommended Target

- Primary upstream: `codesandbox/sandpack`
- Secondary context only: if MUI wants a temporary mitigation, point them at the manifest rollback sketch below, but keep root-cause ownership on the hosted CodeSandbox package pipeline.

## Issue Draft

Title: `Hosted package pipeline cannot serve @mui/types@7.4.12 (breaks @mui/system@7.3.9 installs)`

# Bug report

## Packages affected

- [ ] sandpack-client
- [x] sandpack-react

## Description of the problem

A hosted dependency-install failure that first looked like an `@mui/system@7.3.9` regression reduces cleanly to the hosted package pipeline being unable to serve `@mui/types@7.4.12`.

This still reproduces as of March 29, 2026 with the default hosted package flow (no custom registry):

- `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.11.json` -> `200`
- `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.12.json` -> `403 AccessDenied`
- `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Ftypes%407.4.11` -> `200 {"url":"v2/packages/@mui/types/7.4.11.json"}`
- `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Ftypes%407.4.12` -> `500 {"error":"Something went wrong while packaging the dependency @mui/types@7.4.12: Cannot read properties of null (reading 'browser')"}`

In the browser UI, Sandpack only surfaces the generic message:

`Could not fetch dependencies, please try again in a couple seconds:`

So the concrete hosted `500` body is lost before it reaches the overlay.

## What were you doing when the problem occurred?

Isolating a hosted dependency-install failure that originally appeared when loading `@mui/system@7.3.9` in a local Sandpack repro fixture.

### What steps can we take to reproduce the problem?

1. Run:
   `VITE_SANDPACK_DEBUG=true pnpm dev:heavy-timeout-disconnect`
2. Select dependency profile:
   `mui-types-v7.4.12`
3. Click:
   `Call runSandpack()`

Actual result:

- Sandpack shows:
  `Could not fetch dependencies, please try again in a couple seconds:`
- Preview stays `waiting`
- The timeout clears via `message-show-error`

Passing control:

1. Select:
   `mui-types-v7.4.11`
2. Click:
   `Call runSandpack()`

Control result:

- Preview renders successfully
- The timeout clears via `message-done`

### Smaller direct repro

These hosted endpoints reproduce the same split without the fixture:

- `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.11.json` -> `200`
- `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.12.json` -> `403`
- `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Ftypes%407.4.11` -> `200`
- `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Ftypes%407.4.12` -> `500 null.browser`

### Link to sandbox

No public sandbox yet. The direct hosted URL probes above are the smallest reproduction and do not require a custom registry or private package setup.

## Expected behavior

- `@mui/types@7.4.12` should be served/generated the same way `7.4.11` is
- If the hosted packager fails, the surfaced Sandpack error should include the failing package and upstream response details

## Why this breaks `@mui/system@7.3.9`

- `@mui/system@7.3.8` depends on `@mui/types@^7.4.11`
- `@mui/system@7.3.9` depends on `@mui/types@^7.4.12`
- `@mui/utils@7.3.9` also depends on `@mui/types@^7.4.12`
- `@mui/types@7.4.12` alone reproduces the same hosted failure
- The tarball diff between `@mui/types@7.4.11` and `7.4.12` is effectively metadata/comments/types only, so this does not look like a new runtime-code incompatibility in MUI

## Your Environment

| Software                | Name/Version          |
| ----------------------- | --------------------- |
| Sandpack-client version | 2.19.8                |
| Sandpack-react version  | 2.20.0                |
| Browser                 | Chrome                |
| Operating System        | macOS (darwin 25.3.0) |

## Suggested fixes

1. Restore or regenerate the hosted artifact for `https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.12.json`, or fix the generator path that currently throws `Cannot read properties of null (reading 'browser')`.
2. Add regression coverage for direct package-generation requests on the affected MUI shared-core packages.
3. Propagate upstream status/body into the emitted Sandpack `show-error` payload instead of collapsing this to the generic dependency-fetch message.

## Patch Sketch

If MUI wants a short-term mitigation patch in the `7.3.x` line, this is the minimal manifest rollback to try:

```diff
diff --git a/packages/mui-system/package.json b/packages/mui-system/package.json
@@
-    "@mui/types": "^7.4.12",
+    "@mui/types": "^7.4.11",

diff --git a/packages/mui-utils/package.json b/packages/mui-utils/package.json
@@
-    "@mui/types": "^7.4.12",
+    "@mui/types": "^7.4.11",
```

That would keep the `@mui/system@7.3.9` line off the failing `@mui/types@7.4.12` artifact until the hosted packager issue is repaired.
