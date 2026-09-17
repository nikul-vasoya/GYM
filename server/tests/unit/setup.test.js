import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('test database harness', () => {
  it('is connected to an in-memory mongodb, never to atlas', () => {
    // 1 === connected
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.host).toMatch(/127\.0\.0\.1|localhost/);
  });
});
