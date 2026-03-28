# Test Results 7

## Summary So Far

- These results focus on the browser-side / hosted-packager path behind the `@mui/system@7.3.9` failure.
- The first failing network step for the original `@mui/system@7.3.9` repro is not a compile step inside the app code. It is the hosted package-manifest generation path:
  - `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/system/7.3.9.json` returns `403 AccessDenied`
  - Sandpack then falls back to `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Fsystem%407.3.9`
  - That fallback returns `500 {"error":"Something went wrong while packaging the dependency @mui/system@7.3.9: Cannot read properties of null (reading 'browser')"}`
- The host UI only surfaces the generic `Could not fetch dependencies, please try again in a couple seconds:` message. The specific `null.browser` root cause is visible in browser network inspection, not in the Sandpack `show-error` message.
- Raw `postMessage` capture shows the host does receive a `console` error with `Error: 500`, but it still does not receive the API response body. So the detailed upstream error is already lost before it reaches the generic `show-error` overlay.
- Direct packager probes show this is broader than a single `@mui/system@7.3.9` tarball. The package-generation endpoint already fails on direct requests for several MUI shared-core packages:
  - `@mui/private-theming@7.3.8` -> `500 null.browser`
  - `@mui/private-theming@7.3.9` -> `500 null.browser`
  - `@mui/styled-engine@7.3.9` -> `500 null.browser`
  - `@mui/utils@7.3.9` -> `500 null.browser`
  - `@mui/types@7.4.12` -> `500 null.browser`
- That means `@mui/system@7.3.9` looks like the first visible hosted failure because it misses the prebuilt packager cache and is forced through a package-generation path that is already broken for the newer MUI shared-core family.
- Current patch recommendation for upstream:
  - real fix: patch the hosted package generator to stop dereferencing `.browser` on a null package record and add regression coverage for the direct package-generation POSTs above
  - diagnostics fix: include upstream status/body in the emitted `show-error` payload instead of collapsing everything to the generic dependency-fetch message

## Browser Control: `mui-system-v7.3.8`

Heavy repro path

- Start: `VITE_SANDPACK_DEBUG=true pnpm dev:heavy-timeout-disconnect`
- Select dependency profile: `mui-system-v7.3.8`
- Click: `Call runSandpack()`

Observed metrics

- Error message: `none`
- Last timeout clear: `reason=message-done`
- Preview label: `hue-210`
- Preview client status: `done`

Key network evidence

- `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/system/7.3.8.json` -> `200`
- Direct control probe: `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Fsystem%407.3.8` -> `200 {"url":"v2/packages/@mui/system/7.3.8.json"}`

Interpretation

- The passing control stays on the healthy cached / package-generation path and reaches a normal `done` lifecycle.

## Browser Failure: `mui-system-bundle` (`@mui/system@7.3.9`)

Heavy repro path

- Start: `VITE_SANDPACK_DEBUG=true pnpm dev:heavy-timeout-disconnect`
- Select dependency profile: `mui-system-bundle`
- Click: `Call runSandpack()`

Observed metrics

- Error message: `Could not fetch dependencies, please try again in a couple seconds:`
- Last timeout clear: `reason=message-show-error`
- Timeout-clearing error: `title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:`
- Preview label: `waiting`
- Preview client status: `done`

Raw host messages

- `status: installing-dependencies`
- `dependencies: downloading_manifest`
- `dependencies: downloaded_module ... name=@mui/system`
- `action: notification` with title `Could not fetch dependencies, please try again in a couple seconds:`
- `action: show-error` with the same generic message
- `console.error` with `Error: 500`

Key network evidence

- `GET https://prod-packager-packages.codesandbox.io/v2/packages/@mui/system/7.3.9.json` -> `403 AccessDenied`
- `POST https://aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com/prod/packages/%40mui%2Fsystem%407.3.9` -> `500`

Response body

```json
{"error":"Something went wrong while packaging the dependency @mui/system@7.3.9: Cannot read properties of null (reading 'browser')"}
```

Interpretation

- The original hosted dependency-fetch failure is actually a hosted package-generator failure on cache miss.
- The browser-side `show-error` message hides the concrete packager exception.

## Direct Package-Generation Probes

These are straight `curl -X POST` probes against the same hosted package-generation endpoint the browser falls back to after a cache miss.

Passing controls

- `@mui/system@7.3.8` -> `200`
- `@mui/styled-engine@7.3.8` -> `200`
- `@mui/utils@7.3.8` -> `200`
- `@mui/types@7.4.11` -> `200`

Failing probes

- `@mui/system@7.3.9` -> `500 null.browser`
- `@mui/private-theming@7.3.8` -> `500 null.browser`
- `@mui/private-theming@7.3.9` -> `500 null.browser`
- `@mui/styled-engine@7.3.9` -> `500 null.browser`
- `@mui/utils@7.3.9` -> `500 null.browser`
- `@mui/types@7.4.12` -> `500 null.browser`

Related cache lookups

- `GET .../@mui/system/7.3.8.json` -> `200`
- `GET .../@mui/system/7.3.9.json` -> `403`
- `GET .../@mui/utils/7.3.8.json` -> `200`
- `GET .../@mui/utils/7.3.9.json` -> `403`
- `GET .../@mui/types/7.4.11.json` -> `200`
- `GET .../@mui/types/7.4.12.json` -> `403`
- `GET .../@mui/private-theming/7.3.8.json` -> `403`
- `GET .../@mui/private-theming/7.3.9.json` -> `403`

Interpretation

- The hosted generator already has a latent failure on at least part of the MUI shared-core family.
- `@mui/system@7.3.9` becomes the first visible top-level repro because its top-level manifest is not prebuilt in the cache and therefore hits the broken generation path directly.

## Upstream-Ready Statement

The minimal browser-side statement is now:

- `@mui/system@7.3.8` passes because the hosted packager has a usable manifest path for that version.
- `@mui/system@7.3.9` fails because the hosted packager falls back from a missing cached manifest (`403`) into a package-generation endpoint that returns `500 Cannot read properties of null (reading 'browser')`.
- Sandpack then reduces that concrete upstream failure to the generic `Could not fetch dependencies...` message.

That is a much stronger upstream report than “MUI 7.3.9 fails somehow”: it identifies the exact hosted request boundary, the hidden 500 body, the family of directly failing MUI shared-core packages, and the two separate fix targets (real generator fix vs better error propagation).
