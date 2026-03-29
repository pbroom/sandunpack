/**
 * @jest-environment jsdom
 */

import * as sandpackClient from "@codesandbox/sandpack-client";
import { renderHook, act } from "@testing-library/react";

import { getSandpackStateFromProps } from "../../utils/sandpackUtils";

import { useClient } from "./useClient";
import type { UseClientOperations } from "./useClient";

const actualSandpackClient = jest.requireActual("@codesandbox/sandpack-client");

jest.mock("@codesandbox/sandpack-client", () => {
  const actual = jest.requireActual("@codesandbox/sandpack-client");

  return {
    ...actual,
    loadSandpackClient: jest.fn((...args) =>
      actual.loadSandpackClient(...args)
    ),
  };
});

const mockedLoadSandpackClient =
  sandpackClient.loadSandpackClient as jest.MockedFunction<
    typeof sandpackClient.loadSandpackClient
  >;

const createMockClient = (iframe: HTMLIFrameElement) => {
  return createMockClientController(iframe).client;
};

const createMockClientController = (iframe: HTMLIFrameElement) => {
  const listeners: sandpackClient.ListenerFunction[] = [];

  return {
    client: {
      status: "initializing",
      iframe,
      listen: jest.fn((listener: sandpackClient.ListenerFunction) => {
        listeners.push(listener);

        return jest.fn(() => {
          const listenerIndex = listeners.indexOf(listener);

          if (listenerIndex >= 0) {
            listeners.splice(listenerIndex, 1);
          }
        });
      }),
      dispatch: jest.fn(),
      updateSandbox: jest.fn(),
      destroy: jest.fn(),
    } as unknown as InstanceType<typeof sandpackClient.SandpackClient>,
    emit(message: sandpackClient.SandpackMessage) {
      listeners.forEach((listener) => {
        listener(message);
      });
    },
  };
};

beforeEach(() => {
  mockedLoadSandpackClient.mockReset();
  mockedLoadSandpackClient.mockImplementation((...args) =>
    actualSandpackClient.loadSandpackClient(...args)
  );
});

const getAmountOfListener = (
  instance: UseClientOperations,
  name = "client-id",
  ignoreGlobalListener = false
): number => {
  return (
    Object.keys(instance.clients[name].iframeProtocol.channelListeners).length -
    1 - // less protocol listener
    (ignoreGlobalListener ? 0 : 1) // less the global Sandpack-react listener
  );
};

