import { describe, it, expect } from 'vitest';
import { createResetToken, hashToken } from '../../src/lib/token.js';

describe('createResetToken', () => {
  it('returns a long url-safe token plus its hash', () => {
    const { token, tokenHash } = createResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(token);
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createResetToken().token));
    expect(tokens.size).toBe(200);
  });

  it('hashes deterministically so a presented token can be looked up', () => {
    const { token, tokenHash } = createResetToken();
    expect(hashToken(token)).toBe(tokenHash);
  });
});
