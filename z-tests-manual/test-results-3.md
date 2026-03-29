# Test Results 3

## Summary So Far

- `mui-system-bundle` fails with the same early `message-show-error` dependency-fetch failure as `mui-bundle`.
- `mui-bundle-v5` passes cleanly.
- `mui-system-bundle` failing means `@mui/material` is not required to reproduce the problem; shared MUI core is enough on the current latest line.
- `mui-bundle-v5` passing means the failure is unlikely to be raw dependency count and may be specific to the newer MUI core line rather than Material in general.
- Next isolation round: test `mui-system-v6` to see whether the break starts in MUI 6 shared core or only in the current 7.x line.

## mui-system-bundle

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
Could not fetch dependencies, please try again in a couple seconds:
Dependency profile
mui-system-bundle
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:03.9
Run timer remaining
0:26.0
Run timer last event
react:update:debounce-schedule
Last timeout register
19:06:43.898Z client=1b1292 timeout=30000ms
Last timeout clear
19:06:47.859Z reason=message-show-error client=1b1292 global=1b1292 msg=action action=show-error
Timeout-clearing error
19:06:47.859Z reason=message-show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last timeout fired
none
Last show-error
19:06:52.310Z kind=show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last notification
19:06:52.310Z kind=notification title=Could not fetch dependencies, please try again in a couple seconds: path=- message=-
Preview client id
1b1292
Preview client status
installing-dependencies
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

## mui-bundle-v5

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
mui-bundle-v5
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:01.4
Run timer remaining
0:28.5
Run timer last event
client:runtime:dispatch
Last timeout register
19:07:31.654Z client=1b1250 timeout=30000ms
Last timeout clear
19:07:33.150Z reason=message-done client=1b1250 global=1b1250 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
1b1250
Preview client status
done
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:client:runtime:dispatch

## mui-bundle

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
Could not fetch dependencies, please try again in a couple seconds:
Dependency profile
mui-bundle
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:05.9
Run timer remaining
0:24.0
Run timer last event
react:update:debounce-schedule
Last timeout register
19:08:10.450Z client=1b1258 timeout=30000ms
Last timeout clear
19:08:16.424Z reason=message-show-error client=1b1258 global=1b1258 msg=action action=show-error
Timeout-clearing error
19:08:16.424Z reason=message-show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last timeout fired
none
Last show-error
19:08:17.226Z kind=show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last notification
19:08:17.226Z kind=notification title=Could not fetch dependencies, please try again in a couple seconds: path=- message=-
Preview client id
1b1258
Preview client status
installing-dependencies
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule
