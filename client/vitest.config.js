import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Opening a Radix dropdown/menu via `userEvent` has been observed taking
    // 15-30 real seconds on this dev machine (timer delivery contention from
    // other running processes), well past Vitest's 5s default. The default
    // testTimeout is raised so genuinely-passing interaction tests don't fail
    // spuriously; it does not change what the tests assert.
    testTimeout: 45000,
  },
});
