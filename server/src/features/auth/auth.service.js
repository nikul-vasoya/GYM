import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { Gym } from '../../models/Gym.js';
import { ApiError } from '../../lib/ApiError.js';
import { verifyPassword, verifyPasswordConstantTime, hashPassword } from '../../lib/password.js';
import { createResetToken, hashToken } from '../../lib/token.js';
import { sendResetEmail } from './email.js';
import { env } from '../../config/env.js';
import { publicTheme } from '../../lib/gymBranding.js';
import { normalizePhone } from '../../lib/phone.js';

/** An identifier with an @ is an email; anything else is a mobile number. */
const findByIdentifier = (identifier) =>
  identifier.includes('@')
    ? User.findOne({ email: identifier.toLowerCase() })
    : User.findOne({ phone: normalizePhone(identifier) });

export const signToken = (user) => {
  const config = env();
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * The gym attached to a session response.
 *
 * The client needs the name to show whose gym it is looking at; it never
 * needs — and is never given — anything it could use to address another one.
 */
export const gymSummary = (gym) =>
  gym
    ? {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        logoUrl: gym.logoUrl ?? null,
        // Expects a populated theme; falls back to the default when it is not.
        theme: publicTheme(gym.theme),
      }
    : null;

/**
 * Verifies credentials and returns { user, token }.
 *
 * `identifier` is a mobile number or an email. Throws the same 401 for an
 * unknown identifier and a wrong password, so the endpoint cannot be used to
 * discover which numbers or addresses have accounts.
 */
export const login = async ({ identifier, password, scope = 'gym', gymSlug }) => {
  const user = await findByIdentifier(identifier).select('+passwordHash');

  // Always run a real bcrypt comparison, even when the user does not exist,
  // so response timing cannot be used to enumerate registered addresses.
  const passwordMatches = await verifyPasswordConstantTime(password, user?.passwordHash);

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized();
  }

  const isPlatformUser = user.role === 'superadmin';

  // Wrong door. Said plainly rather than as a generic 401: the credentials
  // have already been proven, so there is nothing left to disclose, and
  // "invalid email or password" would send a correct password round again.
  if (scope === 'platform' && !isPlatformUser) {
    throw new ApiError(403, 'This account signs in at the gym sign-in page');
  }
  if (scope === 'gym' && isPlatformUser) {
    throw new ApiError(403, 'Platform administrators sign in at /admin-login');
  }

  let gym = null;

  if (!isPlatformUser) {
    gym = await Gym.findById(user.gym).populate('theme');

    if (!gym) throw ApiError.unauthorized();

    // Signed in at another gym's address. Answered exactly like a wrong
    // password: anything more specific would confirm that the email has an
    // account, and at which gym.
    if (gymSlug && gym.slug !== gymSlug) throw ApiError.unauthorized();

    if (!gym.isActive) {
      throw new ApiError(403, 'This gym is suspended. Contact the platform administrator.');
    }
  }

  return { user: user.toJSON(), gym: gymSummary(gym), token: signToken(user) };
};

/** Identical response for every email, so the endpoint cannot enumerate accounts. */
const GENERIC_RESET_MESSAGE =
  'If that email is registered, a password reset link has been sent.';

/**
 * Issues a password-reset token.
 *
 * When ALLOW_DEV_RESET_TOKEN is explicitly enabled, the raw token comes back
 * in the response so the flow can be completed without an email provider.
 * Otherwise it is only emailed.
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

  // Gym accounts reset on their own gym's branded page.
  const gym = user.gym ? await Gym.findById(user.gym).select('slug') : null;
  const resetPath = gym ? `/${gym.slug}/reset-password` : '/reset-password';
  const resetUrl = `${config.clientUrl}${resetPath}?token=${token}`;
  await sendResetEmail({ to: user.email, resetUrl });

  return {
    message: GENERIC_RESET_MESSAGE,
    // Opt-in only. Never keyed off the absence of production, because an
    // unset NODE_ENV would then silently disclose a working reset token.
    ...(config.allowDevResetToken ? { resetToken: token, resetUrl } : {}),
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
