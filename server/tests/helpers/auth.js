import { signToken } from '../../src/features/auth/auth.service.js';
import { Gym } from '../../src/models/Gym.js';
import { createUser } from './factories.js';

/**
 * Creates a user and returns the header to authenticate as them.
 *
 * Also returns the gym they belong to — the same gym the other factories
 * default to — so a test can assert against it without re-deriving it.
 *
 * Usage:
 *   const { header } = await authenticate();
 *   await request(app).get('/api/members').set(header);
 *
 *   const { header } = await authenticate({ role: 'staff' });
 *   const { header } = await authenticate({ role: 'superadmin' });
 */
export const authenticate = async (overrides = {}) => {
  const user = await createUser(overrides);
  const token = signToken(user);
  // Read back from the user, so an explicitly-passed gym is the one returned.
  const gym = user.gym ? await Gym.findById(user.gym) : null;

  return { user, gym, token, header: { Authorization: `Bearer ${token}` } };
};
