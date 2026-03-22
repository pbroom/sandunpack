// @ts-nocheck
import type { SandpackMessage } from '@codesandbox/sandpack-client';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
  useSandpackNavigation,
  useSandpackShell,
} from '@codesandbox/sandpack-react';
import { sandpackDark } from '@codesandbox/sandpack-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PREVIEW_SOURCE = 'timeout-restart-preview';
const VALID_LABEL = 'timeout-valid';
const HEAVY_DEPENDENCIES = {
  '@emotion/react': 'latest',
  '@emotion/styled': 'latest',
  '@mui/material': 'latest',
  'date-fns': 'latest',
  'framer-motion': 'latest',
};

interface LogEntry {
  id: number;
  source: string;
  detail: string;
  at: string;
}

interface TimeoutControllerProps {
  syntaxError: boolean;
  timeoutMs: number;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
  onLog: (source: string, detail: string) => void;
}

function buildHeavyModule(): string {
  const numbers = Array.from({ length: 2000 }, (_, index) => String(index % 97)).join(', ');
  return `export const heavyValues = [${numbers}];
export const heavyTotal = heavyValues.reduce((sum, value) => sum + value, 0);
`;
}

function buildValidCode(): string {
  return `import Button from "@mui/material/Button";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { heavyTotal } from "./heavy-data";
import { useEffect, useMemo } from "react";

export default function App() {
  const label = "${VALID_LABEL}";
  const formatted = useMemo(() => formatDistanceToNow(new Date(Date.now() - 30_000), { addSuffix: true }), []);

  useEffect(() => {
    window.parent.postMessage({ source: "${PREVIEW_SOURCE}", label }, "*");
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", padding: 24, background: "#f8fafc", color: "#0f172a" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
        timeout-restart-repro
      </p>
      <h1 style={{ marginBottom: 8 }}>Slow install / restart harness</h1>
      <p>Heavy dependencies plus a short bundler timeout help stress the recovery path.</p>
      <p>Time marker: {formatted}</p>
      <p>Generated total: {heavyTotal}</p>
      <motion.div animate={{ opacity: [0.4, 1, 0.7, 1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: 160, height: 20, borderRadius: 999, background: '#38bdf8' }} />
      <div style={{ marginTop: 16 }}>
        <Button variant="contained">Material button</Button>
      </div>
    </main>
  );
}
`;
}

function buildBrokenCode(): string {
  return `import Button from "@mui/material/Button";

export default function App() {
  return (
    <main>
      <Button variant="contained">broken</Button>
      <div>missing close tag to simulate compile failure</div>
    </main>
  ;
}
`;
}

const VALID_FILES = {
  '/src/App.tsx': buildValidCode(),
  '/src/heavy-data.ts': buildHeavyModule(),
};

function summarizeMessage(message: SandpackMessage): string {
  if (message.type === 'action') {
    return `${message.type}:${message.action}`;
  }

  if (message.type === 'state') {
    return `${message.type}:${message.state.entry}`;
  }

  return message.type;
}

