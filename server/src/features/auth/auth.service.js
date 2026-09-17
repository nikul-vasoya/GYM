import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { ApiError } from '../../lib/ApiError.js';
import { verifyPassword } from '../../lib/password.js';
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
