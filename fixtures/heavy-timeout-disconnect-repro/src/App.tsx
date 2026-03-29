// @ts-nocheck
import type {SandpackMessage} from '@codesandbox/sandpack-client';
import {
	SandpackCodeEditor,
	SandpackLayout,
	SandpackPreview,
	SandpackProvider,
	type SandpackPreviewRef,
	useSandpack,
	useSandpackNavigation,
	useSandpackShell,
} from '@codesandbox/sandpack-react';
import {sandpackDark} from '@codesandbox/sandpack-themes';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

const PREVIEW_SOURCE = 'heavy-timeout-disconnect-preview';
const BLANK_HUE = 210;
const HUE_SEQUENCE = [210, 240, 280, 320, 20];
const RAW_IMPORT_PATTERN = /(['"])@color-kit\/core\1/;
const REWRITTEN_IMPORT = "'./color-kit-core/index.ts'";
const STRICT_MODE_ENABLED = import.meta.env.VITE_STRICT_MODE === 'true';
const DEBUG_EVENT_LOGS_ENABLED = import.meta.env.VITE_SANDPACK_DEBUG === 'true';
const GENERATED_FAMILY_COUNT = 24;
const GENERATED_VALUES_PER_FAMILY = 48;

const BASE_DEPENDENCIES = {
	react: '18.2.0',
	'react-dom': '18.2.0',
};

const MUI_MATERIAL_V5_VERSION = '5.18.0';
const MUI_SYSTEM_V6_VERSION = '6.5.0';
const MUI_SYSTEM_V7_0_VERSION = '7.0.0';

const DEPENDENCY_PROFILES = {
	'core-only': {
		label: 'core-only',
		description: 'react + react-dom only',
		dependencies: {
			...BASE_DEPENDENCIES,
		},
	},
	'date-fns': {
		label: 'date-fns',
		description: 'core + date-fns',
		dependencies: {
			...BASE_DEPENDENCIES,
			'date-fns': 'latest',
		},
	},
	'framer-motion': {
		label: 'framer-motion',
		description: 'core + framer-motion',
		dependencies: {
			...BASE_DEPENDENCIES,
			'framer-motion': 'latest',
		},
	},
	'emotion-bundle': {
		label: 'emotion-bundle',
		description: 'core + @emotion/react + @emotion/styled',
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
		},
	},
	'mui-system-bundle': {
		label: 'mui-system-bundle',
		description: 'emotion-bundle + @mui/system@latest',
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
			'@mui/system': 'latest',
		},
	},
	'mui-system-v6': {
		label: 'mui-system-v6',
		description: `emotion-bundle + @mui/system@${MUI_SYSTEM_V6_VERSION}`,
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
			'@mui/system': MUI_SYSTEM_V6_VERSION,
		},
	},
	'mui-system-v7.0': {
		label: 'mui-system-v7.0',
		description: `emotion-bundle + @mui/system@${MUI_SYSTEM_V7_0_VERSION}`,
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
			'@mui/system': MUI_SYSTEM_V7_0_VERSION,
		},
	},
	'mui-bundle': {
		label: 'mui-bundle',
		description: 'core + emotion + @mui/material@latest',
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
			'@mui/material': 'latest',
		},
	},
	'mui-bundle-v5': {
		label: 'mui-bundle-v5',
		description: `core + emotion + @mui/material@${MUI_MATERIAL_V5_VERSION}`,
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
			'@mui/material': MUI_MATERIAL_V5_VERSION,
		},
	},
	full: {
		label: 'full',
		description: 'mui-bundle + date-fns + framer-motion',
		dependencies: {
			...BASE_DEPENDENCIES,
			'@emotion/react': 'latest',
			'@emotion/styled': 'latest',
			'@mui/material': 'latest',
			'date-fns': 'latest',
			'framer-motion': 'latest',
		},
	},
} as const;

type DependencyProfileId = keyof typeof DEPENDENCY_PROFILES;

const DEFAULT_DEPENDENCY_PROFILE_ID: DependencyProfileId = 'full';

const DEPENDENCY_PROFILE_IDS = Object.keys(
	DEPENDENCY_PROFILES,
) as DependencyProfileId[];

interface LogEntry {
	id: number;
	source: string;
	detail: string;
	at: string;
}

interface PreviewDiagnostics {
	clientId: string;
	clientStatus: string;
	iframeSrc: string;
	previewUrl: string;
	lastProbe: string;
	lastUrlChange: string;
}

interface RunTimerState {
	startedAtMs: number | null;
	stoppedAtMs: number | null;
	budgetMs: number;
	trigger: string;
	lastEvent: string;
	stopReason: string | null;
}

interface TimeoutLifecycleDiagnostics {
	lastRegister: string;
	lastClear: string;
	lastClearError: string;
	lastFired: string;
}

interface RuntimeAlertDiagnostics {
	lastShowError: string;
	lastNotification: string;
}

interface HeavyTimeoutControllerProps {
	dependencyProfileId: DependencyProfileId;
	updateNonce: number;
	targetHue: number;
	onStatus: (status: string) => void;
	onError: (message: string) => void;
	onExpectedLabel: (label: string) => void;
	onLog: (source: string, detail: string) => void;
	onPreviewDiagnostics: (
		source: string,
		details?: {
			url?: string;
			clientId?: string;
			clientStatus?: string;
			iframeSrc?: string;
			previewUrl?: string;
		},
	) => void;
	onBeforeRun: (trigger: string) => void;
	onRuntimeAlert: (details: {
		kind: 'show-error' | 'notification';
		title?: string;
		message?: string;
		path?: string;
	}) => void;
}

