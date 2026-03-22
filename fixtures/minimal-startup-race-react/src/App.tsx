// @ts-nocheck
import type { SandpackMessage } from '@codesandbox/sandpack-client';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { sandpackDark } from '@codesandbox/sandpack-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PREVIEW_SOURCE = 'minimal-startup-race-react-preview';
const BLANK_LABEL = 'blank-template';
const ACCENTS = ['#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa'];

interface LogEntry {
  id: number;
  source: string;
  detail: string;
  at: string;
}

interface RunControllerProps {
  delayMs: number;
  burstCount: number;
  runNonce: number;
  onExpectedLabel: (label: string) => void;
  onStatus: (status: string) => void;
  onLog: (source: string, detail: string) => void;
}

function buildPreviewAppCode(label: string, accent: string): string {
  return `import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    window.parent.postMessage({ source: "${PREVIEW_SOURCE}", label: "${label}" }, "*");
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", padding: 24, background: "#f8fafc", color: "#0f172a" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
        startup-race-react
      </p>
      <h1 style={{ marginBottom: 8, color: "${accent}" }}>${label}</h1>
      <p>This payload was pushed shortly after the sandbox initialized.</p>
    </main>
  );
}
`;
}

const BLANK_APP_CODE = buildPreviewAppCode(BLANK_LABEL, '#94a3b8');

function summarizeMessage(message: SandpackMessage): string {
  if (message.type === 'action') {
    return `${message.type}:${message.action}`;
  }

  if (message.type === 'state') {
    return `${message.type}:${message.state.entry}`;
  }

  return message.type;
}

function RaceController({
  delayMs,
  burstCount,
  runNonce,
  onExpectedLabel,
  onStatus,
  onLog,
}: RunControllerProps) {
  const { sandpack, listen } = useSandpack();
  const lastScheduledNonce = useRef(0);

  useEffect(() => {
    onStatus(sandpack.status);
  }, [onStatus, sandpack.status]);

  useEffect(() => {
    return listen((message) => {
      onLog('listen', summarizeMessage(message));
    });
  }, [listen, onLog]);

  useEffect(() => {
    if (runNonce === 0 || lastScheduledNonce.current === runNonce) {
      return;
    }

    lastScheduledNonce.current = runNonce;
    onLog('sequence', `nonce=${runNonce} delay=${delayMs} burst=${burstCount}`);
    const timer = window.setTimeout(() => {
      const labels = Array.from({ length: burstCount }, (_, index) => {
        if (burstCount === 1) {
          return `real-update-${runNonce}`;
        }

        return `burst-${runNonce}-${index + 1}`;
      });

      labels.forEach((label, index) => {
        window.setTimeout(() => {
          onExpectedLabel(label);
          onLog('updateFile', label);
          sandpack.updateFile('/src/App.tsx', buildPreviewAppCode(label, ACCENTS[index % ACCENTS.length]));
        }, index * 5);
      });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [burstCount, delayMs, onExpectedLabel, onLog, runNonce, sandpack]);

  return null;
}

export default function App() {
  const [delayMs, setDelayMs] = useState(0);
  const [burstCount, setBurstCount] = useState(1);
  const [runNonce, setRunNonce] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [expectedLabel, setExpectedLabel] = useState<string>(BLANK_LABEL);
  const [previewLabel, setPreviewLabel] = useState<string>('waiting');
  const [status, setStatus] = useState<string>('initial');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const nextLogId = useRef(1);

  const appendLog = useCallback((source: string, detail: string) => {
    const id = nextLogId.current++;
    setLogs((current) =>
      [
        {
          id,
          source,
          detail,
          at: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 60),
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

  const statusClassName = useMemo(() => {
    if (previewLabel === expectedLabel) {
      return 'status-pill good';
    }

    return 'status-pill bad';
  }, [expectedLabel, previewLabel]);

  return (
    <div className="app-shell">
      <div className="page">
        <div className="header">
          <div>
            <h1>Minimal Startup Race: sandpack-react</h1>
            <p>Starts from a blank `react-ts` template file and pushes the real file update shortly after mount.</p>
          </div>
          <span className={statusClassName}>expected {expectedLabel} | preview {previewLabel}</span>
        </div>

        <section className="controls">
          <div className="controls-grid">
            <label className="control-group">
              <span>Delay before update (ms)</span>
              <input
                type="number"
                min="0"
                value={delayMs}
                onChange={(event) => setDelayMs(Number(event.target.value))}
              />
            </label>
            <label className="control-group">
              <span>Burst count</span>
              <input
                type="number"
                min="1"
                max="5"
                value={burstCount}
                onChange={(event) => setBurstCount(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="actions">
            <button type="button" onClick={() => setRunNonce((value) => value + 1)}>
              Run race update
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewLabel('waiting');
                setExpectedLabel(BLANK_LABEL);
                setRefreshNonce((value) => value + 1);
                setRunNonce((value) => value + 1);
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
            <span>Expected label</span>
            <code>{expectedLabel}</code>
          </div>
          <div className="metric-row">
            <span>Preview label</span>
            <code>{previewLabel}</code>
          </div>
          <div className="metric-row">
            <span>Preview matches</span>
            <code>{String(previewLabel === expectedLabel)}</code>
          </div>
        </section>

        <div className="layout">
          <section className="editor-panel">
            <SandpackProvider
              key={refreshNonce}
              template="react-ts"
              theme={sandpackDark}
              files={{ '/src/App.tsx': BLANK_APP_CODE }}
              options={{
                autorun: true,
                initMode: 'immediate',
                recompileMode: 'immediate',
                bundlerTimeOut: 10000,
              }}
              customSetup={{
                dependencies: {
                  react: '18.2.0',
                  'react-dom': '18.2.0',
                },
              }}
            >
              <RaceController
                delayMs={delayMs}
                burstCount={burstCount}
                runNonce={runNonce}
                onExpectedLabel={setExpectedLabel}
                onStatus={setStatus}
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