function TimeoutController({ syntaxError, timeoutMs, onStatus, onError, onLog }: TimeoutControllerProps) {
  const { sandpack, listen } = useSandpack();
  const { refresh } = useSandpackNavigation();
  const { restart } = useSandpackShell();

  useEffect(() => {
    onStatus(sandpack.status);
    onError(sandpack.error?.message ?? 'none');
  }, [onError, onStatus, sandpack.error?.message, sandpack.status]);

  useEffect(() => {
    return listen((message) => {
      onLog('listen', summarizeMessage(message));
    });
  }, [listen, onLog]);

  return (
    <section className="controls" style={{ marginBottom: 16 }}>
      <div className="metric-row">
        <span>Configured timeout</span>
        <code>{timeoutMs} ms</code>
      </div>
      <div className="metric-row">
        <span>Syntax error enabled</span>
        <code>{String(syntaxError)}</code>
      </div>
      <div className="actions">
        <button
          type="button"
          onClick={() => {
            onLog('dispatch', 'refresh');
            refresh();
          }}
        >
          Dispatch refresh
        </button>
        <button
          type="button"
          onClick={() => {
            onLog('dispatch', 'shell/restart');
            restart();
          }}
        >
          Dispatch shell/restart
        </button>
        <button
          type="button"
          onClick={() => {
            onLog('host', 'runSandpack()');
            void sandpack.runSandpack();
          }}
        >
          Call runSandpack()
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [timeoutMs, setTimeoutMs] = useState(4000);
  const [syntaxError, setSyntaxError] = useState(false);
  const [remountNonce, setRemountNonce] = useState(0);
  const [previewLabel, setPreviewLabel] = useState('waiting');
  const [status, setStatus] = useState('initial');
  const [errorMessage, setErrorMessage] = useState('none');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const appendLog = useCallback((source: string, detail: string) => {
    setLogs((current) =>
      [
        {
          id: current.length + 1,
          source,
          detail,
          at: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 80),
    );
  }, []);

  useEffect(() => {
    window.__SANDPACK_DEBUG__ = true;

    const handleDebug = (event: Event) => {
      const detail = (event as CustomEvent<{
        event: string;
        payload: Record<string, unknown>;
      }>).detail;

      appendLog('debug', `${detail.event} ${JSON.stringify(detail.payload)}`);
    };

    window.addEventListener('sandpack-debug', handleDebug as EventListener);
    return () => {
      window.removeEventListener('sandpack-debug', handleDebug as EventListener);
    };
  }, [appendLog]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as { source?: string; label?: string };
      if (payload?.source !== PREVIEW_SOURCE || !payload.label) {
        return;
      }

      setPreviewLabel(payload.label);
      appendLog('preview', payload.label);
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [appendLog]);

  const files = useMemo(() => {
    if (syntaxError) {
      return {
        ...VALID_FILES,
        '/src/App.tsx': buildBrokenCode(),
      };
    }

    return VALID_FILES;
  }, [syntaxError]);

  const statusClassName = useMemo(() => {
    if (status === 'timeout' || previewLabel !== VALID_LABEL) {
      return 'status-pill bad';
    }

    return 'status-pill good';
  }, [previewLabel, status]);

  return (
    <div className="app-shell">
      <div className="page">
        <div className="header">
          <div>
            <h1>Timeout / Restart Repro</h1>
            <p>Heavy install pressure, low timeout, optional syntax error, and explicit rerun controls.</p>
          </div>
          <span className={statusClassName}>status {status} | preview {previewLabel}</span>
        </div>

        <section className="controls">
          <div className="controls-grid">
            <label className="control-group">
              <span>Bundler timeout (ms)</span>
              <input
                type="number"
                min="1000"
                step="500"
                value={timeoutMs}
                onChange={(event) => setTimeoutMs(Number(event.target.value))}
              />
            </label>
            <label className="control-group">
              <span>Initial syntax error</span>
              <input
                type="checkbox"
                checked={syntaxError}
                onChange={(event) => setSyntaxError(event.target.checked)}
              />
            </label>
          </div>
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                setPreviewLabel('waiting');
                setRemountNonce((value) => value + 1);
                appendLog('host', 'remount sandbox');
              }}
            >
              Remount sandbox
            </button>
            <button type="button" onClick={() => setLogs([])}>
              Clear logs
            </button>
          </div>
        </section>

        <section className="metrics">
          <div className="metric-row">
            <span>Sandpack status</span>
            <code>{status}</code>
          </div>
          <div className="metric-row">
            <span>Preview label</span>
            <code>{previewLabel}</code>
          </div>
          <div className="metric-row">
            <span>Error message</span>
            <code>{errorMessage}</code>
          </div>
          <div className="metric-row">
            <span>Timeout configured</span>
            <code>{timeoutMs}</code>
          </div>
        </section>

        <div className="layout">
          <section className="editor-panel">
            <SandpackProvider
              key={remountNonce}
              template="react-ts"
              theme={sandpackDark}
              files={files}
              customSetup={{ dependencies: HEAVY_DEPENDENCIES }}
              options={{
                autorun: true,
                bundlerTimeOut: timeoutMs,
                initMode: 'immediate',
                recompileMode: 'immediate',
              }}
            >
              <TimeoutController
                syntaxError={syntaxError}
                timeoutMs={timeoutMs}
                onStatus={setStatus}
                onError={setErrorMessage}
                onLog={appendLog}
              />
              <SandpackLayout>
                <SandpackCodeEditor showTabs={false} />
                <SandpackPreview showNavigator={false} showOpenInCodeSandbox={false} />
              </SandpackLayout>
            </SandpackProvider>
          </section>

          <section className="logs">
            <h2>Event log</h2>
            <ul className="log-list">
              {logs.map((entry) => (
                <li className="log-item" key={entry.id}>
                  <header>
                    <strong>{entry.source}</strong>
                    <span>{entry.at}</span>
                  </header>
                  <code>{entry.detail}</code>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