function formatDurationMs(durationMs: number): string {
	const absoluteMs = Math.max(0, Math.abs(durationMs));
	const minutes = Math.floor(absoluteMs / 60_000);
	const seconds = Math.floor((absoluteMs % 60_000) / 1_000);
	const tenths = Math.floor((absoluteMs % 1_000) / 100);

	return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function formatEventTimestamp(date = new Date()): string {
	return date.toISOString().slice(11);
}

function formatDiagnosticValue(value: unknown, fallback = '-'): string {
	if (typeof value !== 'string') {
		return fallback;
	}

	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length > 0 ? normalized : fallback;
}

function formatTimeoutLifecycleEvent(
	eventName:
		| 'react:timeout:register'
		| 'react:timeout:clear'
		| 'react:timeout:fired',
	payload: Record<string, unknown>,
	timestamp = formatEventTimestamp(),
): string {
	const clientId =
		typeof payload.clientId === 'string' ? payload.clientId : 'unknown';
	const timeoutMs =
		typeof payload.timeoutMs === 'number'
			? `${payload.timeoutMs}ms`
			: 'unknown';
	const reason =
		typeof payload.reason === 'string' ? payload.reason : 'unknown';
	const messageType =
		typeof payload.messageType === 'string' ? payload.messageType : '-';
	const action = typeof payload.action === 'string' ? payload.action : '-';
	const clientCount =
		typeof payload.clientCount === 'number' ? String(payload.clientCount) : '-';
	const activeGlobalClientId =
		typeof payload.activeGlobalClientId === 'string'
			? payload.activeGlobalClientId
			: null;

	switch (eventName) {
		case 'react:timeout:register':
			return `${timestamp} client=${clientId} timeout=${timeoutMs}`;
		case 'react:timeout:clear':
			return `${timestamp} reason=${reason} client=${clientId}${activeGlobalClientId ? ` global=${activeGlobalClientId}` : ''} msg=${messageType} action=${action}`;
		case 'react:timeout:fired':
			return `${timestamp} client=${clientId} timeout=${timeoutMs} clients=${clientCount}`;
	}
}

function formatTimeoutClearError(
	payload: Record<string, unknown>,
	timestamp = formatEventTimestamp(),
): string {
	const reason =
		typeof payload.reason === 'string' ? payload.reason : 'unknown';
	const title = formatDiagnosticValue(payload.title);
	const path = formatDiagnosticValue(payload.path);
	const message = formatDiagnosticValue(payload.errorMessage);
	const hasErrorPayload = title !== '-' || path !== '-' || message !== '-';

	if (!hasErrorPayload) {
		return 'none';
	}

	return `${timestamp} reason=${reason} title=${title} path=${path} message=${message}`;
}

function formatRuntimeAlertEvent(
	kind: 'show-error' | 'notification',
	details: {
		title?: string;
		message?: string;
		path?: string;
	},
): string {
	const timestamp = formatEventTimestamp();
	const title = formatDiagnosticValue(details.title);
	const message = formatDiagnosticValue(details.message);
	const path = formatDiagnosticValue(details.path);

	return `${timestamp} kind=${kind} title=${title} path=${path} message=${message}`;
}

function buildCoreFiles() {
	const files: Record<string, {code: string; hidden: true}> = {
		'/color-kit-core/index.ts': {
			code: "export { buildPlaneModel } from './plane/buildPlaneModel.ts';\nexport { describePlane } from './plane/describePlane.ts';\n",
			hidden: true,
		},
		'/color-kit-core/plane/buildPlaneModel.ts': {
			code: "import { generatedFamilies } from '../generated/index.ts';\nimport { clamp } from '../shared/clamp.ts';\nimport { hueToRgb } from '../shared/hueToRgb.ts';\nimport { createStops } from './createStops.ts';\n\nexport function buildPlaneModel(hue: number) {\n  const safeHue = clamp(hue, 0, 360);\n  const family = generatedFamilies[safeHue % generatedFamilies.length];\n  return {\n    hue: safeHue,\n    rgb: hueToRgb(safeHue),\n    familyId: family.id,\n    checksum: family.checksum,\n    stops: createStops(safeHue, family.tone),\n  };\n}\n",
			hidden: true,
		},
		'/color-kit-core/plane/createStops.ts': {
			code: "import { round } from '../shared/round.ts';\n\nexport function createStops(hue: number, tone: readonly number[]) {\n  return Array.from({ length: 8 }, (_, index) => ({\n    label: 'stop-' + (index + 1),\n    value: round((hue + tone[index % tone.length] + index * 9) % 360),\n  }));\n}\n",
			hidden: true,
		},
		'/color-kit-core/plane/describePlane.ts': {
			code: "import { formatRgb } from '../shared/formatRgb.ts';\n\nexport function describePlane(\n  hue: number,\n  rgb: [number, number, number],\n  familyId: string,\n  checksum: number,\n) {\n  return 'hue ' + hue + ' -> ' + formatRgb(rgb) + ' | ' + familyId + ' | checksum ' + checksum;\n}\n",
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
		'/color-kit-core/generated/shared/mixFamilySeed.ts': {
			code: 'export function mixFamilySeed(value: number, offset: number) {\n  return (value * 17 + offset * 29) % 360;\n}\n',
			hidden: true,
		},
	};

	const importLines: string[] = [];
	const familyEntries: string[] = [];

	for (
		let familyIndex = 0;
		familyIndex < GENERATED_FAMILY_COUNT;
		familyIndex += 1
	) {
		const familyName = `family${familyIndex}`;
		const values = Array.from(
			{length: GENERATED_VALUES_PER_FAMILY},
			(_, valueIndex) => String((familyIndex * 37 + valueIndex * 11) % 360),
		).join(', ');

		files[`/color-kit-core/generated/${familyName}/values.ts`] = {
			code: `export const ${familyName}Values = [${values}] as const;\n`,
			hidden: true,
		};

		files[`/color-kit-core/generated/${familyName}/tone.ts`] = {
			code: `import { mixFamilySeed } from "../shared/mixFamilySeed.ts";\nimport { ${familyName}Values } from "./values.ts";\n\nexport const ${familyName}Tone = ${familyName}Values.map((value, index) =>\n  (mixFamilySeed(value, index + ${familyIndex}) + value + index * 7) % 360,\n);\n`,
			hidden: true,
		};

		files[`/color-kit-core/generated/${familyName}/summary.ts`] = {
			code: `import { ${familyName}Tone } from "./tone.ts";\nimport { ${familyName}Values } from "./values.ts";\n\nexport const ${familyName} = {\n  id: "${familyName}",\n  checksum: ${familyName}Values.reduce((sum, value, index) => sum + value + index, 0),\n  tone: ${familyName}Tone.slice(0, 8),\n};\n`,
			hidden: true,
		};

		importLines.push(
			`import { ${familyName} } from "./${familyName}/summary.ts";`,
		);
		familyEntries.push(`  ${familyName},`);
	}

	files['/color-kit-core/generated/index.ts'] = {
		code: `${importLines.join('\n')}\n\nexport const generatedFamilies = [\n${familyEntries.join('\n')}\n] as const;\n`,
		hidden: true,
	};

	return files;
}

function buildRawAppSource(
	hue: number,
	dependencyProfileId: DependencyProfileId,
): string {
	const dependencyProfile = DEPENDENCY_PROFILES[dependencyProfileId];
	const usesMuiSystem = '@mui/system' in dependencyProfile.dependencies;
	const usesEmotion =
		'@emotion/react' in dependencyProfile.dependencies ||
		'@emotion/styled' in dependencyProfile.dependencies;
	const usesMui = '@mui/material' in dependencyProfile.dependencies;
	const usesDateFns = 'date-fns' in dependencyProfile.dependencies;
	const usesFramerMotion = 'framer-motion' in dependencyProfile.dependencies;
	const importLines = [
		usesMuiSystem ? 'import { Box } from "@mui/system";' : '',
		usesEmotion ? 'import styled from "@emotion/styled";' : '',
		usesMui ? 'import Button from "@mui/material/Button";' : '',
		usesDateFns ? 'import { formatDistanceToNow } from "date-fns";' : '',
		usesFramerMotion ? 'import { motion } from "framer-motion";' : '',
		'import { useEffect, useMemo } from "react";',
		'import { buildPlaneModel, describePlane } from "@color-kit/core";',
	]
		.filter(Boolean)
		.join('\n');
	const relativeInitializer = usesDateFns
		? `  const relative = useMemo(
    () => formatDistanceToNow(new Date(Date.now() - 45_000), { addSuffix: true }),
    [],
  );`
		: '  const relative = "date-fns disabled for this profile";';
	const accentBlock = usesFramerMotion
		? '      <motion.div animate={{ opacity: [0.35, 1, 0.55, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 180, height: 18, borderRadius: 999, background: "#38bdf8" }} />'
		: '      <div style={{ width: 180, height: 18, borderRadius: 999, background: "#38bdf8", opacity: 0.85 }} />';
	const actionButton = usesMui
		? '        <Button variant="contained">Material button</Button>'
		: '        <button type="button" style={{ border: 0, borderRadius: 10, padding: "0.7rem 1rem", background: "#0f172a", color: "#f8fafc" }}>HTML button fallback</button>';
	const emotionDefinition = usesEmotion
		? `const EmotionBadge = styled("div")({
  display: "inline-flex",
  alignItems: "center",
  marginTop: 12,
  padding: "0.4rem 0.7rem",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1e3a8a",
  fontSize: 12,
  fontWeight: 600,
});`
		: '';
	const systemBlock = usesMuiSystem
		? '      <Box sx={{ mt: 1.5, display: "inline-flex", px: 1.5, py: 1, borderRadius: 999, bgcolor: "#ede9fe", color: "#5b21b6", fontWeight: 600 }}>MUI System active in this profile</Box>'
		: '';
	const emotionBlock = usesEmotion
		? '      <EmotionBadge>Emotion active in this profile</EmotionBadge>'
		: '';

	return `${importLines}

const hue = ${hue};
const dependencyProfile = ${JSON.stringify(dependencyProfile.label)};
const dependencyDescription = ${JSON.stringify(dependencyProfile.description)};
${emotionDefinition}

export default function App() {
  const plane = useMemo(() => buildPlaneModel(hue), []);
  const label = "hue-${hue}";
  const summary = describePlane(plane.hue, plane.rgb, plane.familyId, plane.checksum);
${relativeInitializer}

  useEffect(() => {
    window.parent.postMessage({ source: "${PREVIEW_SOURCE}", label }, "*");
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", padding: 24, background: "#f8fafc", color: "#0f172a" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
        heavy-timeout-disconnect-repro
      </p>
      <h1 style={{ marginBottom: 8 }}>Heavy timeout / disconnect probe</h1>
      <p>{summary}</p>
      <p>Dependency profile: {dependencyProfile} ({dependencyDescription})</p>
      <p>Relative marker: {relative}</p>
${emotionBlock}
${systemBlock}
${accentBlock}
      <div style={{ marginTop: 16 }}>
${actionButton}
      </div>
      <div style={{ display: "grid", gap: 10, maxWidth: 360, marginTop: 20 }}>
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
                  ((stop.value + 48) % 360) +
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

const CORE_FILES = buildCoreFiles();

function buildBaseFiles(dependencyProfileId: DependencyProfileId) {
	return {
		'/index.tsx': {
			code: buildSandboxEntryCode(),
			hidden: true,
		},
		'/App.tsx': toSandpackSource(
			buildRawAppSource(BLANK_HUE, dependencyProfileId),
		),
		...CORE_FILES,
	};
}

const VIRTUAL_FILE_COUNT = Object.keys(CORE_FILES).length + 2;

function summarizeMessage(message: SandpackMessage): string {
	if (message.type === 'action') {
		return `${message.type}:${message.action}`;
	}

	if (message.type === 'status') {
		return `${message.type}:${message.status}`;
	}

	if (message.type === 'state') {
		return `${message.type}:${message.state.entry}`;
	}

	if (message.type === 'urlchange') {
		return `${message.type}:${message.url}`;
	}

	if (message.type === 'done') {
		return `${message.type}:compilationError=${String(message.compilatonError)}`;
	}

	return message.type;
}

function SandpackAutoRun({
	onLog,
	onBeforeRun,
}: {
	onLog: (source: string, detail: string) => void;
	onBeforeRun: (trigger: string) => void;
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
		onBeforeRun('runSandpack() on mount');
		onLog('host', 'runSandpack() on mount');
		void runSandpackRef.current();
	}, [onBeforeRun, onLog]);

	return null;
}

function HeavyTimeoutController({
	dependencyProfileId,
	updateNonce,
	targetHue,
	onStatus,
	onError,
	onExpectedLabel,
	onLog,
	onPreviewDiagnostics,
	onBeforeRun,
	onRuntimeAlert,
}: HeavyTimeoutControllerProps) {
	const {sandpack, listen} = useSandpack();
	const {refresh} = useSandpackNavigation();
	const {restart} = useSandpackShell();
	const lastAppliedUpdateNonce = useRef(0);
	const runSandpackRef = useRef(sandpack.runSandpack);
	const updateFileRef = useRef(sandpack.updateFile);

	useEffect(() => {
		runSandpackRef.current = sandpack.runSandpack;
		updateFileRef.current = sandpack.updateFile;
	}, [sandpack.runSandpack, sandpack.updateFile]);

	useEffect(() => {
		onStatus(sandpack.status);
		onError(sandpack.error?.message ?? 'none');
		onPreviewDiagnostics(`status:${sandpack.status}`);
	}, [
		onError,
		onPreviewDiagnostics,
		onStatus,
		sandpack.error?.message,
		sandpack.status,
	]);

	useEffect(() => {
		return listen((message) => {
			if (DEBUG_EVENT_LOGS_ENABLED) {
				onLog('listen', summarizeMessage(message));
			}

			if (message.type === 'action' && message.action === 'show-error') {
				onRuntimeAlert({
					kind: 'show-error',
					title: message.title,
					message: message.message,
					path: message.path,
				});
			}

			if (message.type === 'action' && message.action === 'notification') {
				onRuntimeAlert({
					kind: 'notification',
					title: message.title,
					message: message.message,
					path: message.path,
				});
			}

			if (message.type === 'urlchange') {
				onPreviewDiagnostics('urlchange', {url: message.url});
				return;
			}

			if (DEBUG_EVENT_LOGS_ENABLED) {
				onPreviewDiagnostics(`message:${message.type}`);
			}
		});
	}, [listen, onLog, onPreviewDiagnostics, onRuntimeAlert]);

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
			toSandpackSource(buildRawAppSource(targetHue, dependencyProfileId)),
		);
	}, [dependencyProfileId, onExpectedLabel, onLog, targetHue, updateNonce]);

	return (
		<section className='controls' style={{marginBottom: 16}}>
			<div className='metric-row'>
				<span>Current target label</span>
				<code>{`hue-${targetHue}`}</code>
			</div>
			<div className='actions'>
				<button
					type='button'
					onClick={() => {
						onBeforeRun('Call runSandpack()');
						onLog('host', 'runSandpack()');
						void runSandpackRef.current();
					}}
				>
					Call runSandpack()
				</button>
				<button
					type='button'
					onClick={() => {
						onLog('dispatch', 'refresh');
						refresh();
					}}
				>
					Dispatch refresh
				</button>
				<button
					type='button'
					onClick={() => {
						onLog('dispatch', 'shell/restart');
						restart();
					}}
				>
					Dispatch shell/restart
				</button>
			</div>
		</section>
	);
}

export default function App() {
	const [timeoutMs, setTimeoutMs] = useState(30000);
	const [dependencyProfileId, setDependencyProfileId] =
		useState<DependencyProfileId>(DEFAULT_DEPENDENCY_PROFILE_ID);
	const [remountNonce, setRemountNonce] = useState(0);
	const [updateNonce, setUpdateNonce] = useState(0);
	const [hueIndex, setHueIndex] = useState(0);
	const [previewLabel, setPreviewLabel] = useState('waiting');
	const [expectedLabel, setExpectedLabel] = useState(`hue-${BLANK_HUE}`);
	const [status, setStatus] = useState('initial');
	const [errorMessage, setErrorMessage] = useState('none');
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [previewDiagnostics, setPreviewDiagnostics] =
		useState<PreviewDiagnostics>({
			clientId: 'unmounted',
			clientStatus: 'missing',
			iframeSrc: 'none',
			previewUrl: 'none',
			lastProbe: 'initial',
			lastUrlChange: 'none',
		});
	const [runTimer, setRunTimer] = useState<RunTimerState>({
		startedAtMs: null,
		stoppedAtMs: null,
		budgetMs: 30000,
		trigger: 'not started',
		lastEvent: 'idle',
		stopReason: null,
	});
	const [timeoutLifecycle, setTimeoutLifecycle] =
		useState<TimeoutLifecycleDiagnostics>({
			lastRegister: 'none',
			lastClear: 'none',
			lastClearError: 'none',
			lastFired: 'none',
		});
	const [runtimeAlertDiagnostics, setRuntimeAlertDiagnostics] =
		useState<RuntimeAlertDiagnostics>({
			lastShowError: 'none',
			lastNotification: 'none',
		});
	const [timerNowMs, setTimerNowMs] = useState(() => Date.now());
	const previewRef = useRef<SandpackPreviewRef | null>(null);
	const dependencyProfile = DEPENDENCY_PROFILES[dependencyProfileId];
	const dependencyPackageCount = Object.keys(
		dependencyProfile.dependencies,
	).length;
	const sandpackFiles = useMemo(
		() => buildBaseFiles(dependencyProfileId),
		[dependencyProfileId],
	);

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
			].slice(0, 100),
		);
	}, []);

	const startRunTimer = useCallback(
		(trigger: string, budgetMs = timeoutMs) => {
			const now = Date.now();
			setTimerNowMs(now);
			setRunTimer({
				startedAtMs: now,
				stoppedAtMs: null,
				budgetMs,
				trigger,
				lastEvent: trigger,
				stopReason: null,
			});
		},
		[timeoutMs],
	);

	const confirmTimeoutRegistration = useCallback(
		(budgetMs?: number) => {
			const now = Date.now();
			setTimerNowMs(now);
			setRunTimer((current) => ({
				startedAtMs: now,
				stoppedAtMs: null,
				budgetMs: budgetMs ?? current.budgetMs ?? timeoutMs,
				trigger:
					current.startedAtMs === null
						? 'react:timeout:register'
						: current.trigger,
				lastEvent: 'react:timeout:register',
				stopReason: null,
			}));
		},
		[timeoutMs],
	);

	const stopRunTimer = useCallback((reason: string) => {
		const now = Date.now();
		setTimerNowMs(now);
		setRunTimer((current) => {
			if (current.startedAtMs === null || current.stoppedAtMs !== null) {
				return current;
			}

			return {
				...current,
				stoppedAtMs: now,
				lastEvent: reason,
				stopReason: reason,
			};
		});
	}, []);

	const resetRunTimer = useCallback(() => {
		const now = Date.now();
		setTimerNowMs(now);
		setRunTimer({
			startedAtMs: null,
			stoppedAtMs: null,
			budgetMs: timeoutMs,
			trigger: 'not started',
			lastEvent: 'idle',
			stopReason: null,
		});
	}, [timeoutMs]);

	const noteRunTimerEvent = useCallback(
		(eventName: string, payload: Record<string, unknown>) => {
			if (eventName === 'react:timeout:register') {
				confirmTimeoutRegistration(
					typeof payload.timeoutMs === 'number' ? payload.timeoutMs : undefined,
				);
				return;
			}

			if (eventName === 'react:timeout:fired') {
				stopRunTimer('timeout fired');
				return;
			}

			if (eventName === 'react:timeout:clear') {
				stopRunTimer('timeout cleared');
				return;
			}

			setRunTimer((current) => {
				if (current.startedAtMs === null) {
					return current;
				}

				return {
					...current,
					lastEvent: eventName,
				};
			});
		},
		[confirmTimeoutRegistration, stopRunTimer],
	);

	const noteTimeoutLifecycleEvent = useCallback(
		(eventName: string, payload: Record<string, unknown>) => {
			if (eventName === 'react:timeout:register') {
				setTimeoutLifecycle((current) => ({
					...current,
					lastRegister: formatTimeoutLifecycleEvent(eventName, payload),
				}));
				return;
			}

			if (eventName === 'react:timeout:clear') {
				const timestamp = formatEventTimestamp();
				setTimeoutLifecycle((current) => ({
					...current,
					lastClear: formatTimeoutLifecycleEvent(eventName, payload, timestamp),
					lastClearError: formatTimeoutClearError(payload, timestamp),
				}));
				return;
			}

			if (eventName === 'react:timeout:fired') {
				setTimeoutLifecycle((current) => ({
					...current,
					lastFired: formatTimeoutLifecycleEvent(eventName, payload),
				}));
			}
		},
		[],
	);

	const noteRuntimeAlert = useCallback(
		(details: {
			kind: 'show-error' | 'notification';
			title?: string;
			message?: string;
			path?: string;
		}) => {
			setRuntimeAlertDiagnostics((current) => {
				const formatted = formatRuntimeAlertEvent(details.kind, details);

				if (details.kind === 'show-error') {
					return {
						...current,
						lastShowError: formatted,
					};
				}

				return {
					...current,
					lastNotification: formatted,
				};
			});
		},
		[],
	);

	const syncPreviewDiagnostics = useCallback(
		(
			source: string,
			details?: {
				url?: string;
				clientId?: string;
				clientStatus?: string;
				iframeSrc?: string;
				previewUrl?: string;
			},
		) => {
			const previewHandle = previewRef.current;
			const client = previewHandle?.getClient() as {
				status?: string;
				iframe?: HTMLIFrameElement;
				iframePreviewUrl?: string;
			} | null;

			setPreviewDiagnostics((current) => {
				const nextClientId =
					details?.clientId ?? previewHandle?.clientId ?? current.clientId;
				const nextClientStatus =
					details?.clientStatus ??
					client?.status ??
					(current.clientId === nextClientId
						? current.clientStatus
						: 'missing');
				const nextIframeSrc =
					details?.iframeSrc ??
					client?.iframe?.getAttribute('src') ??
					client?.iframe?.src ??
					(current.clientId === nextClientId ? current.iframeSrc : 'none');
				const nextPreviewUrl =
					details?.previewUrl ??
					client?.iframePreviewUrl ??
					(current.clientId === nextClientId ? current.previewUrl : 'none');
				const nextLastUrlChange = details?.url ?? current.lastUrlChange;

				if (
					current.clientId === nextClientId &&
					current.clientStatus === nextClientStatus &&
					current.iframeSrc === nextIframeSrc &&
					current.previewUrl === nextPreviewUrl &&
					current.lastProbe === source &&
					current.lastUrlChange === nextLastUrlChange
				) {
					return current;
				}

				return {
					clientId: nextClientId,
					clientStatus: nextClientStatus,
					iframeSrc: nextIframeSrc,
					previewUrl: nextPreviewUrl,
					lastProbe: source,
					lastUrlChange: nextLastUrlChange,
				};
			});
		},
		[],
	);

	const resetPreviewLabel = useCallback(() => {
		setPreviewLabel('waiting');
	}, []);

	const applyDependencyProfile = useCallback(
		(nextProfileId: DependencyProfileId) => {
			if (nextProfileId === dependencyProfileId) {
				return;
			}

			appendLog('host', `dependency profile -> ${nextProfileId}`);
			resetPreviewLabel();
			resetRunTimer();
			setDependencyProfileId(nextProfileId);
		},
		[appendLog, dependencyProfileId, resetPreviewLabel, resetRunTimer],
	);

	useEffect(() => {
		if (runTimer.startedAtMs === null || runTimer.stoppedAtMs !== null) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setTimerNowMs(Date.now());
		}, 250);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [runTimer.startedAtMs, runTimer.stoppedAtMs]);

	useEffect(() => {
		setRunTimer((current) => {
			if (current.startedAtMs !== null || current.budgetMs === timeoutMs) {
				return current;
			}

			return {
				...current,
				budgetMs: timeoutMs,
			};
		});
	}, [timeoutMs]);

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
			noteRunTimerEvent(detail.event, detail.payload);
			noteTimeoutLifecycleEvent(detail.event, detail.payload);
			syncPreviewDiagnostics(`debug:${detail.event}`, {
				clientId:
					typeof detail.payload.clientId === 'string'
						? detail.payload.clientId
						: undefined,
				clientStatus:
					typeof detail.payload.status === 'string'
						? detail.payload.status
						: undefined,
				previewUrl:
					typeof detail.payload.iframePreviewUrl === 'string'
						? detail.payload.iframePreviewUrl
						: undefined,
			});
		};

		window.addEventListener('sandpack-debug', handleDebug as EventListener);
		return () => {
			window.removeEventListener(
				'sandpack-debug',
				handleDebug as EventListener,
			);
			window.__SANDPACK_DEBUG__ = false;
		};
	}, [
		appendLog,
		noteRunTimerEvent,
		noteTimeoutLifecycleEvent,
		syncPreviewDiagnostics,
	]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const payload = event.data as {source?: string; label?: string};
			if (payload?.source !== PREVIEW_SOURCE || !payload.label) {
				return;
			}

			setPreviewLabel(payload.label);
			appendLog('preview', payload.label);
			syncPreviewDiagnostics('preview-postmessage');
		};

		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [appendLog, syncPreviewDiagnostics]);

	useEffect(() => {
		syncPreviewDiagnostics(`app-status:${status}`);
	}, [status, syncPreviewDiagnostics]);

	useEffect(() => {
		if (status === 'timeout') {
			stopRunTimer('status timeout');
		}
	}, [status, stopRunTimer]);

	useEffect(() => {
		if (previewLabel === expectedLabel && previewLabel !== 'waiting') {
			stopRunTimer('preview updated');
		}
	}, [expectedLabel, previewLabel, stopRunTimer]);

	const targetHue = HUE_SEQUENCE[hueIndex % HUE_SEQUENCE.length];
	const statusClassName = useMemo(() => {
		if (status === 'timeout' || previewLabel !== expectedLabel) {
			return 'status-pill bad';
		}

		return 'status-pill good';
	}, [expectedLabel, previewLabel, status]);
	const activeTimerBudgetMs =
		runTimer.startedAtMs === null ? timeoutMs : runTimer.budgetMs;
	const timerReferenceMs = runTimer.stoppedAtMs ?? timerNowMs;
	const timerElapsedMs =
		runTimer.startedAtMs === null
			? 0
			: Math.max(0, timerReferenceMs - runTimer.startedAtMs);
	const timerRemainingMs = activeTimerBudgetMs - timerElapsedMs;
	const runTimerStateLabel = useMemo(() => {
		if (runTimer.startedAtMs === null) {
			return 'armed';
		}

		if (runTimer.stoppedAtMs !== null) {
			return runTimer.stopReason ?? 'stopped';
		}

		if (timerRemainingMs < 0) {
			return 'over budget';
		}

		return 'counting down';
	}, [
		runTimer.startedAtMs,
		runTimer.stopReason,
		runTimer.stoppedAtMs,
		timerRemainingMs,
	]);
	const timerRemainingLabel =
		runTimer.startedAtMs === null
			? formatDurationMs(activeTimerBudgetMs)
			: timerRemainingMs >= 0
				? formatDurationMs(timerRemainingMs)
				: `+${formatDurationMs(Math.abs(timerRemainingMs))} over`;

	const metricsBodyRef = useRef<HTMLDivElement | null>(null);
	const logsBodyRef = useRef<HTMLDivElement | null>(null);
	const [metricsCopied, setMetricsCopied] = useState(false);
	const [logsCopied, setLogsCopied] = useState(false);

	const copyPanelText = useCallback(
		async (bodyEl: HTMLElement | null): Promise<boolean> => {
			const text = bodyEl?.innerText?.trim() ?? '';
			if (!text) {
				return false;
			}

			try {
				await navigator.clipboard.writeText(text);
			} catch {
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.left = '-9999px';
				document.body.appendChild(ta);
				ta.focus();
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			}

			return true;
		},
		[],
	);

	const copyMetricsPanel = useCallback(async () => {
		const ok = await copyPanelText(metricsBodyRef.current);
		if (!ok) {
			return;
		}

		setMetricsCopied(true);
		window.setTimeout(() => {
			setMetricsCopied(false);
		}, 1500);
	}, [copyPanelText]);

	const copyLogsPanel = useCallback(async () => {
		const ok = await copyPanelText(logsBodyRef.current);
		if (!ok) {
			return;
		}

		setLogsCopied(true);
		window.setTimeout(() => {
			setLogsCopied(false);
		}, 1500);
	}, [copyPanelText]);

	return (
		<div className='app-shell'>
			<div className='page'>
				<div className='header'>
					<div>
						<h1>Heavy Timeout / Disconnect Repro</h1>
						<p>
							`color-kit`-style hidden files plus selectable dependency bundles,
							manual rerun controls, and live preview diagnostics.
						</p>
					</div>
					<span className={statusClassName}>
						status {status} | expected {expectedLabel} | preview {previewLabel}
					</span>
				</div>

				<section className='controls'>
					<div className='controls-grid'>
						<label className='control-group'>
							<span>Bundler timeout (ms)</span>
							<input
								type='number'
								min='1000'
								step='500'
								value={timeoutMs}
								onChange={(event) => setTimeoutMs(Number(event.target.value))}
							/>
						</label>
						<label className='control-group'>
							<span>Dependency profile</span>
							<select
								value={dependencyProfileId}
								onChange={(event) =>
									applyDependencyProfile(
										event.target.value as DependencyProfileId,
									)
								}
							>
								{DEPENDENCY_PROFILE_IDS.map((profileId) => (
									<option key={profileId} value={profileId}>
										{profileId}
									</option>
								))}
							</select>
							<code>{dependencyProfile.description}</code>
						</label>
						<div className='control-group'>
							<span>Virtual file count</span>
							<code>{VIRTUAL_FILE_COUNT}</code>
						</div>
						<div className='control-group'>
							<span>Generated families</span>
							<code>{GENERATED_FAMILY_COUNT}</code>
						</div>
					</div>
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
								resetPreviewLabel();
								setRemountNonce((value) => value + 1);
								appendLog('host', 'remount sandbox');
							}}
						>
							Remount sandbox
						</button>
						<button
							type='button'
							onClick={() => {
								appendLog('host', 'probe preview handle');
								syncPreviewDiagnostics('manual-probe');
							}}
						>
							Probe preview handle
						</button>
						<button
							type='button'
							onClick={() => {
								appendLog('host', 'reset timer');
								resetRunTimer();
							}}
						>
							Reset timer
						</button>
						<button type='button' onClick={() => setLogs([])}>
							Clear logs
						</button>
					</div>
				</section>

				<div className='metrics-logs-grid'>
					<section className='metrics'>
						<header className='panel-header'>
							<h2>Metrics</h2>
							<button type='button' onClick={copyMetricsPanel}>
								{metricsCopied ? 'Copied' : 'Copy'}
							</button>
						</header>
						<div ref={metricsBodyRef} className='panel-scroll'>
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
								<span>Error message</span>
								<code>{errorMessage}</code>
							</div>
							<div className='metric-row'>
								<span>Dependency profile</span>
								<code>{dependencyProfile.label}</code>
							</div>
							<div className='metric-row'>
								<span>Dependency count</span>
								<code>{dependencyPackageCount}</code>
							</div>
							<div className='metric-row'>
								<span>Timeout configured</span>
								<code>{timeoutMs}</code>
							</div>
							<div className='metric-row'>
								<span>Run timer state</span>
								<code>{runTimerStateLabel}</code>
							</div>
							<div className='metric-row'>
								<span>Run timer trigger</span>
								<code>{runTimer.trigger}</code>
							</div>
							<div className='metric-row'>
								<span>Run timer elapsed</span>
								<code>{formatDurationMs(timerElapsedMs)}</code>
							</div>
							<div className='metric-row'>
								<span>Run timer remaining</span>
								<code>{timerRemainingLabel}</code>
							</div>
							<div className='metric-row'>
								<span>Run timer last event</span>
								<code>{runTimer.lastEvent}</code>
							</div>
							<div className='metric-row'>
								<span>Last timeout register</span>
								<code>{timeoutLifecycle.lastRegister}</code>
							</div>
							<div className='metric-row'>
								<span>Last timeout clear</span>
								<code>{timeoutLifecycle.lastClear}</code>
							</div>
							<div className='metric-row'>
								<span>Timeout-clearing error</span>
								<code>{timeoutLifecycle.lastClearError}</code>
							</div>
							<div className='metric-row'>
								<span>Last timeout fired</span>
								<code>{timeoutLifecycle.lastFired}</code>
							</div>
							<div className='metric-row'>
								<span>Last show-error</span>
								<code>{runtimeAlertDiagnostics.lastShowError}</code>
							</div>
							<div className='metric-row'>
								<span>Last notification</span>
								<code>{runtimeAlertDiagnostics.lastNotification}</code>
							</div>
							<div className='metric-row'>
								<span>Preview client id</span>
								<code>{previewDiagnostics.clientId}</code>
							</div>
							<div className='metric-row'>
								<span>Preview client status</span>
								<code>{previewDiagnostics.clientStatus}</code>
							</div>
							<div className='metric-row'>
								<span>Preview URL</span>
								<code>{previewDiagnostics.previewUrl}</code>
							</div>
							<div className='metric-row'>
								<span>Preview iframe src</span>
								<code>{previewDiagnostics.iframeSrc}</code>
							</div>
							<div className='metric-row'>
								<span>Last urlchange</span>
								<code>{previewDiagnostics.lastUrlChange}</code>
							</div>
							<div className='metric-row'>
								<span>Last preview probe</span>
								<code>{previewDiagnostics.lastProbe}</code>
							</div>
						</div>
					</section>

					<section className='logs'>
						<header className='panel-header'>
							<h2>Event log</h2>
							<button type='button' onClick={copyLogsPanel}>
								{logsCopied ? 'Copied' : 'Copy'}
							</button>
						</header>
						<div ref={logsBodyRef} className='panel-scroll'>
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
						</div>
					</section>
				</div>

				<section className='editor-panel'>
					<SandpackProvider
						key={`${dependencyProfileId}:${remountNonce}`}
						template='react-ts'
						theme={sandpackDark}
						files={sandpackFiles}
						customSetup={{dependencies: dependencyProfile.dependencies}}
						options={{
							autorun: false,
							bundlerTimeOut: timeoutMs,
							initMode: 'immediate',
							recompileMode: 'delayed',
							recompileDelay: 200,
						}}
					>
						<SandpackAutoRun
							onLog={appendLog}
							onBeforeRun={(trigger) => {
								resetPreviewLabel();
								startRunTimer(trigger);
							}}
						/>
						<HeavyTimeoutController
							dependencyProfileId={dependencyProfileId}
							updateNonce={updateNonce}
							targetHue={targetHue}
							onStatus={setStatus}
							onError={setErrorMessage}
							onExpectedLabel={setExpectedLabel}
							onLog={appendLog}
							onPreviewDiagnostics={syncPreviewDiagnostics}
							onRuntimeAlert={noteRuntimeAlert}
							onBeforeRun={(trigger) => {
								resetPreviewLabel();
								startRunTimer(trigger);
							}}
						/>
						<SandpackLayout>
							<SandpackCodeEditor showTabs={false} />
							<SandpackPreview
								ref={previewRef}
								showNavigator={false}
								showOpenInCodeSandbox={false}
							/>
						</SandpackLayout>
					</SandpackProvider>
				</section>
			</div>
		</div>
	);
}
