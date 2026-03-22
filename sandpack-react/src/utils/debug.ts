export interface SandpackDebugDetail {
  event: string;
  payload: Record<string, unknown>;
}

type SandpackDebugWindow = Window &
  typeof globalThis & {
    __SANDPACK_DEBUG__?: boolean;
  };

export function emitDebugEvent(
  event: string,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") {
    return;
  }

  const debugWindow = window as SandpackDebugWindow;
  if (!debugWindow.__SANDPACK_DEBUG__) {
    return;
  }

  debugWindow.dispatchEvent(
    new CustomEvent<SandpackDebugDetail>("sandpack-debug", {
      detail: { event, payload },
    })
  );
}
