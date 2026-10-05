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
    /*
     * Opening a Radix dropdown menu under jsdom costs ~35 real seconds here,
     * and the whole of it is spent synchronously inside `userEvent.click`.
     * It reproduces with a bare DropdownMenu and no application code, so it
     * is the environment, not anything this app does. Measured and ruled out:
     * the rAF override in `src/test/setup.js` (no rAF callbacks are scheduled
     * at all), raw `setTimeout` latency (10 timers in 12ms), userEvent's
     * inter-event `delay`, its `pointerEventsCheck`, `modal` mode, and the
     * `findBy*` queries themselves (5-12ms).
     *
     * The timeout is generous so that the handful of menu-driven tests pass
     * reliably rather than sitting a second under the limit. It does not
     * change what any test asserts. Worth revisiting on a Radix or jsdom
     * upgrade — only three tests pay this cost.
     */
    testTimeout: 120000,
  },
});
