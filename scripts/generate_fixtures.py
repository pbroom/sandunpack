from __future__ import annotations

from pathlib import Path
import json


ROOT = Path("/Users/peterbroomfield/sandunpack")
FIXTURES = ROOT / "fixtures"


COMMON_CSS = """body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

* {
  box-sizing: border-box;
}

a {
  color: #93c5fd;
}

button,
input,
textarea {
  font: inherit;
}

button {
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  padding: 0.55rem 0.8rem;
}

button:hover {
  background: #334155;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

input,
textarea {
  border: 1px solid #334155;
  background: #020617;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
}

textarea {
  min-height: 180px;
  resize: vertical;
  width: 100%;
}

code {
  font-family: "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, monospace;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.page {
  display: grid;
  gap: 16px;
}

.header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.header h1 {
  margin: 0;
  font-size: 1.35rem;
}

.controls,
.metrics,
.logs,
.editor-panel {
  border: 1px solid #1e293b;
  background: rgba(15, 23, 42, 0.88);
  border-radius: 16px;
  padding: 16px;
}

.controls-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.control-group {
  display: grid;
  gap: 6px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.layout {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
}

@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.metric-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  padding: 6px 0;
}

.metric-row:last-child {
  border-bottom: 0;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  max-height: 420px;
  overflow: auto;
}

.log-item {
  border: 1px solid rgba(51, 65, 85, 0.7);
  background: rgba(2, 6, 23, 0.9);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.log-item header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
  color: #94a3b8;
}

.preview-host {
  width: 100%;
  min-height: 380px;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
}

.preview-host iframe {
  width: 100%;
  min-height: 380px;
  border: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
  background: #1e293b;
}

.status-pill.good {
  background: rgba(22, 163, 74, 0.22);
  color: #bbf7d0;
}

.status-pill.bad {
  background: rgba(220, 38, 38, 0.22);
  color: #fecaca;
}
"""


BASE_TSCONFIG = {
    "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": True,
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "skipLibCheck": True,
        "moduleResolution": "Bundler",
        "allowImportingTsExtensions": True,
        "resolveJsonModule": True,
        "isolatedModules": True,
        "noEmit": True,
        "jsx": "react-jsx",
        "strict": True,
        "types": ["vite/client", "node"],
    },
    "include": ["src", "vite.config.ts"],
}


VITE_CONFIG = """import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const fixtureRoot = fileURLToPath(new URL('.', import.meta.url));
const sandpackNodeModules = path.resolve(fixtureRoot, '../../vendor/sandpack/node_modules');

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      '@codesandbox/sandpack-client',
      '@codesandbox/sandpack-react',
      '@codesandbox/sandpack-themes',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(sandpackNodeModules, 'react'),
      'react-dom': path.resolve(sandpackNodeModules, 'react-dom'),
      'react-dom/client': path.resolve(sandpackNodeModules, 'react-dom/client.js'),
      'react/jsx-runtime': path.resolve(sandpackNodeModules, 'react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(
        sandpackNodeModules,
        'react/jsx-dev-runtime.js',
      ),
    },
  },
});
"""


MAIN_TSX = """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
"""


INDEX_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>sandunpack fixture</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""


FIXTURE_SPECS = {
    "minimal-startup-race-react": {
        "port": 4173,
        "dependencies": {
            "@codesandbox/sandpack-client": "link:../../vendor/sandpack/sandpack-client",
            "@codesandbox/sandpack-react": "link:../../vendor/sandpack/sandpack-react",
            "@codesandbox/sandpack-themes": "link:../../vendor/sandpack/sandpack-themes",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
        },
    },
    "minimal-startup-race-client": {
        "port": 4174,
        "dependencies": {
            "@codesandbox/sandpack-client": "link:../../vendor/sandpack/sandpack-client",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
        },
    },
    "timeout-restart-repro": {
        "port": 4175,
        "dependencies": {
            "@codesandbox/sandpack-client": "link:../../vendor/sandpack/sandpack-client",
            "@codesandbox/sandpack-react": "link:../../vendor/sandpack/sandpack-react",
            "@codesandbox/sandpack-themes": "link:../../vendor/sandpack/sandpack-themes",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
        },
    },
    "color-kit-plane-api-repro": {
        "port": 4176,
        "dependencies": {
            "@codesandbox/sandpack-client": "link:../../vendor/sandpack/sandpack-client",
            "@codesandbox/sandpack-react": "link:../../vendor/sandpack/sandpack-react",
            "@codesandbox/sandpack-themes": "link:../../vendor/sandpack/sandpack-themes",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
        },
    },
}


