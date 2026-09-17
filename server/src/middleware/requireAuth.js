import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../lib/ApiError.js';
import { env } from '../config/env.js';

/**
 * Guards every protected route (SRS §6.4).
 *
 * Re-reads the user on each request rather than trusting the token payload,
 * so a deleted or disabled account stops working immediately instead of at
 * token expiry.
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

  req.user = user;
  return next();
};