describe(useClient, () => {
  describe("listeners", () => {
    it("sets a listener, but the client hasn't been created yet - no global listener", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );

      const operations = result.current[1];

      // Act: Add listener
      const mock = jest.fn();
      act(() => {
        operations.addListener(mock, "client-id");
      });

      // Act: Create client
      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-id"
        );

        await operations.runSandpack();
      });

      // Expect: one pending unsubscribe function
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(1);

      // Expect: no global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(0);

      // Expect: one client
      expect(Object.keys(operations.clients)).toEqual(["client-id"]);
    });

    it("sets a listener, but the client hasn't been created yet - global listener", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );

      const operations = result.current[1];

      // Act: Add listener
      const mock = jest.fn();
      act(() => {
        operations.addListener(mock /* , no client-id */);
      });

      // Act: Create client
      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-id"
        );
        await operations.runSandpack();
      });

      // Expect: one pending unsubscribe function
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(1);

      // Expect: no global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(1);

      // Expect: one listener in the client
      expect(getAmountOfListener(operations)).toBe(1);
    });

    it("set a listener, but the client has already been created - no global listener", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      // Act: Create client
      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-id"
        );
        await operations.runSandpack();
      });

      // Expect: no pending unsubscribe function
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(0);

      // Expect: no global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(0);

      // Act: Add listener
      const mock = jest.fn();
      act(() => {
        operations.addListener(mock, "client-id");
      });

      // Expect: no pending unsubscribe function
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(0);

      // Expect: no global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(0);

      // Expect: one listener in the client
      expect(getAmountOfListener(operations)).toBe(1);
    });

    it("set a listener, but the client has already been created - global listener", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      // Act: Create client
      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-id"
        );

        await operations.runSandpack();
      });

      // Expect: no pending unsubscribe function
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(0);

      // Expect: no global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(0);

      // Act: Add listener
      const mock = jest.fn();
      act(() => {
        operations.addListener(mock /* , no client-id */);
      });

      // Expect: no pending unsubscribe function, because it's a global
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(0);

      // Expect: one global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(1);

      // Expect: one listener in the client
      expect(getAmountOfListener(operations)).toBe(1);
    });

    it("sets a new listener, and then create one more client", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      // Act: Add listener
      act(() => {
        const mock = jest.fn();
        operations.addListener(mock, "client-id");
      });

      // Act: Create client
      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-id"
        );
        await operations.runSandpack();
      });

      // Expect: one pending unsubscribe function
      expect(
        Object.keys(
          operations.unsubscribeClientListenersRef.current["client-id"]
        ).length
      ).toBe(1);

      // Expect: no global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(0);

      // Expect: one listener in the client
      expect(getAmountOfListener(operations)).toBe(1);

      // Act: Add one more listener
      act(() => {
        const anotherMock = jest.fn();
        operations.addListener(anotherMock /* , no client-id */);
      });

      // Expect: one global listener
      expect(
        Object.keys(operations.queuedListenersRef.current.global).length
      ).toBe(1);

      // Expect: two listener in the client
      expect(getAmountOfListener(operations)).toBe(2);
    });

    it("unsubscribes only from the assigned client id", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-2"
        );

        await operations.runSandpack();
      });

      // Initial state
      expect(getAmountOfListener(operations, "client-1")).toBe(0);
      expect(getAmountOfListener(operations, "client-2", true)).toBe(0);

      // Add listeners
      act(() => {
        operations.addListener(jest.fn(), "client-1");
      });

      // Add listener only to the client-1
      expect(getAmountOfListener(operations, "client-1")).toBe(1);
      expect(getAmountOfListener(operations, "client-2", true)).toBe(0);

      act(() => {
        operations.addListener(jest.fn(), "client-2");
      });

      // Then add a new listener to client-2
      expect(getAmountOfListener(operations, "client-1")).toBe(1);
      expect(getAmountOfListener(operations, "client-2", true)).toBe(1);
    });

    it("doesn't trigger global unsubscribe", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-2"
        );

        await operations.runSandpack();
      });

      act(() => {
        operations.addListener(jest.fn());
        operations.addListener(jest.fn());
      });
      const unsubscribe = operations.addListener(jest.fn());

      expect(getAmountOfListener(operations, "client-1")).toBe(3);
      expect(getAmountOfListener(operations, "client-2", true)).toBe(3);

      unsubscribe();

      expect(getAmountOfListener(operations, "client-1")).toBe(2);
      expect(getAmountOfListener(operations, "client-2", true)).toBe(2);
    });

    it("unsubscribe all the listeners from a specific client when it unmonts", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-2"
        );

        operations.addListener(jest.fn());
        operations.addListener(jest.fn());
        operations.addListener(jest.fn());

        await operations.runSandpack();
      });

      expect(getAmountOfListener(operations, "client-1")).toBe(3);
      expect(getAmountOfListener(operations, "client-2", true)).toBe(3);

      act(() => {
        operations.unregisterBundler("client-2");
      });

      expect(getAmountOfListener(operations, "client-1")).toBe(3);
      expect(operations.clients["client-2"]).toBe(undefined);
    });

    it("does not recreate an unmounted client when a new bundler mounts", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
        await operations.runSandpack();
      });

      expect(operations.clients["client-1"]).toBeDefined();

      act(() => {
        operations.unregisterBundler("client-1");
      });

      expect(operations.clients["client-1"]).toBe(undefined);

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-2"
        );
        await operations.runSandpack();
      });

      expect(Object.keys(operations.clients)).toHaveLength(1);
      expect(operations.clients["client-1"]).toBe(undefined);
      expect(operations.clients["client-2"]).toBeDefined();
    });

    it("does not initialize the same client twice while a run is already in flight", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      let releaseFirstLoad!: () => void;
      const firstLoadBlocked = new Promise<void>((resolve) => {
        releaseFirstLoad = resolve;
      });
      mockedLoadSandpackClient.mockImplementation(async (...args) => {
        if (mockedLoadSandpackClient.mock.calls.length === 1) {
          await firstLoadBlocked;
        }

        return actualSandpackClient.loadSandpackClient(...args);
      });

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
      });

      let firstRun!: Promise<void>;
      let secondRun!: Promise<void>;
      await act(async () => {
        firstRun = operations.runSandpack();
        secondRun = operations.runSandpack();

        await Promise.resolve();
      });

      expect(mockedLoadSandpackClient).toHaveBeenCalledTimes(1);

      releaseFirstLoad();

      await act(async () => {
        await Promise.all([firstRun, secondRun]);
      });

      expect(mockedLoadSandpackClient).toHaveBeenCalledTimes(1);
      expect(Object.keys(operations.clients)).toEqual(["client-1"]);
    });

    it("queues a follow-up run for bundlers that register during an in-flight run", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      let releaseFirstLoad!: () => void;
      const firstLoadBlocked = new Promise<void>((resolve) => {
        releaseFirstLoad = resolve;
      });
      mockedLoadSandpackClient.mockImplementation(async (...args) => {
        if (mockedLoadSandpackClient.mock.calls.length === 1) {
          await firstLoadBlocked;
        }

        return actualSandpackClient.loadSandpackClient(...args);
      });

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
      });

      let firstRun!: Promise<void>;
      let secondRun!: Promise<void>;
      await act(async () => {
        firstRun = operations.runSandpack();
        await Promise.resolve();

        await operations.registerBundler(
          document.createElement("iframe"),
          "client-2"
        );
        secondRun = operations.runSandpack();
        await Promise.resolve();
      });

      expect(mockedLoadSandpackClient).toHaveBeenCalledTimes(1);

      releaseFirstLoad();

      await act(async () => {
        await Promise.all([firstRun, secondRun]);
      });

      expect(mockedLoadSandpackClient).toHaveBeenCalledTimes(2);
      expect(Object.keys(operations.clients).sort()).toEqual([
        "client-1",
        "client-2",
      ]);
    });
    it("keeps the timeout armed when rerunning the same registered client", async () => {
      jest.useFakeTimers();

      mockedLoadSandpackClient.mockImplementation(async (iframeSelector) => {
        return createMockClient(iframeSelector as HTMLIFrameElement);
      });

      try {
        const { result } = renderHook(() =>
          useClient(
            { options: { bundlerTimeOut: 1000 } },
            getSandpackStateFromProps({})
          )
        );
        const operations = result.current[1];

        await act(async () => {
          await operations.registerBundler(
            document.createElement("iframe"),
            "client-1"
          );
          await operations.runSandpack();
        });

        expect(result.current[0].status).toBe("running");

        await act(async () => {
          await operations.runSandpack();
        });

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(result.current[0].status).toBe("timeout");
      } finally {
        jest.useRealTimers();
      }
    });

    it("keeps the last runtime error until the client actually recovers", async () => {
      const iframe = document.createElement("iframe");
      const clientController = createMockClientController(iframe);

      mockedLoadSandpackClient.mockResolvedValue(clientController.client);

      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(iframe, "client-1");
        await operations.runSandpack();
      });

      act(() => {
        clientController.emit({
          type: "action",
          action: "show-error",
          title: "Error",
          path: "/App.tsx",
          message:
            "Could not fetch dependencies, please try again in a couple seconds:",
          line: 1,
          column: 1,
          payload: {},
        } as sandpackClient.SandpackMessage);
      });

      expect(result.current[0].error?.message).toBe(
        "Could not fetch dependencies, please try again in a couple seconds:"
      );
      expect(result.current[0].status).toBe("running");

      act(() => {
        clientController.emit({
          type: "start",
        } as sandpackClient.SandpackMessage);
      });

      expect(result.current[0].error?.message).toBe(
        "Could not fetch dependencies, please try again in a couple seconds:"
      );
      expect(result.current[0].status).toBe("running");

      act(() => {
        clientController.emit({
          type: "connected",
        } as sandpackClient.SandpackMessage);
      });

      expect(result.current[0].error).toBeNull();
      expect(result.current[0].status).toBe("running");
    });
  });

  describe("status", () => {
    it("returns the initial state", () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const state = result.current[0];

      expect(state.status).toBe("initial");
    });

    it("returns the initial state, after register a bundler", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );

      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
      });

      expect(result.current[0].status).toBe("initial");
    });

    it("returns the running state, after init client", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );

        await operations.runSandpack();
      });

      expect(result.current[0].status).toBe("running");
    });

    it("returns the idle state, after unmounting client", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );

        await operations.runSandpack();
      });

      expect(result.current[0].status).toBe("running");

      act(() => {
        operations.unregisterBundler("client-1");
      });

      expect(result.current[0].status).toBe("idle");
    });

    it("keeps running if it unmounts a client and there's still another one running", async () => {
      const { result } = renderHook(() =>
        useClient({}, getSandpackStateFromProps({}))
      );
      const operations = result.current[1];

      await act(async () => {
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-1"
        );
        await operations.registerBundler(
          document.createElement("iframe"),
          "client-2"
        );

        await operations.runSandpack();
      });

      act(() => {
        operations.unregisterBundler("client-1");
      });

      expect(result.current[0].status).toBe("running");
    });
  });
});
