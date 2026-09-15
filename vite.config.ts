import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: { alias: { '@': root } },
  plugins: [react(), sites()],
  build: { outDir: 'dist/client' },
  server: process.env.CODEX_SANDBOX === 'seatbelt' ? { watch: { useFsEvents: false, usePolling: true } } : undefined,
});
