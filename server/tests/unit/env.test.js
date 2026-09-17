import { describe, it, expect } from 'vitest';
import { readEnv } from '../../src/config/env.js';

const valid = {
  NODE_ENV: 'development',
  PORT: '4000',
  MONGODB_URI: 'mongodb://localhost:27017/gym_project',
  JWT_SECRET: 'a-secret-that-is-at-least-32-characters-long',
  CLIENT_URL: 'http://localhost:5173',
};

describe('readEnv', () => {
  it('returns typed config when every variable is present', () => {
    const config = readEnv(valid);

    expect(config.port).toBe(4000);
    expect(config.mongodbUri).toBe('mongodb://localhost:27017/gym_project');
    expect(config.jwtSecret).toHaveLength(44);
    expect(config.clientUrl).toBe('http://localhost:5173');
  });

  it('falls back to port 4000 when PORT is absent', () => {
    const { PORT, ...withoutPort } = valid;
    expect(readEnv(withoutPort).port).toBe(4000);
  });

  it('throws a named-variable message when MONGODB_URI is missing', () => {
    const { MONGODB_URI, ...withoutUri } = valid;
    expect(() => readEnv(withoutUri)).toThrow(/MONGODB_URI/);
  });

  it('rejects a JWT secret short enough to brute force', () => {
    expect(() => readEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('does not allow dev reset-token disclosure unless explicitly enabled', () => {
    expect(readEnv(valid).allowDevResetToken).toBe(false);
    expect(readEnv({ ...valid, ALLOW_DEV_RESET_TOKEN: 'true' }).allowDevResetToken).toBe(true);
  });
});
