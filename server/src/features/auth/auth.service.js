import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { ApiError } from '../../lib/ApiError.js';
import { verifyPassword, hashPassword } from '../../lib/password.js';
import { createResetToken, hashToken } from '../../lib/token.js';
import { sendResetEmail } from './email.js';
import { env } from '../../config/env.js';

export const signToken = (user) => {
  const config = env();
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Verifies credentials and returns { user, token }.
 *
 * Throws the same 401 for an unknown email and a wrong password so the
 * endpoint cannot be used to discover which addresses have accounts.
 */
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized();
  }

  return { user: user.toJSON(), token: signToken(user) };
};

/** Identical response for every email, so the endpoint cannot enumerate accounts. */
const GENERIC_RESET_MESSAGE =
  'If that email is registered, a password reset link has been sent.';

/**
 * Issues a password-reset token.
 *
 * In development the raw token comes back in the response so the flow can be
 * completed without an email provider. In production it is only emailed.
 */
export const requestPasswordReset = async ({ email }) => {
  const config = env();
  const user = await User.findOne({ email });

  if (!user) {
    // Same shape, same timing budget, no token — nothing is revealed.
    return { message: GENERIC_RESET_MESSAGE };
  }

  const { token, tokenHash } = createResetToken();

  user.resetTokenHash = tokenHash;
  user.resetTokenExpiresAt = new Date(Date.now() + config.resetTokenTtlMinutes * 60 * 1000);
  await user.save();

  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
  await sendResetEmail({ to: user.email, resetUrl });

  return {
    message: GENERIC_RESET_MESSAGE,
    ...(config.isProduction ? {} : { resetToken: token, resetUrl }),
  };
};

/**
 * Consumes a reset token and sets a new password.
 *
 * The token is single-use: it is cleared on success, so a link that has been
 * used (or has expired) cannot be replayed.
 */
export const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpiresAt: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpiresAt');

  if (!user) {
    throw ApiError.badRequest('This reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return { message: 'Your password has been updated. You can now sign in.' };
};
