import { signToken } from '../../src/features/auth/auth.service.js';
import { createUser } from './factories.js';

/**
 * Creates a user and returns the header to authenticate as them.
 *
 * Usage:
 *   const { header } = await authenticate();
 *   await request(app).get('/api/members').set(header);
 */
export const authenticate = async (overrides = {}) => {
  const user = await createUser(overrides);
  const token = signToken(user);

  return { user, token, header: { Authorization: `Bearer ${token}` } };
};
