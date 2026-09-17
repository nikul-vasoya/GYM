import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Radix UI measures elements that jsdom does not implement.
//
// This is a plain function, not `vi.fn()` — a test file's
// `vi.restoreAllMocks()` in `beforeEach` would otherwise strip the
// implementation back to a no-op after the first test, making
// `window.matchMedia(...)` return `undefined` and crashing anything (like
// framer-motion's reduced-motion check) that calls `.addListener` on it.
beforeAll(() => {
  window.matchMedia ??= (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => {},
  });

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn();
  Element.prototype.releasePointerCapture ??= vi.fn();
});
