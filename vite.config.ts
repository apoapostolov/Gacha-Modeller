import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { projectLibrary } from './server/plugin.ts';

export default defineConfig({
  plugins: [react(), projectLibrary()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3018,
    host: '127.0.0.1',
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      overlay: true,
    },
  },
  preview: {
    port: 3018,
    host: '127.0.0.1',
    strictPort: true,
  },
});
