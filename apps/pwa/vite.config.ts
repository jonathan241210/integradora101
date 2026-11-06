import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const apiTarget = process.env.ARCA_API_PROXY_TARGET ?? 'http://127.0.0.1:8000';
const proxy = { '/api': apiTarget, '/sanctum': apiTarget };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        jsx: 'react-jsx',
      },
    }),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    proxy,
  },
  test: {
    environment: 'node',
  },
});
