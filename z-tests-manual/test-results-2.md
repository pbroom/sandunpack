# Test Results 2

## Summary So Far

- `core-only`, `date-fns`, `framer-motion`, and `emotion-bundle` all pass cleanly.
- `mui-bundle` and `full` fail with the same early `message-show-error` dependency-fetch failure.
- `emotion-bundle` passing means Emotion alone is not enough to reproduce the problem.
- The current failure boundary is the point where `@mui/material` joins the bundle.
- Next isolation round: compare `mui-system-bundle`, `mui-bundle-v5`, and `mui-bundle`.

## emotion-bundle

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
emotion-bundle
Dependency count
4
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:00.7
Run timer remaining
0:29.2
Run timer last event
client:runtime:dispatch
Last timeout register
18:56:30.494Z client=1b124c timeout=30000ms
Last timeout clear
18:56:31.268Z reason=message-done client=1b124c global=1b124c msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
1b124c
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

## core-only

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
core-only
Dependency count
2
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:00.7
Run timer remaining
0:29.2
Run timer last event
react:update:debounce-schedule
Last timeout register
18:54:34.361Z client=1b131a timeout=30000ms
Last timeout clear
18:54:35.142Z reason=message-done client=1b131a global=1b131a msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
1b131a
Preview client status
done
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

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
0:07.5
Run timer remaining
0:22.4
Run timer last event
react:update:debounce-schedule
Last timeout register
18:55:24.834Z client=1b1278 timeout=30000ms
Last timeout clear
18:55:32.427Z reason=message-show-error client=1b1278 global=1b1278 msg=action action=show-error
Timeout-clearing error
18:55:32.427Z reason=message-show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last timeout fired
none
Last show-error
18:55:33.270Z kind=show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last notification
18:55:33.270Z kind=notification title=Could not fetch dependencies, please try again in a couple seconds: path=- message=-
Preview client id
1b1278
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
