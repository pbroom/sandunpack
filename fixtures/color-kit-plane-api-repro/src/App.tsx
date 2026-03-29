// @ts-nocheck
import type {SandpackMessage} from '@codesandbox/sandpack-client';
import {
	SandpackCodeEditor,
	SandpackLayout,
	SandpackPreview,
	SandpackProvider,
	useSandpack,
} from '@codesandbox/sandpack-react';
import {sandpackDark} from '@codesandbox/sandpack-themes';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

const PREVIEW_SOURCE = 'color-kit-plane-api-repro-preview';
const BLANK_HUE = 210;
const HUE_SEQUENCE = [210, 240, 280, 320, 20];
const RAW_IMPORT_PATTERN = /(['"])@color-kit\/core\1/;
const REWRITTEN_IMPORT = "'./color-kit-core/index.ts'";
const STRICT_MODE_ENABLED = import.meta.env.VITE_STRICT_MODE === 'true';
const DEBUG_EVENT_LOGS_ENABLED = import.meta.env.VITE_SANDPACK_DEBUG === 'true';

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
	const files: Record<string, {code: string; hidden: true}> = {
		'/color-kit-core/index.ts': {
			code: "export { buildPlaneModel } from './plane/buildPlaneModel.ts';\nexport { describePlane } from './plane/describePlane.ts';\n",
			hidden: true,
		},
		'/color-kit-core/plane/buildPlaneModel.ts': {
			code: "import { clamp } from '../shared/clamp.ts';\nimport { hueToRgb } from '../shared/hueToRgb.ts';\nimport { createStops } from './createStops.ts';\n\nexport function buildPlaneModel(hue: number) {\n  const safeHue = clamp(hue, 0, 360);\n  return {\n    hue: safeHue,\n    rgb: hueToRgb(safeHue),\n    stops: createStops(safeHue),\n  };\n}\n",
			hidden: true,
		},
		'/color-kit-core/plane/describePlane.ts': {
			code: "import { formatRgb } from '../shared/formatRgb.ts';\n\nexport function describePlane(hue: number, rgb: [number, number, number]) {\n  return `hue ${hue} -> ${formatRgb(rgb)}`;\n}\n",
			hidden: true,
		},
		'/color-kit-core/plane/createStops.ts': {
			code: "import { round } from '../shared/round.ts';\n\nexport function createStops(hue: number) {\n  return Array.from({ length: 8 }, (_, index) => ({\n    label: `stop-${index + 1}`,\n    value: round((hue + index * 12) % 360),\n  }));\n}\n",
			hidden: true,
		},
		'/color-kit-core/shared/clamp.ts': {
			code: 'export function clamp(value: number, min: number, max: number) {\n  return Math.min(max, Math.max(min, value));\n}\n',
			hidden: true,
		},
		'/color-kit-core/shared/round.ts': {
			code: 'export function round(value: number) {\n  return Math.round(value * 100) / 100;\n}\n',
			hidden: true,
		},
		'/color-kit-core/shared/formatRgb.ts': {
			code: "export function formatRgb(rgb: [number, number, number]) {\n  return rgb.map((value) => value.toFixed(0).padStart(3, ' ')).join(', ');\n}\n",
			hidden: true,
		},
		'/color-kit-core/shared/hueToRgb.ts': {
			code: "import { clamp } from './clamp.ts';\n\nfunction channel(offset: number, hue: number) {\n  const value = Math.sin(((hue + offset) / 360) * Math.PI * 2) * 127 + 128;\n  return clamp(Math.round(value), 0, 255);\n}\n\nexport function hueToRgb(hue: number): [number, number, number] {\n  return [channel(0, hue), channel(120, hue), channel(240, hue)];\n}\n",
			hidden: true,
		},
		'/color-kit-core/analysis/contrast.ts': {
			code: "export function estimateContrast(hue: number) {\n  return hue > 180 ? 'dark-text' : 'light-text';\n}\n",
			hidden: true,
		},
		'/color-kit-core/analysis/ticks.ts': {
			code: 'export const axisTicks = Array.from({ length: 6 }, (_, index) => index * 20);\n',
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

function buildSandboxEntryCode(): string {
	const reactImport = STRICT_MODE_ENABLED
		? 'import React, { StrictMode } from "react";\n'
		: 'import React from "react";\n';
	const renderApp = STRICT_MODE_ENABLED
		? `root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`
		: 'root.render(<App />);';

	return `${reactImport}import { createRoot } from "react-dom/client";
import "./styles.css";

import App from "./App";

const root = createRoot(document.getElementById("root")!);
${renderApp}
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

function SandpackAutoRun({
	onLog,
}: {
	onLog: (source: string, detail: string) => void;
}) {
	const {sandpack} = useSandpack();
	const didRunOnMount = useRef(false);
	const runSandpackRef = useRef(sandpack.runSandpack);

	useEffect(() => {
		runSandpackRef.current = sandpack.runSandpack;
	}, [sandpack.runSandpack]);

	useEffect(() => {
		if (didRunOnMount.current) {
			return;
		}

		didRunOnMount.current = true;
		onLog('host', 'runSandpack() on mount');
		void runSandpackRef.current();
	}, [onLog]);

	return null;
}

function HeavyController({
	updateNonce,
	targetHue,
	onStatus,
	onExpectedLabel,
	onLog,
}: HeavyControllerProps) {
	const {sandpack, listen} = useSandpack();
	const lastAppliedUpdateNonce = useRef(0);
	const updateFileRef = useRef(sandpack.updateFile);

	useEffect(() => {
		updateFileRef.current = sandpack.updateFile;
	}, [sandpack.updateFile]);

	useEffect(() => {
		onStatus(sandpack.status);
	}, [onStatus, sandpack.status]);

	useEffect(() => {
		if (!DEBUG_EVENT_LOGS_ENABLED) {
			return;
		}

		return listen((message) => {
			onLog('listen', summarizeMessage(message));
		});
	}, [listen, onLog]);

	useEffect(() => {
		if (updateNonce === 0 || lastAppliedUpdateNonce.current === updateNonce) {
			return;
		}

		lastAppliedUpdateNonce.current = updateNonce;
		const label = `hue-${targetHue}`;
		onExpectedLabel(label);
		onLog('updateFile', label);
		updateFileRef.current(
			'/App.tsx',
			toSandpackSource(buildRawAppSource(targetHue)),
		);
	}, [onExpectedLabel, onLog, targetHue, updateNonce]);

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
		window.__SANDPACK_DEBUG__ = DEBUG_EVENT_LOGS_ENABLED;

		if (!DEBUG_EVENT_LOGS_ENABLED) {
			return () => {
				window.__SANDPACK_DEBUG__ = false;
			};
		}

		const handleDebug = (event: Event) => {
			const detail = (
				event as CustomEvent<{
					event: string;
					payload: Record<string, unknown>;
				}>
			).detail;

			appendLog('debug', `${detail.event} ${JSON.stringify(detail.payload)}`);
		};

		window.addEventListener('sandpack-debug', handleDebug as EventListener);
		return () => {
			window.removeEventListener(
				'sandpack-debug',
				handleDebug as EventListener,
			);
			window.__SANDPACK_DEBUG__ = false;
		};
	}, [appendLog]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const payload = event.data as {source?: string; label?: string};
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
			'/index.tsx': {
				code: buildSandboxEntryCode(),
				hidden: true,
			},
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
		<div className='app-shell'>
			<div className='page'>
				<div className='header'>
					<div>
						<h1>Compact `color-kit`-style Heavy Repro</h1>
						<p>
							Hidden files, import rewriting, `react-ts`, delayed recompiles,
							and manual refresh remounts.
						</p>
					</div>
					<span className={statusClassName}>
						expected {expectedLabel} | preview {previewLabel}
					</span>
				</div>

				<section className='controls'>
					<div className='actions'>
						<button
							type='button'
							onClick={() => {
								setHueIndex((value) => (value + 1) % HUE_SEQUENCE.length);
								setUpdateNonce((value) => value + 1);
							}}
						>
							Apply next hue update
						</button>
						<button
							type='button'
							onClick={() => {
								setPreviewLabel('waiting');
								setExpectedLabel(`hue-${BLANK_HUE}`);
								setRefreshNonce((value) => value + 1);
								appendLog('host', 'manual refresh remount');
							}}
						>
							Remount preview
						</button>
						<button type='button' onClick={() => setLogs([])}>
							Clear logs
						</button>
					</div>
				</section>

				<section className='metrics'>
					<div className='metric-row'>
						<span>Sandpack status</span>
						<code>{status}</code>
					</div>
					<div className='metric-row'>
						<span>Expected label</span>
						<code>{expectedLabel}</code>
					</div>
					<div className='metric-row'>
						<span>Preview label</span>
						<code>{previewLabel}</code>
					</div>
					<div className='metric-row'>
						<span>Visible source hue</span>
						<code>{targetHue}</code>
					</div>
				</section>

				<div className='layout'>
					<section className='editor-panel'>
						<SandpackProvider
							key={refreshNonce}
							template='react-ts'
							theme={sandpackDark}
							files={files}
							options={{
								autorun: false,
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
								<SandpackPreview
									showNavigator={false}
									showOpenInCodeSandbox={false}
								/>
							</SandpackLayout>
						</SandpackProvider>
					</section>

					<section className='logs'>
						<h2>Event log</h2>
						<ul className='log-list'>
							{logs.map((entry) => (
								<li className='log-item' key={entry.id}>
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
