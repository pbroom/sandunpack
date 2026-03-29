# Test Results 4

## Summary So Far

- `mui-system-v6` passes cleanly.
- Combined with earlier runs, the current boundary is now:
  `@mui/system@6.5.0` passes, while `@mui/system@latest` (`7.3.9`) fails.
- That makes the dependency-fetch failure look likely 7.x-specific in the shared MUI core line, rather than a general MUI or Emotion issue.
- Next optional datapoint: pin `@mui/system@7.0.0` to see whether the break spans the whole 7.x line or only later 7.x releases.

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
0:01.2
Run timer remaining
0:28.7
Run timer last event
client:runtime:dispatch
Last timeout register
19:17:25.437Z client=1b1228 timeout=30000ms
Last timeout clear
19:17:26.717Z reason=message-done client=1b1228 global=1b1228 msg=done action=-
Timeout-clearing error
none
Last timeout fired
none
Last show-error
none
Last notification
none
Preview client id
1b1228
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
