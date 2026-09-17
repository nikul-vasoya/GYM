import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Mongoose models are global singletons, so parallel test files would
    // fight over the same connection. One process keeps tests deterministic.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./tests/setup.js'],
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
