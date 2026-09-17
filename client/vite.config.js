import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Lets every import read `@/features/...` instead of '../../../features/...'
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    port: 5173,
    // The client calls '/api/...' in both dev and production, so no base URL
    // juggling and no CORS surprises during development.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