MINIMAL_REACT_APP = """// @ts-nocheck
import type { SandpackMessage } from '@codesandbox/sandpack-client';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { sandpackDark } from '@codesandbox/sandpack-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    onStatus(sandpack.status);
  }, [onStatus, sandpack.status]);

  useEffect(() => {
    return listen((message) => {
      onLog('listen', summarizeMessage(message));
    });
  }, [listen, onLog]);

  useEffect(() => {
    if (runNonce === 0) {
      return;
    }

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
"""


MINIMAL_CLIENT_APP = """import type { SandpackClient, SandpackMessage, SandboxSetup } from '@codesandbox/sandpack-client';
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
"""


TIMEOUT_APP = """// @ts-nocheck
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
"""


HEAVY_REPRO_APP = """// @ts-nocheck
import type { SandpackMessage } from '@codesandbox/sandpack-client';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { sandpackDark } from '@codesandbox/sandpack-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PREVIEW_SOURCE = 'color-kit-plane-api-repro-preview';
const BLANK_HUE = 210;
const HUE_SEQUENCE = [210, 240, 280, 320, 20];
const RAW_IMPORT_PATTERN = /(['"])@color-kit\\/core\\1/;
const REWRITTEN_IMPORT = "'./color-kit-core/index.ts'";

interface LogEntry {
  id: number;
  source: string;
  detail: string;
  at: string;
}

interface HeavyControllerProps {
  updateNonce: number;
  targetHue: number;
  onStatus: (status: string) => void;
  onExpectedLabel: (label: string) => void;
  onLog: (source: string, detail: string) => void;
}

function buildCoreFiles() {
  const files: Record<string, { code: string; hidden: true }> = {
    '/color-kit-core/index.ts': {
      code: "export { buildPlaneModel } from './plane/buildPlaneModel.ts';\\nexport { describePlane } from './plane/describePlane.ts';\\n",
      hidden: true,
    },
    '/color-kit-core/plane/buildPlaneModel.ts': {
      code: "import { clamp } from '../shared/clamp.ts';\\nimport { hueToRgb } from '../shared/hueToRgb.ts';\\nimport { createStops } from './createStops.ts';\\n\\nexport function buildPlaneModel(hue: number) {\\n  const safeHue = clamp(hue, 0, 360);\\n  return {\\n    hue: safeHue,\\n    rgb: hueToRgb(safeHue),\\n    stops: createStops(safeHue),\\n  };\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/plane/describePlane.ts': {
      code: "import { formatRgb } from '../shared/formatRgb.ts';\\n\\nexport function describePlane(hue: number, rgb: [number, number, number]) {\\n  return `hue ${hue} -> ${formatRgb(rgb)}`;\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/plane/createStops.ts': {
      code: "import { round } from '../shared/round.ts';\\n\\nexport function createStops(hue: number) {\\n  return Array.from({ length: 8 }, (_, index) => ({\\n    label: `stop-${index + 1}`,\\n    value: round((hue + index * 12) % 360),\\n  }));\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/shared/clamp.ts': {
      code: "export function clamp(value: number, min: number, max: number) {\\n  return Math.min(max, Math.max(min, value));\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/shared/round.ts': {
      code: "export function round(value: number) {\\n  return Math.round(value * 100) / 100;\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/shared/formatRgb.ts': {
      code: "export function formatRgb(rgb: [number, number, number]) {\\n  return rgb.map((value) => value.toFixed(0).padStart(3, ' ')).join(', ');\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/shared/hueToRgb.ts': {
      code: "import { clamp } from './clamp.ts';\\n\\nfunction channel(offset: number, hue: number) {\\n  const value = Math.sin(((hue + offset) / 360) * Math.PI * 2) * 127 + 128;\\n  return clamp(Math.round(value), 0, 255);\\n}\\n\\nexport function hueToRgb(hue: number): [number, number, number] {\\n  return [channel(0, hue), channel(120, hue), channel(240, hue)];\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/analysis/contrast.ts': {
      code: "export function estimateContrast(hue: number) {\\n  return hue > 180 ? 'dark-text' : 'light-text';\\n}\\n",
      hidden: true,
    },
    '/color-kit-core/analysis/ticks.ts': {
      code: "export const axisTicks = Array.from({ length: 6 }, (_, index) => index * 20);\\n",
      hidden: true,
    },
  };

  return files;
}

function buildRawAppSource(hue: number): string {
  return `import { useEffect } from "react";
import { describePlane, buildPlaneModel } from "@color-kit/core";

const hue = ${hue};

export default function App() {
  const plane = buildPlaneModel(hue);
  const label = "hue-${hue}";
  const summary = describePlane(plane.hue, plane.rgb);

  useEffect(() => {
    window.parent.postMessage({ source: "${PREVIEW_SOURCE}", label }, "*");
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", padding: 24, background: "#f8fafc", color: "#0f172a" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
        color-kit-plane-api-repro
      </p>
      <h1 style={{ marginBottom: 8 }}>Compact hostile consumer</h1>
      <p>{summary}</p>
      <div style={{ display: "grid", gap: 10, maxWidth: 320, marginTop: 20 }}>
        {plane.stops.map((stop) => (
          <div key={stop.label} style={{ display: "grid", gap: 4 }}>
            <span>{stop.label}</span>
            <div
              style={{
                height: 16,
                borderRadius: 999,
                background:
                  'linear-gradient(90deg, hsl(' +
                  stop.value +
                  ' 80% 70%), hsl(' +
                  ((stop.value + 40) % 360) +
                  ' 80% 60%))',
              }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
`;
}

function toSandpackSource(source: string): string {
  if (!RAW_IMPORT_PATTERN.test(source)) {
    throw new Error('expected an @color-kit/core import in the heavy fixture');
  }

  return source.replace(RAW_IMPORT_PATTERN, REWRITTEN_IMPORT);
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

function SandpackAutoRun({ onLog }: { onLog: (source: string, detail: string) => void }) {
  const { sandpack } = useSandpack();

  useEffect(() => {
    onLog('host', 'runSandpack() on mount');
    void sandpack.runSandpack();
  }, [onLog, sandpack]);

  return null;
}

function HeavyController({ updateNonce, targetHue, onStatus, onExpectedLabel, onLog }: HeavyControllerProps) {
  const { sandpack, listen } = useSandpack();

  useEffect(() => {
    onStatus(sandpack.status);
  }, [onStatus, sandpack.status]);

  useEffect(() => {
    return listen((message) => {
      onLog('listen', summarizeMessage(message));
    });
  }, [listen, onLog]);

  useEffect(() => {
    if (updateNonce === 0) {
      return;
    }

    const label = `hue-${targetHue}`;
    onExpectedLabel(label);
    onLog('updateFile', label);
    sandpack.updateFile('/App.tsx', toSandpackSource(buildRawAppSource(targetHue)));
  }, [onExpectedLabel, onLog, targetHue, sandpack, updateNonce]);

  return null;
}

export default function App() {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [updateNonce, setUpdateNonce] = useState(0);
  const [hueIndex, setHueIndex] = useState(0);
  const [previewLabel, setPreviewLabel] = useState('waiting');
  const [expectedLabel, setExpectedLabel] = useState(`hue-${BLANK_HUE}`);
  const [status, setStatus] = useState('initial');
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

  const files = useMemo(
    () => ({
      '/App.tsx': toSandpackSource(buildRawAppSource(BLANK_HUE)),
      ...buildCoreFiles(),
    }),
    [],
  );

  const targetHue = HUE_SEQUENCE[hueIndex % HUE_SEQUENCE.length];
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
            <h1>Compact `color-kit`-style Heavy Repro</h1>
            <p>Hidden files, import rewriting, `react-ts`, delayed recompiles, and manual refresh remounts.</p>
          </div>
          <span className={statusClassName}>expected {expectedLabel} | preview {previewLabel}</span>
        </div>

        <section className="controls">
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                setHueIndex((value) => (value + 1) % HUE_SEQUENCE.length);
                setUpdateNonce((value) => value + 1);
              }}
            >
              Apply next hue update
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewLabel('waiting');
                setExpectedLabel(`hue-${BLANK_HUE}`);
                setRefreshNonce((value) => value + 1);
                appendLog('host', 'manual refresh remount');
              }}
            >
              Remount preview
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
            <span>Visible source hue</span>
            <code>{targetHue}</code>
          </div>
        </section>

        <div className="layout">
          <section className="editor-panel">
            <SandpackProvider
              key={refreshNonce}
              template="react-ts"
              theme={sandpackDark}
              files={files}
              options={{
                autorun: true,
                bundlerTimeOut: 20000,
                initMode: 'immediate',
                recompileMode: 'delayed',
                recompileDelay: 200,
              }}
              customSetup={{
                dependencies: {
                  react: '18.2.0',
                  'react-dom': '18.2.0',
                },
              }}
            >
              <SandpackAutoRun onLog={appendLog} />
              <HeavyController
                updateNonce={updateNonce}
                targetHue={targetHue}
                onStatus={setStatus}
                onExpectedLabel={setExpectedLabel}
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
"""


