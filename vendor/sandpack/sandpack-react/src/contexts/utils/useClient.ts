import type {
  BundlerState,
  ListenerFunction,
  ReactDevToolsMode,
  SandpackError,
  SandpackMessage,
  UnsubscribeFunction,
  SandpackClient,
} from "@codesandbox/sandpack-client";
import {
  loadSandpackClient,
  extractErrorDetails,
} from "@codesandbox/sandpack-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  SandpackInitMode,
  SandpackProviderProps,
  SandpackStatus,
} from "../..";
import { emitDebugEvent } from "../../utils/debug";
import { generateRandomId } from "../../utils/stringUtils";
import { useAsyncSandpackId } from "../../utils/useAsyncSandpackId";

import type { FilesState } from "./useFiles";

type SandpackClientType = InstanceType<typeof SandpackClient>;

const BUNDLER_TIMEOUT = 40_000;

interface SandpackConfigState {
  reactDevTools?: ReactDevToolsMode;
  startRoute?: string;
  initMode: SandpackInitMode;
  bundlerState: BundlerState | undefined;
  error: SandpackError | null;
  status: SandpackStatus;
}

export interface ClientPropsOverride {
  startRoute?: string;
}

export interface UseClientOperations {
  clients: Record<string, SandpackClientType>;
  initializeSandpackIframe: () => void;
  runSandpack: () => Promise<void>;
  unregisterBundler: (clientId: string) => void;
  registerBundler: (
    iframe: HTMLIFrameElement,
    clientId: string,
    clientPropsOverride?: ClientPropsOverride
  ) => Promise<void>;
  registerReactDevTools: (value: ReactDevToolsMode) => void;
  addListener: (
    listener: ListenerFunction,
    clientId?: string
  ) => UnsubscribeFunction;
  dispatchMessage: (message: SandpackMessage, clientId?: string) => void;
  lazyAnchorRef: React.RefObject<HTMLDivElement>;
  unsubscribeClientListenersRef: React.MutableRefObject<
    Record<string, Record<string, UnsubscribeFunction>>
  >;
  queuedListenersRef: React.MutableRefObject<
    Record<string, Record<string, ListenerFunction>>
  >;
}

type UseClient = (
  props: SandpackProviderProps,
  filesState: FilesState
) => [SandpackConfigState, UseClientOperations];

function summarizeFilesState(filesState: FilesState): Record<string, unknown> {
  const filePaths = Object.keys(filesState.files);

  return {
    environment: filesState.environment,
    fileCount: filePaths.length,
    firstPaths: filePaths.slice(0, 5),
    shouldUpdatePreview: filesState.shouldUpdatePreview,
  };
}

function createUpdateDebugSignature(
  event: string,
  payload: Record<string, unknown>
): string {
  return [
    event,
    payload.recompileMode ?? "",
    payload.providerStatus ?? "",
    payload.clientStatus ?? "",
    payload.environment ?? "",
    payload.fileCount ?? "",
    Array.isArray(payload.firstPaths) ? payload.firstPaths.join(",") : "",
  ].join("|");
}

