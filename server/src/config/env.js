import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  /**
   * Returns the raw password-reset token in the API response so the flow can
   * be completed without an email provider. Opt-in and defaults to OFF: a
   * missing or forgotten env var must never cause a secret to be disclosed.
   */
  ALLOW_DEV_RESET_TOKEN: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/**
 * Validates a raw environment object and returns typed config.
 *
 * Exported separately from `env` so tests can exercise it without touching
 * the real process environment.
 */
export const readEnv = (source) => {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    mongodbUri: parsed.data.MONGODB_URI,
    jwtSecret: parsed.data.JWT_SECRET,
    jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
    clientUrl: parsed.data.CLIENT_URL,
    resetTokenTtlMinutes: parsed.data.RESET_TOKEN_TTL_MINUTES,
    allowDevResetToken: parsed.data.ALLOW_DEV_RESET_TOKEN,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
};

/**
 * Lazily-read config singleton.
 *
 * Lazy because importing this module during tests must not require a real
 * MONGODB_URI — tests import `readEnv` directly.
 */
let cached = null;
export const env = () => {
  if (!cached) cached = readEnv(process.env);
  return cached;
};