def write_fixture_files(name: str, port: int, dependencies: dict[str, str]) -> None:
    package_dir = FIXTURES / name
    source_dir = package_dir / "src"
    source_dir.mkdir(parents=True, exist_ok=True)

    package_json = {
        "name": name,
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "predev": "node ../../scripts/check-fixture-links.mjs --fixture .",
            "dev": f"vite --port {port}",
            "prebuild": "node ../../scripts/check-fixture-links.mjs --fixture .",
            "build": "tsc --noEmit && vite build",
            "precheck": "node ../../scripts/check-fixture-links.mjs --fixture .",
            "check": "tsc --noEmit",
        },
        "dependencies": dependencies,
        "devDependencies": {
            "@types/react": "^18.2.79",
            "@types/react-dom": "^18.2.25",
            "@vitejs/plugin-react": "^5.0.0",
            "typescript": "^5.8.3",
            "vite": "^7.1.3",
        },
    }

    (package_dir / "package.json").write_text(json.dumps(package_json, indent=2) + "\n")
    (package_dir / "tsconfig.json").write_text(json.dumps(BASE_TSCONFIG, indent=2) + "\n")
    (package_dir / "vite.config.ts").write_text(VITE_CONFIG)
    (package_dir / "index.html").write_text(INDEX_HTML)
    (source_dir / "main.tsx").write_text(MAIN_TSX)
    (source_dir / "styles.css").write_text(COMMON_CSS)
    (source_dir / "vite-env.d.ts").write_text('/// <reference types="vite/client" />\n')


def main() -> None:
    for fixture_name, spec in FIXTURE_SPECS.items():
        write_fixture_files(fixture_name, spec["port"], spec["dependencies"])

    (FIXTURES / "minimal-startup-race-react" / "src" / "App.tsx").write_text(MINIMAL_REACT_APP)
    (FIXTURES / "minimal-startup-race-client" / "src" / "App.tsx").write_text(MINIMAL_CLIENT_APP)
    (FIXTURES / "timeout-restart-repro" / "src" / "App.tsx").write_text(TIMEOUT_APP)
    (FIXTURES / "color-kit-plane-api-repro" / "src" / "App.tsx").write_text(HEAVY_REPRO_APP)


if __name__ == "__main__":
    main()
