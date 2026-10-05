import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Gym } from '../models/Gym.js';
import { ApiError } from '../lib/ApiError.js';
import { env } from '../config/env.js';

/**
 * Guards every protected route (SRS §6.4).
 *
 * Re-reads the user on each request rather than trusting the token payload,
 * so a deleted or disabled account stops working immediately instead of at
 * token expiry. The gym is re-read for the same reason: suspending a gym has
 * to lock its staff out now, not whenever their week-old token runs out.
 *
 * Sets `req.gymId` from the stored user. That value is the ONLY source of
 * tenancy in the application — no route reads a gym id from a body, query or
 * URL, which is what makes cross-tenant access impossible rather than merely
 * unlikely.
 */
export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Please sign in to continue'));
  }

  let payload;
  try {
    payload = jwt.verify(token, env().jwtSecret);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'Please sign in to continue';
    return next(new ApiError(401, message));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return next(new ApiError(401, 'Please sign in to continue'));
  }

  if (user.role !== 'superadmin') {
    const gym = await Gym.findById(user.gym).select('isActive');

    // The gym was deleted out from under the account, or has been suspended.
    if (!gym) return next(new ApiError(401, 'Please sign in to continue'));
    if (!gym.isActive) {
      return next(
        new ApiError(403, 'This gym is suspended. Contact the platform administrator.'),
      );
    }
  }

  req.user = user;
  req.gymId = user.gym ?? null;
  return next();
};

/**
 * Restricts a route to the listed roles. Always mounted after `requireAuth`.
 *
 * Usage: router.post('/', requireAuth, requireRole('admin'), handler)
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Please sign in to continue'));
  }

  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to do that'));
  }

  return next();
};

/** The platform operator: gyms administration only, never gym data. */
export const requirePlatformAdmin = requireRole('superadmin');

/**
 * Anyone who belongs to a gym.
 *
 * Mounted on every data route, which is also what keeps a superadmin out of
 * an individual gym's member records.
 */
export const requireGymUser = requireRole('admin', 'staff');

/** A gym's own administrator: staff accounts and package prices (M3). */
export const requireGymAdmin = requireRole('admin');
