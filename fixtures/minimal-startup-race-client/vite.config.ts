import path from 'node:path';
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
