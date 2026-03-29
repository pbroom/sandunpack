# Upstream Draft: `@mui/types@7.4.12` Packager Failure

## Issue Draft

Title: `@mui/types@7.4.12` fails in Sandpack hosted dependency install; this breaks `@mui/system@7.3.9`

The hosted Sandpack dependency-fetch failure that first appeared at `@mui/system@7.3.9` is now reducible to `@mui/types@7.4.12`.

As of March 28, 2026:

- `@mui/system@7.3.8` passes
- `@mui/system@7.3.9` fails with:
  `Could not fetch dependencies, please try again in a couple seconds:`
- `@mui/types@7.4.11` passes
- `@mui/types@7.4.12` alone reproduces the same failure

Minimal repro:

1. Run the heavy control fixture with:
   `VITE_SANDPACK_DEBUG=true pnpm dev:heavy-timeout-disconnect`
2. Select dependency profile:
   `mui-types-v7.4.12`
3. Click `Call runSandpack()`

Actual result:

- Sandpack shows:
  `Could not fetch dependencies, please try again in a couple seconds:`
- The timeout is cleared by `message-show-error`
- Preview stays `waiting`
- Preview client stays `installing-dependencies`

Passing control:

- Select `mui-types-v7.4.11`
- Click `Call runSandpack()`
- Preview renders successfully and the timeout clears via `message-done`

Concrete network evidence:

- Passing:
  `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.11.json`
  returns `200`
- Failing:
  `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.12.json`
  returns `403 AccessDenied`

During the failing browser run we also observed:

- `GET https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Ftypes%407.4.12`
  returns `500`

Why this breaks `@mui/system@7.3.9`:

- `@mui/system@7.3.8` depends on `@mui/types@^7.4.11`
- `@mui/system@7.3.9` depends on `@mui/types@^7.4.12`
- `@mui/utils@7.3.9` also depends on `@mui/types@^7.4.12`
- `@mui/types@7.4.12` appears to be the exact package version that the hosted CodeSandbox package pipeline cannot serve

Important caveat:

- This does **not** look like a new MUI runtime-code incompatibility.
- The tarball diff between `@mui/types@7.4.11` and `7.4.12` is effectively metadata/comments/types only.
- CDN endpoints like unpkg and jsDelivr serve the `7.4.12` files, but the CodeSandbox package artifact endpoint does not.

Most likely root cause:

- The hosted CodeSandbox packager pipeline is missing or denying access to the generated package artifact for `@mui/types@7.4.12`
- Sandpack then surfaces that as the generic dependency-fetch failure

Suggested fixes:

1. CodeSandbox / Sandpack hosted packager
   Restore or regenerate the artifact for:
   `https://prod-packager-packages.codesandbox.io/v2/packages/@mui/types/7.4.12.json`

2. Temporary MUI-side mitigation
   Roll back the `@mui/types` dependency range in the `7.3.9` line until the packager issue is fixed.

3. Optional UX improvement
   Include the failing dependency name/version in the surfaced Sandpack error when the packager knows it

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
