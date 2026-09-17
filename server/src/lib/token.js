import crypto from 'node:crypto';

/**
 * Hashes a reset token for storage and lookup.
 *
 * SHA-256 rather than bcrypt: the token is already 256 bits of randomness,
 * so it needs no key-stretching, and lookup must be a single indexed query.
 */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Generates a password-reset token.
 *
 * Only `tokenHash` is stored. `token` goes to the user and is never persisted.
 */
export const createResetToken = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
};
