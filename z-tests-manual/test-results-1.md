# Test Results 1

## Summary So Far

- These results were gathered with the heavy repro default timeout set to `30000`.
- Passing profiles so far: `core-only`, `date-fns`, `framer-motion`.
- Failing profiles so far: `mui-bundle`, `full`.
- Minimal failing profile so far: `mui-bundle`.
- Shared failing signature so far: timeout is armed, then cleared early by `message-show-error` after roughly 6 seconds with `Could not fetch dependencies, please try again in a couple seconds:`, while the preview remains `waiting` and the client remains `installing-dependencies`.
- Current isolation goal: add and test `emotion-bundle` to separate Emotion-only install pressure from the `@mui/material` case.

## full

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
Could not fetch dependencies, please try again in a couple seconds:
Dependency profile
full
Dependency count
7
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:05.8
Run timer remaining
0:24.1
Run timer last event
react:update:debounce-schedule
Last timeout register
16:07:53.562Z client=10eb97b timeout=30000ms
Last timeout clear
16:07:59.444Z reason=message-show-error client=10eb97b global=10eb97b msg=action action=show-error
Timeout-clearing error
16:07:59.444Z reason=message-show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last timeout fired
none
Last show-error
16:08:00.235Z kind=show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last notification
16:08:00.209Z kind=notification title=Could not fetch dependencies, please try again in a couple seconds: path=- message=-
Preview client id
10eb97b
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
0:00.8
Run timer remaining
0:29.1
Run timer last event
react:update:debounce-schedule
Last timeout register
16:13:42.903Z client=10eb88d timeout=30000ms
Last timeout clear
16:13:43.760Z reason=message-done client=10eb88d global=10eb88d msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
10eb88d
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

## date-fns

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
date-fns
Dependency count
3
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:00.9
Run timer remaining
0:29.0
Run timer last event
react:message
Last timeout register
16:16:22.046Z client=2b543 timeout=30000ms
Last timeout clear
16:16:22.985Z reason=message-done client=2b543 global=2b543 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
2b543
Preview client status
done
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
message:test

## framer-motion

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
framer-motion
Dependency count
3
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
16:17:38.984Z client=1b13c0 timeout=30000ms
Last timeout clear
16:17:39.763Z reason=message-done client=1b13c0 global=1b13c0 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
1b13c0
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
0:06.2
Run timer remaining
0:23.7
Run timer last event
react:update:debounce-schedule
Last timeout register
16:18:33.711Z client=1b121c timeout=30000ms
Last timeout clear
16:18:39.948Z reason=message-show-error client=1b121c global=1b121c msg=action action=show-error
Timeout-clearing error
16:18:39.948Z reason=message-show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last timeout fired
none
Last show-error
16:18:47.149Z kind=show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last notification
16:18:47.149Z kind=notification title=Could not fetch dependencies, please try again in a couple seconds: path=- message=-
Preview client id
1b121c
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
