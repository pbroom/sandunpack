# Test Results 6

## Summary So Far

- These results were gathered against `fixtures/heavy-timeout-disconnect-repro` at the default `30000` timeout under Node 20, using the explicit `Call runSandpack()` path after selecting each dependency profile.
- `@mui/system@6.5.0` still passes cleanly.
- `@mui/system@7.0.0`, `7.0.2`, `7.1.0`, `7.2.0`, `7.3.0`, and `7.3.1` all fail with `ModuleNotFoundError` for `@mui/system`; that is a different failure class from the original hosted dependency-fetch error.
- `@mui/system@7.3.5` and `7.3.8` both pass cleanly.
- `@mui/system@latest` (`7.3.9`) is still the minimal profile that reproduces the hosted dependency-fetch error, so the current narrowest practical boundary for the original failure mode is last-good `7.3.8`, first-bad `7.3.9`.
- Caveat: the fresh `7.3.9` control still shows `Could not fetch dependencies, please try again in a couple seconds:` with `message-show-error` and a `waiting` preview, but the preview client now settles to `done` instead of the earlier `installing-dependencies` observation. Keep that status drift as evidence, not as proof that the error class changed.
- Recommended next step: prepare the upstream repro/report now. Only probe `7.3.2` or `7.3.3` later if upstream explicitly wants to know where the earlier module-resolution failure stops.

## mui-system-v6

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
mui-system-v6
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:03.3
Run timer remaining
0:26.6
Run timer last event
react:message
Last timeout register
19:49:45.655Z client=2b537 timeout=30000ms
Last timeout clear
19:49:49.024Z reason=message-done client=2b537 global=2b537 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
2b537
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

## mui-system-v7.0

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
none
Dependency profile
mui-system-v7.0
Dependency count
5
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
19:49:49.954Z client=1b12d0 timeout=30000ms
Last timeout clear
19:49:50.944Z reason=message-show-error client=1b12d0 global=1b12d0 msg=action action=show-error
Timeout-clearing error
19:49:50.944Z reason=message-show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last timeout fired
none
Last show-error
19:49:52.063Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b12d0
Preview client status
done
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
message:console

## mui-system-v7.0.2

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
none
Dependency profile
mui-system-v7.0.2
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:01.1
Run timer remaining
0:28.8
Run timer last event
react:update:debounce-schedule
Last timeout register
19:49:52.329Z client=1b1351 timeout=30000ms
Last timeout clear
19:49:53.461Z reason=message-show-error client=1b1351 global=1b1351 msg=action action=show-error
Timeout-clearing error
19:49:53.461Z reason=message-show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last timeout fired
none
Last show-error
19:49:53.465Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b1351
Preview client status
transpiling
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

## mui-system-v7.1.0

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
none
Dependency profile
mui-system-v7.1.0
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:01.1
Run timer remaining
0:28.8
Run timer last event
react:update:debounce-schedule
Last timeout register
19:49:54.430Z client=1b13c6 timeout=30000ms
Last timeout clear
19:49:55.544Z reason=message-show-error client=1b13c6 global=1b13c6 msg=action action=show-error
Timeout-clearing error
19:49:55.544Z reason=message-show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last timeout fired
none
Last show-error
19:49:55.548Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b13c6
Preview client status
transpiling
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

## mui-system-v7.2.0

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
none
Dependency profile
mui-system-v7.2.0
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:01.2
Run timer remaining
0:28.7
Run timer last event
react:update:debounce-schedule
Last timeout register
19:49:56.462Z client=1b1441 timeout=30000ms
Last timeout clear
19:49:57.740Z reason=message-show-error client=1b1441 global=1b1441 msg=action action=show-error
Timeout-clearing error
19:49:57.740Z reason=message-show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last timeout fired
none
Last show-error
19:49:57.741Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b1441
Preview client status
transpiling
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

## mui-system-v7.3.0

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
none
Dependency profile
mui-system-v7.3.0
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:01.2
Run timer remaining
0:28.7
Run timer last event
react:update:debounce-schedule
Last timeout register
19:49:58.732Z client=1b14ce timeout=30000ms
Last timeout clear
19:49:59.945Z reason=message-show-error client=1b14ce global=1b14ce msg=action action=show-error
Timeout-clearing error
19:49:59.945Z reason=message-show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last timeout fired
none
Last show-error
19:49:59.949Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b14ce
Preview client status
transpiling
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

## mui-system-v7.3.1

Sandpack status
running
Expected label
hue-210
Preview label
waiting
Error message
none
Dependency profile
mui-system-v7.3.1
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:02.7
Run timer remaining
0:27.2
Run timer last event
react:update:debounce-schedule
Last timeout register
19:51:38.777Z client=2b51f timeout=30000ms
Last timeout clear
19:51:41.520Z reason=message-show-error client=2b51f global=2b51f msg=action action=show-error
Timeout-clearing error
19:51:41.520Z reason=message-show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last timeout fired
none
Last show-error
19:51:41.521Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
2b51f
Preview client status
transpiling
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
debug:react:update:debounce-schedule

## mui-system-v7.3.5

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
mui-system-v7.3.5
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:05.7
Run timer remaining
0:24.2
Run timer last event
react:message
Last timeout register
19:51:42.649Z client=1b12b0 timeout=30000ms
Last timeout clear
19:51:48.448Z reason=message-done client=1b12b0 global=1b12b0 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
19:51:41.521Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b12b0
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

## mui-system-v7.3.8

Sandpack status
running
Expected label
hue-210
Preview label
hue-210
Error message
none
Dependency profile
mui-system-v7.3.8
Dependency count
5
Timeout configured
30000
Run timer state
timeout cleared
Run timer trigger
Call runSandpack()
Run timer elapsed
0:02.7
Run timer remaining
0:27.2
Run timer last event
react:message
Last timeout register
19:51:49.475Z client=1b1405 timeout=30000ms
Last timeout clear
19:51:52.245Z reason=message-done client=1b1405 global=1b1405 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
19:51:41.521Z kind=show-error title=ModuleNotFoundError path=/App.tsx message=Could not find module in path: '@mui/system' relative to '/App.tsx'
Last notification
none
Preview client id
1b1405
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
0:06.3
Run timer remaining
0:23.6
Run timer last event
react:message
Last timeout register
19:52:57.901Z client=2b51f timeout=30000ms
Last timeout clear
19:53:04.290Z reason=message-show-error client=2b51f global=2b51f msg=action action=show-error
Timeout-clearing error
19:53:04.290Z reason=message-show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last timeout fired
none
Last show-error
19:53:05.068Z kind=show-error title=Error path=- message=Could not fetch dependencies, please try again in a couple seconds:
Last notification
19:53:05.068Z kind=notification title=Could not fetch dependencies, please try again in a couple seconds: path=- message=-
Preview client id
2b51f
Preview client status
done
Preview URL
none
Preview iframe src
https://2-19-8-sandpack.codesandbox.io/
Last urlchange
none
Last preview probe
message:console
