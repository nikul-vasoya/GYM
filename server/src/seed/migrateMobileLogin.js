import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

/**
 * Brings the accounts collection up to date for mobile sign-in.
 *
 * Replaces the old unique index on email — which counted every account
 * without an email as a duplicate of the others — with partial unique
 * indexes on email and on mobile number. Existing accounts keep signing in
 * with their email until someone adds a mobile number to them. Safe to run
 * more than once.
 *
 * `npm run migrate:mobile-login`
 */
export const migrateMobileLogin = async ({ log = console.log } = {}) => {
  const dropped = await User.syncIndexes();
  log(`[migrate] account indexes rebuilt${dropped.length ? `; dropped ${dropped.join(', ')}` : ''}`);

  const withoutPhone = await User.countDocuments({ role: { $ne: 'superadmin' }, phone: { $exists: false } });
  log(`[migrate] gym accounts still without a mobile number: ${withoutPhone}`);

  return { dropped, withoutPhone };
};

if (process.argv[1]?.endsWith('migrateMobileLogin.js')) {
  (async () => {
    await connectDatabase(env().mongodbUri);
    await migrateMobileLogin();
    await disconnectDatabase();
  })().catch((error) => {
    console.error('[migrate] failed:', error);
    process.exit(1);
  });
}
