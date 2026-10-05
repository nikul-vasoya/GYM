import { User } from '../models/User.js';
import { hashPassword } from '../lib/password.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { ensureSystemThemes, SYSTEM_THEMES } from '../lib/systemThemes.js';

// Re-exported so the gym provisioning path and the seeds agree on one list.
export { DEFAULT_PACKAGES, createDefaultPackages } from '../lib/defaultPackages.js';

/**
 * The platform operator's account.
 *
 * This is the only account the seed creates. Gyms — and every gym admin and
 * staff account — are created from the platform screen at `/admin-login`,
 * never from a seed, so no gym ever exists without an owner who asked for it.
 *
 * Credentials come from the environment when set, so a real deployment never
 * has to ship with the documented default.
 */
export const superadminDefinition = () => ({
  name: process.env.SUPERADMIN_NAME ?? 'Platform Admin',
  email: (process.env.SUPERADMIN_EMAIL ?? 'superadmin@platform.com').toLowerCase(),
  password: process.env.SUPERADMIN_PASSWORD ?? 'Super@123',
});

/**
 * Creates the superadmin if it is missing.
 *
 * Idempotent, and never touches an existing password — re-running the seed
 * after the operator has changed their own password must not undo that.
 */
export const seedSuperadmin = async () => {
  const definition = superadminDefinition();

  const existing = await User.findOne({ email: definition.email });
  if (existing) return null;

  return User.create({
    name: definition.name,
    email: definition.email,
    role: 'superadmin',
    gym: null,
    passwordHash: await hashPassword(definition.password),
  });
};

/** CLI entry point: `npm run seed`. */
const runFromCli = async () => {
  const config = env();
  await connectDatabase(config.mongodbUri);

  await ensureSystemThemes();
  console.log(`[seed] ${SYSTEM_THEMES.length} built-in themes are in place.`);

  const created = await seedSuperadmin();
  const definition = superadminDefinition();

  if (created) {
    console.log('[seed] platform administrator created:');
    console.log(`  ${definition.email} / ${definition.password}`);
    console.log('[seed] sign in at /admin-login and create your first gym.');
    console.log('[seed] change this password before the app handles real data.');
  } else {
    console.log(`[seed] platform administrator already exists: ${definition.email}`);
  }

  await disconnectDatabase();
};

// Only run when executed directly, never when imported by a test.
if (process.argv[1]?.endsWith('seed.js')) {
  runFromCli().catch((error) => {
    console.error('[seed] failed:', error);
    process.exit(1);
  });
}
