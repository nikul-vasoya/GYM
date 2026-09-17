import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, passwordSchema } from '../../src/lib/password.js';

describe('passwordSchema', () => {
  it('accepts a password with letters and numbers at the minimum length', () => {
    expect(passwordSchema.safeParse('gympass1').success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse('gym1');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/8 characters/);
  });

  it('rejects a password with no number', () => {
    const result = passwordSchema.safeParse('gympassword');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/letter and one number/);
  });

  it('rejects a password with no letter', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('produces a hash that does not contain the original password', async () => {
    const hash = await hashPassword('gympass1');

    expect(hash).not.toBe('gympass1');
    expect(hash).not.toContain('gympass1');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('gympass1');
    expect(await verifyPassword('gympass1', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('gympass1');
    expect(await verifyPassword('wrongpass1', hash)).toBe(false);
  });

  it('returns false rather than throwing when the stored hash is missing', async () => {
    expect(await verifyPassword('gympass1', undefined)).toBe(false);
  });
});
