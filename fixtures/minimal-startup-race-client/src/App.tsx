import type { SandpackClient, SandpackMessage, SandboxSetup } from '@codesandbox/sandpack-client';
import { loadSandpackClient } from '@codesandbox/sandpack-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PREVIEW_SOURCE = 'minimal-startup-race-client-preview';
const BLANK_LABEL = 'blank-template';
const ACCENTS = ['#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa'];

interface LogEntry {
  id: number;
  source: string;
  detail: string;
  at: string;
}

function buildIndexCode(label: string, accent: string): string {
  return `import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

function App() {
  useEffect(() => {
    window.parent.postMessage({ source: "${PREVIEW_SOURCE}", label: "${label}" }, "*");
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", padding: 24, background: "#f8fafc", color: "#0f172a" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
        startup-race-client
      </p>
      <h1 style={{ marginBottom: 8, color: "${accent}" }}>${label}</h1>
      <p>This payload was pushed with the low-level client API.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
`;
}

function buildSetup(label: string, accent: string): SandboxSetup {
  return {
    files: {
      '/index.html': {
        code: '<!doctype html><html><body><div id="root"></div></body></html>',
      },
      '/package.json': {
        code: JSON.stringify({
          main: 'src/index.tsx',
          dependencies: {
            react: '18.2.0',
            'react-dom': '18.2.0',
          },
        }),
      },
      '/src/index.tsx': {
        code: buildIndexCode(label, accent),
      },
    },
    template: 'parcel',
  };
}

function summarizeMessage(message: SandpackMessage): string {
  if (message.type === 'action') {
    return `${message.type}:${message.action}`;
  }

  if (message.type === 'state') {
    return `${message.type}:${message.state.entry}`;
  }

  return message.type;
}

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const clientRef = useRef<SandpackClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [delayMs, setDelayMs] = useState(0);
  const [burstCount, setBurstCount] = useState(1);
  const [clientNonce, setClientNonce] = useState(1);
  const [runNonce, setRunNonce] = useState(1);
  const [expectedLabel, setExpectedLabel] = useState(BLANK_LABEL);
  const [previewLabel, setPreviewLabel] = useState('waiting');
  const [clientStatus, setClientStatus] = useState('initializing');
  const [editorCode, setEditorCode] = useState(buildIndexCode(BLANK_LABEL, '#94a3b8'));
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
      ].slice(0, 60),
    );
  }, []);

  const runSequence = useCallback(
    (nonce: number, burst: number, delay: number) => {
      const client = clientRef.current;
      if (!client) {
        appendLog('host', 'run skipped because the client is not ready yet');
        return;
      }

      appendLog('sequence', `nonce=${nonce} delay=${delay} burst=${burst}`);
      window.setTimeout(() => {
        const labels = Array.from({ length: burst }, (_, index) => {
          if (burst === 1) {
            return `real-update-${nonce}`;
          }

          return `burst-${nonce}-${index + 1}`;
        });

        labels.forEach((label, index) => {
          window.setTimeout(() => {
            const accent = ACCENTS[index % ACCENTS.length];
            setExpectedLabel(label);
            const nextSetup = buildSetup(label, accent);
            setEditorCode(nextSetup.files['/src/index.tsx'].code);
            appendLog('updateSandbox', label);
            client.updateSandbox(nextSetup);
          }, index * 5);
        });
      }, delay);
    },
    [appendLog],
  );

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

  useEffect(() => {
    let cancelled = false;

    async function mountClient() {
      if (!iframeRef.current) {
        return;
      }

      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      clientRef.current?.destroy();
      clientRef.current = null;
      setPreviewLabel('waiting');
      setExpectedLabel(BLANK_LABEL);
      setEditorCode(buildIndexCode(BLANK_LABEL, '#94a3b8'));
      appendLog('client', `create nonce=${clientNonce}`);

      const client = await loadSandpackClient(iframeRef.current, buildSetup(BLANK_LABEL, '#94a3b8'), {
        showErrorScreen: true,
        showLoadingScreen: false,
      });

      if (cancelled) {
        client.destroy();
        return;
      }

      clientRef.current = client;
      setClientStatus(client.status);
      unsubscribeRef.current = client.listen((message) => {
        appendLog('listen', summarizeMessage(message));
        setClientStatus(client.status);
      });
      runSequence(runNonce, burstCount, delayMs);
    }

    void mountClient();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, [appendLog, burstCount, clientNonce, delayMs, runNonce, runSequence]);

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
            <h1>Minimal Startup Race: sandpack-client</h1>
            <p>Uses `loadSandpackClient()` and `updateSandbox()` directly after the client comes online.</p>
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
              Run client update
            </button>
            <button type="button" onClick={() => setClientNonce((value) => value + 1)}>
              Recreate client
            </button>
            <button
              type="button"
              onClick={() => {
                clientRef.current?.dispatch({ type: 'refresh' } as SandpackMessage);
                appendLog('dispatch', 'refresh');
              }}
            >
              Dispatch refresh
            </button>
            <button type="button" onClick={() => setLogs([])}>
              Clear logs
            </button>
          </div>
        </section>

        <section className="metrics">
          <div className="metric-row">
            <span>Client status</span>
            <code>{clientStatus}</code>
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
            <h2>Current sandbox source</h2>
            <textarea readOnly value={editorCode} />
            <div className="preview-host" style={{ marginTop: 16 }}>
              <iframe ref={iframeRef} title="minimal startup race client preview" />
            </div>
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