export const useClient: UseClient = (
  { options, customSetup, teamId, sandboxId },
  filesState
) => {
  options ??= {};
  customSetup ??= {};

  const initModeFromProps = options?.initMode || "lazy";

  const [state, setState] = useState<SandpackConfigState>({
    startRoute: options?.startRoute,
    bundlerState: undefined,
    error: null,
    initMode: initModeFromProps,
    reactDevTools: undefined,
    status: options?.autorun ?? true ? "initial" : "idle",
  });

  /**
   * Refs
   */
  type InterserctionObserverCallback = (
    entries: IntersectionObserverEntry[]
  ) => void;
  const intersectionObserverCallback = useRef<
    InterserctionObserverCallback | undefined
  >();
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  const lazyAnchorRef = useRef<HTMLDivElement>(null);
  const registeredIframes = useRef<
    Record<
      string,
      { iframe: HTMLIFrameElement; clientPropsOverride?: ClientPropsOverride }
    >
  >({});
  const clients = useRef<Record<string, SandpackClientType>>({});
  const timeoutHook = useRef<NodeJS.Timer | null>(null);
  const unsubscribeClientListeners = useRef<
    Record<string, Record<string, UnsubscribeFunction>>
  >({});
  const unsubscribe = useRef<() => void | undefined>();
  const activeGlobalClientId = useRef<string | null>(null);
  const queuedListeners = useRef<
    Record<string, Record<string, ListenerFunction>>
  >({ global: {} });
  const debounceHook = useRef<number | undefined>();
  const prevEnvironment = useRef(filesState.environment);
  const lastUpdateDebugSignature = useRef<string | null>(null);
  const runSandpackPromise = useRef<Promise<void> | null>(null);
  const queuedRunSandpackClientIds = useRef<Set<string>>(new Set());

  const asyncSandpackId = useAsyncSandpackId(filesState.files);
  const sandboxSummary = useMemo(
    () => summarizeFilesState(filesState),
    [filesState.environment, filesState.files, filesState.shouldUpdatePreview]
  );
  const emitUniqueUpdateDebug = useCallback(
    (event: string, payload: Record<string, unknown>): void => {
      const signature = createUpdateDebugSignature(event, payload);

      if (lastUpdateDebugSignature.current === signature) {
        return;
      }

      lastUpdateDebugSignature.current = signature;
      emitDebugEvent(event, payload);
    },
    []
  );
  const clearTimeoutHook = useCallback((payload: Record<string, unknown>) => {
    if (!timeoutHook.current) {
      return;
    }

    clearTimeout(timeoutHook.current);
    timeoutHook.current = null;
    emitDebugEvent("react:timeout:clear", {
      activeClients: Object.keys(clients.current),
      activeGlobalClientId: activeGlobalClientId.current,
      ...payload,
      clientId:
        typeof payload.clientId === "string"
          ? payload.clientId
          : activeGlobalClientId.current ?? "unknown",
    });
  }, []);
  const queueRunSandpack = useCallback(
    (clientId: string, payload: Record<string, unknown>) => {
      if (runSandpackPromise.current === null) {
        return;
      }

      const queuedClientIds = queuedRunSandpackClientIds.current;
      const queueSize = queuedClientIds.size;

      queuedClientIds.add(clientId);

      if (queuedClientIds.size === queueSize) {
        return;
      }

      emitDebugEvent("react:run:queue-follow-up", {
        clientId,
        queuedClientIds: Array.from(queuedClientIds),
        registeredClientIds: Object.keys(registeredIframes.current),
        ...payload,
      });
    },
    []
  );

  /**
   * Callbacks
   */
  const createClient = useCallback(
    async (
      iframe: HTMLIFrameElement,
      clientId: string,
      clientPropsOverride?: ClientPropsOverride
    ): Promise<void> => {
      const shouldManageGlobalClient =
        activeGlobalClientId.current === null ||
        activeGlobalClientId.current === clientId;

      if (shouldManageGlobalClient && activeGlobalClientId.current === null) {
        activeGlobalClientId.current = clientId;
      }

      // Clean up any existing clients that
      // have been created with the given id
      if (clients.current[clientId]) {
        emitDebugEvent("react:create-client:replace-existing", {
          clientId,
          previousStatus: clients.current[clientId].status,
        });
        clients.current[clientId].destroy();

        if (
          activeGlobalClientId.current === clientId &&
          typeof unsubscribe.current === "function"
        ) {
          unsubscribe.current();
          unsubscribe.current = undefined;
        }
      }

      options ??= {};
      customSetup ??= {};

      const timeOut = options?.bundlerTimeOut ?? BUNDLER_TIMEOUT;

      if (shouldManageGlobalClient) {
        clearTimeoutHook({
          clientId,
          reason: "create-client",
        });
      }

      /**
       * Subscribe inside the context with the first client that gets instantiated.
       * This subscription is for global states like error and timeout, so no need for a per client listen
       * Also, set the timeout timer only when the first client is instantiated
       */
      const shouldSetTimeout = shouldManageGlobalClient;

      if (shouldSetTimeout) {
        emitDebugEvent("react:timeout:register", {
          clientId,
          timeoutMs: timeOut,
        });
        timeoutHook.current = setTimeout(() => {
          emitDebugEvent("react:timeout:fired", {
            clientId,
            timeoutMs: timeOut,
            clientCount: Object.keys(clients.current).length,
          });
          timeoutHook.current = null;
          unregisterAllClients();
          setState((prev) => ({ ...prev, status: "timeout" }));
        }, timeOut);
      }

      emitDebugEvent("react:create-client:start", {
        clientId,
        startRoute: clientPropsOverride?.startRoute ?? options.startRoute,
        status: state.status,
        ...sandboxSummary,
      });

      const getStableServiceWorkerId = async () => {
        if (options?.experimental_enableStableServiceWorkerId) {
          const key = `SANDPACK_INTERNAL:URL-CONSISTENT-ID`;
          let fixedId = localStorage.getItem(key);

          if (!fixedId) {
            fixedId = await asyncSandpackId();
            localStorage.setItem(key, fixedId);
          }

          return fixedId;
        }

        return await asyncSandpackId();
      };

      const client = await loadSandpackClient(
        iframe,
        {
          files: filesState.files,
          template: filesState.environment,
          disableDependencyPreprocessing:
            filesState.disableDependencyPreprocessing,
        },
        {
          externalResources: options.externalResources,
          bundlerURL: options.bundlerURL,
          startRoute: clientPropsOverride?.startRoute ?? options.startRoute,
          fileResolver: options.fileResolver,
          skipEval: options.skipEval ?? false,
          logLevel: options.logLevel,
          showOpenInCodeSandbox: false,
          showErrorScreen: true,
          showLoadingScreen: false,
          reactDevTools: state.reactDevTools,
          customNpmRegistries: customSetup?.npmRegistries,
          teamId,
          experimental_enableServiceWorker:
            !!options?.experimental_enableServiceWorker,
          experimental_stableServiceWorkerId: await getStableServiceWorkerId(),
          sandboxId,
        }
      );

      emitDebugEvent("react:create-client:ready", {
        clientId,
        clientStatus: client.status,
        queuedClientListeners: Object.keys(
          queuedListeners.current[clientId] ?? {}
        ).length,
        queuedGlobalListeners: Object.keys(queuedListeners.current.global)
          .length,
      });

      if (shouldManageGlobalClient) {
        unsubscribe.current = client.listen(handleMessage);
        activeGlobalClientId.current = clientId;
      }

      unsubscribeClientListeners.current[clientId] =
        unsubscribeClientListeners.current[clientId] || {};

      /**
       * Register any potential listeners that subscribed before sandpack ran
       */
      if (queuedListeners.current[clientId]) {
        Object.keys(queuedListeners.current[clientId]).forEach((listenerId) => {
          const listener = queuedListeners.current[clientId][listenerId];
          const unsubscribe = client.listen(listener) as () => void;
          unsubscribeClientListeners.current[clientId][listenerId] =
            unsubscribe;
        });

        // Clear the queued listeners after they were registered
        queuedListeners.current[clientId] = {};
      }

      /**
       * Register global listeners
       */
      const globalListeners = Object.entries(queuedListeners.current.global);
      globalListeners.forEach(([listenerId, listener]) => {
        const unsubscribe = client.listen(listener) as () => void;
        unsubscribeClientListeners.current[clientId][listenerId] = unsubscribe;

        /**
         * Important: Do not clean the global queue
         * Instead of cleaning the queue, keep it there for the
         * following clients that might be created
         */
      });

      clients.current[clientId] = client;
      setState((prev) => ({ ...prev, status: "running" }));
      emitDebugEvent("react:create-client:registered", {
        clientId,
        activeClients: Object.keys(clients.current).length,
      });
    },
    [
      clearTimeoutHook,
      filesState.disableDependencyPreprocessing,
      filesState.environment,
      filesState.files,
      options.startRoute,
      sandboxSummary,
      state.reactDevTools,
      state.status,
    ]
  );

  const destroyBundler = useCallback(
    (clientId: string, shouldDropRegistration: boolean): void => {
      const client = clients.current[clientId];
      if (client) {
        emitDebugEvent("react:unregister-bundler", {
          clientId,
          clientStatus: client.status,
          reason: "destroy-client",
          dropRegistration: shouldDropRegistration,
        });
        client.destroy();
        client.iframe.contentWindow?.location.replace("about:blank");
        client.iframe.removeAttribute("src");
        delete clients.current[clientId];
      } else {
        emitDebugEvent("react:unregister-bundler", {
          clientId,
          reason: "drop-registration",
          dropRegistration: shouldDropRegistration,
        });
      }

      if (shouldDropRegistration) {
        delete registeredIframes.current[clientId];
      }

      clearTimeoutHook({
        clientId,
        reason: "unregister-bundler",
      });

      if (activeGlobalClientId.current === clientId) {
        if (typeof unsubscribe.current === "function") {
          unsubscribe.current();
          unsubscribe.current = undefined;
        }

        activeGlobalClientId.current = null;
      }

      const unsubscribeQueuedClients = Object.values(
        unsubscribeClientListeners.current[clientId] ?? {}
      ) as UnsubscribeFunction[];

      // Unsubscribing all listener registered
      unsubscribeQueuedClients.forEach((unsubscribe) => {
        unsubscribe();
      });

      // Keep running if it still have clients
      const status =
        Object.keys(clients.current).length > 0 ? "running" : "idle";

      setState((prev) => ({ ...prev, status }));
      emitDebugEvent("react:unregister-bundler:complete", {
        clientId,
        nextStatus: status,
        remainingClients: Object.keys(clients.current),
      });
    },
    [clearTimeoutHook]
  );

  const unregisterAllClients = useCallback((): void => {
    emitDebugEvent("react:clients:unregister-all", {
      clientIds: Object.keys(clients.current),
    });
    Object.keys(clients.current).forEach((clientId) => {
      destroyBundler(clientId, false);
    });

    if (typeof unsubscribe.current === "function") {
      unsubscribe.current();
      unsubscribe.current = undefined;
    }

    activeGlobalClientId.current = null;
  }, [destroyBundler]);

  const runSandpack = useCallback(async (): Promise<void> => {
    if (runSandpackPromise.current) {
      emitDebugEvent("react:run:reuse-inflight", {
        registeredClientIds: Object.keys(registeredIframes.current),
        queuedClientIds: Array.from(queuedRunSandpackClientIds.current),
      });
      return runSandpackPromise.current;
    }

    const nextRun = (async () => {
      let clientIdsToLoad = Object.keys(registeredIframes.current);

      do {
        emitDebugEvent("react:run:start", {
          registeredClientIds: clientIdsToLoad,
          ...sandboxSummary,
        });
        await Promise.all(
          clientIdsToLoad.map(async (clientId) => {
            const registration = registeredIframes.current[clientId];

            if (!registration) {
              return;
            }

            const { iframe, clientPropsOverride = {} } = registration;
            await createClient(iframe, clientId, clientPropsOverride);
          })
        );

        setState((prev) => ({ ...prev, error: null, status: "running" }));
        const queuedClientIds = Array.from(
          queuedRunSandpackClientIds.current
        ).filter(
          (clientId) =>
            typeof registeredIframes.current[clientId] !== "undefined"
        );
        queuedRunSandpackClientIds.current.clear();
        emitDebugEvent("react:run:complete", {
          activeClients: Object.keys(clients.current).length,
          queuedClientIds,
        });
        clientIdsToLoad = queuedClientIds;
      } while (clientIdsToLoad.length > 0);
    })();

    runSandpackPromise.current = nextRun;

    try {
      await nextRun;
    } finally {
      if (runSandpackPromise.current === nextRun) {
        runSandpackPromise.current = null;
      }
    }
  }, [createClient, sandboxSummary]);

  intersectionObserverCallback.current = (
    entries: IntersectionObserverEntry[]
  ): void => {
    if (entries.some((entry) => entry.isIntersecting)) {
      runSandpack();
    } else {
      unregisterAllClients();
    }
  };

  const initializeSandpackIframe = useCallback((): void => {
    const autorun = options?.autorun ?? true;

    if (!autorun) {
      return;
    }

    const observerOptions = options?.initModeObserverOptions ?? {
      rootMargin: `1000px 0px`,
    };

    if (intersectionObserver.current && lazyAnchorRef.current) {
      intersectionObserver.current?.unobserve(lazyAnchorRef.current);
    }

    if (lazyAnchorRef.current && state.initMode === "lazy") {
      // If any component registered a lazy anchor ref component, use that for the intersection observer
      intersectionObserver.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          // Trigger it once
          if (
            entries.some((entry) => entry.isIntersecting) &&
            lazyAnchorRef.current
          ) {
            intersectionObserverCallback.current?.(entries);

            intersectionObserver.current?.unobserve(lazyAnchorRef.current);
          }
        }
      }, observerOptions);

      intersectionObserver.current.observe(lazyAnchorRef.current);
    } else if (lazyAnchorRef.current && state.initMode === "user-visible") {
      intersectionObserver.current = new IntersectionObserver((entries) => {
        intersectionObserverCallback.current?.(entries);
      }, observerOptions);

      intersectionObserver.current.observe(lazyAnchorRef.current);
    } else {
      runSandpack();
    }
  }, [
    options?.autorun,
    options?.initModeObserverOptions,
    runSandpack,
    state.initMode,
  ]);

  const registerBundler = useCallback(
    async (
      iframe: HTMLIFrameElement,
      clientId: string,
      clientPropsOverride?: ClientPropsOverride
    ): Promise<void> => {
      // Store the iframe info so it can be
      // used later to manually run sandpack
      registeredIframes.current[clientId] = {
        iframe,
        clientPropsOverride,
      };

      emitDebugEvent("react:register-bundler", {
        clientId,
        status: state.status,
        startRoute: clientPropsOverride?.startRoute ?? options?.startRoute,
      });

      if (state.status !== "running") {
        queueRunSandpack(clientId, {
          reason: "register-bundler",
          status: state.status,
        });
      }

      if (state.status === "running") {
        await createClient(iframe, clientId, clientPropsOverride);
        return;
      }

      if ((options?.autorun ?? true) && state.status === "idle") {
        await runSandpack();
      }
    },
    [
      createClient,
      options?.autorun,
      options?.startRoute,
      queueRunSandpack,
      runSandpack,
      state.status,
    ]
  );

  const unregisterBundler = useCallback(
    (clientId: string): void => {
      destroyBundler(clientId, true);
    },
    [destroyBundler]
  );

  const handleMessage = (msg: SandpackMessage): void => {
    emitDebugEvent("react:message", {
      type: msg.type,
      action: msg.type === "action" ? msg.action : undefined,
      status: msg.type === "status" ? msg.status : undefined,
      hasCompilationError:
        msg.type === "done" ? msg.compilatonError : undefined,
      entry: msg.type === "state" ? msg.state.entry : undefined,
    });

    if (msg.type === "state") {
      setState((prev) => ({ ...prev, bundlerState: msg.state }));
    } else if (
      (msg.type === "done" && !msg.compilatonError) ||
      msg.type === "connected"
    ) {
      // Keep the last runtime error visible until the client actually recovers.
      // Some runtimes emit follow-up `start` messages while retrying, which would
      // otherwise hide a fatal error before any successful reconnect/compile.
      clearTimeoutHook({
        reason: msg.type === "connected" ? "message-connected" : "message-done",
        messageType: msg.type,
      });

      setState((prev) => ({ ...prev, error: null }));
    } else if (msg.type === "action" && msg.action === "show-error") {
      clearTimeoutHook({
        reason: "message-show-error",
        messageType: msg.type,
        action: msg.action,
        title: msg.title,
        path: msg.path,
        errorMessage: msg.message,
      });

      setState((prev) => ({ ...prev, error: extractErrorDetails(msg) }));
    } else if (
      msg.type === "action" &&
      msg.action === "notification" &&
      msg.notificationType === "error"
    ) {
      setState((prev) => ({
        ...prev,
        error: { message: msg.title },
      }));
    }
  };

  const registerReactDevTools = (value: ReactDevToolsMode): void => {
    setState((prev) => ({ ...prev, reactDevTools: value }));
  };

  const recompileMode = options?.recompileMode ?? "delayed";
  const recompileDelay = options?.recompileDelay ?? 200;

  const dispatchMessage = (
    message: SandpackMessage,
    clientId?: string
  ): void => {
    if (state.status !== "running") {
      emitDebugEvent("react:dispatch:skipped", {
        clientId,
        reason: "provider-not-running",
        messageType: message.type,
      });
      console.warn(
        `[sandpack-react]: dispatch cannot be called while in idle mode`
      );
      return;
    }

    if (clientId) {
      emitDebugEvent("react:dispatch", {
        clientId,
        messageType: message.type,
        action: message.type === "action" ? message.action : undefined,
      });
      clients.current[clientId].dispatch(message);
    } else {
      emitDebugEvent("react:dispatch", {
        clientIds: Object.keys(clients.current),
        messageType: message.type,
        action: message.type === "action" ? message.action : undefined,
      });
      Object.values(clients.current).forEach((client) => {
        client.dispatch(message);
      });
    }
  };

  const addListener = (
    listener: ListenerFunction,
    clientId?: string
  ): UnsubscribeFunction => {
    if (clientId) {
      if (clients.current[clientId]) {
        const unsubscribeListener = clients.current[clientId].listen(listener);

        return unsubscribeListener;
      } else {
        /**
         * When listeners are added before the client is instantiated, they are stored with an unique id
         * When the client is eventually instantiated, the listeners are registered on the spot
         * Their unsubscribe functions are stored in unsubscribeClientListeners for future cleanup
         */
        const listenerId = generateRandomId();
        queuedListeners.current[clientId] =
          queuedListeners.current[clientId] || {};
        unsubscribeClientListeners.current[clientId] =
          unsubscribeClientListeners.current[clientId] || {};

        queuedListeners.current[clientId][listenerId] = listener;

        const unsubscribeListener = (): void => {
          if (queuedListeners.current[clientId][listenerId]) {
            /**
             * Unsubscribe was called before the client was instantiated
             * common example - a component with autorun=false that unmounted
             */
            delete queuedListeners.current[clientId][listenerId];
          } else if (unsubscribeClientListeners.current[clientId][listenerId]) {
            /**
             * unsubscribe was called for a listener that got added before the client was instantiated
             * call the unsubscribe function and remove it from memory
             */
            unsubscribeClientListeners.current[clientId][listenerId]();
            delete unsubscribeClientListeners.current[clientId][listenerId];
          }
        };

        return unsubscribeListener;
      }
    } else {
      // Push to the **global** queue
      const listenerId = generateRandomId();
      queuedListeners.current.global[listenerId] = listener;

      // Add to the current clients
      const clientsList = Object.values(clients.current);
      const currentClientUnsubscribeListeners = clientsList.map((client) =>
        client.listen(listener)
      );

      const unsubscribeListener = (): void => {
        // Unsubscribing from the clients already created
        currentClientUnsubscribeListeners.forEach((unsubscribe) =>
          unsubscribe()
        );

        delete queuedListeners.current.global[listenerId];

        // Unsubscribe in case it was added later from `global`
        Object.values(unsubscribeClientListeners.current).forEach((client) => {
          client?.[listenerId]?.();
        });
      };

      return unsubscribeListener;
    }
  };

  /**
   * Effects
   */

  useEffect(
    function watchFileChanges() {
      if (state.status !== "running" || !filesState.shouldUpdatePreview) {
        if (filesState.shouldUpdatePreview && state.status !== "running") {
          emitUniqueUpdateDebug("react:update:skipped", {
            reason: "provider-not-running",
            providerStatus: state.status,
            ...sandboxSummary,
          });
        }
        return;
      }

      /**
       * When the environment changes, Sandpack needs to make sure
       * to create a new client and the proper bundler
       */
      if (prevEnvironment.current !== filesState.environment) {
        prevEnvironment.current = filesState.environment;
        lastUpdateDebugSignature.current = null;
        emitDebugEvent("react:environment:changed", sandboxSummary);

        Object.entries(clients.current).forEach(([key, client]) => {
          registerBundler(client.iframe, key);
        });
      }

      if (recompileMode === "immediate") {
        Object.values(clients.current).forEach((client) => {
          /**
           * Avoid concurrency
           */
          if (client.status === "done") {
            emitUniqueUpdateDebug("react:update:apply", {
              recompileMode,
              clientStatus: client.status,
              providerStatus: state.status,
              ...sandboxSummary,
            });
            client.updateSandbox({
              files: filesState.files,
              template: filesState.environment,
            });
          } else {
            emitUniqueUpdateDebug("react:update:skip-client", {
              recompileMode,
              clientStatus: client.status,
              providerStatus: state.status,
              ...sandboxSummary,
            });
          }
        });
      }

      if (recompileMode === "delayed") {
        if (typeof window === "undefined") return;

        window.clearTimeout(debounceHook.current);
        emitUniqueUpdateDebug("react:update:debounce-schedule", {
          recompileDelay,
          providerStatus: state.status,
          ...sandboxSummary,
        });
        debounceHook.current = window.setTimeout(() => {
          Object.values(clients.current).forEach((client) => {
            /**
             * Avoid concurrency
             */
            if (client.status === "done") {
              emitUniqueUpdateDebug("react:update:apply", {
                recompileMode,
                clientStatus: client.status,
                providerStatus: state.status,
                ...sandboxSummary,
              });
              client.updateSandbox({
                files: filesState.files,
                template: filesState.environment,
              });
            } else {
              emitUniqueUpdateDebug("react:update:skip-client", {
                recompileMode,
                clientStatus: client.status,
                providerStatus: state.status,
                ...sandboxSummary,
              });
            }
          });
        }, recompileDelay);
      }

      return () => {
        window.clearTimeout(debounceHook.current);
      };
    },
    [
      filesState.files,
      filesState.environment,
      filesState.shouldUpdatePreview,
      recompileDelay,
      recompileMode,
      registerBundler,
      emitUniqueUpdateDebug,
      state.status,
      sandboxSummary,
    ]
  );

  useEffect(
    function watchInitMode() {
      if (initModeFromProps !== state.initMode) {
        setState((prev) => ({ ...prev, initMode: initModeFromProps }));

        initializeSandpackIframe();
      }
    },
    [initModeFromProps, initializeSandpackIframe, state.initMode]
  );

  useEffect(() => {
    return function unmountClient(): void {
      if (typeof unsubscribe.current === "function") {
        unsubscribe.current();
      }

      activeGlobalClientId.current = null;

      clearTimeoutHook({
        reason: "unmount-client",
      });

      if (debounceHook.current) {
        clearTimeout(debounceHook.current);
      }

      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect();
      }
    };
  }, [clearTimeoutHook]);

  return [
    state,
    {
      clients: clients.current,
      initializeSandpackIframe,
      runSandpack,
      registerBundler,
      unregisterBundler,
      registerReactDevTools,
      addListener,
      dispatchMessage,
      lazyAnchorRef,
      unsubscribeClientListenersRef: unsubscribeClientListeners,
      queuedListenersRef: queuedListeners,
    },
  ];
};
