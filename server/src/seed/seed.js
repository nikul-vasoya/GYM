import { Package } from '../models/Package.js';
import { User } from '../models/User.js';
import { hashPassword } from '../lib/password.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Placeholder prices (decision D4). The client confirms the real figures and
 * edits them from Settings — no code change needed.
 */
export const DEFAULT_PACKAGES = [
  { name: '1 Month', durationMonths: 1, price: 1500, sortOrder: 1 },
  { name: '3 Months', durationMonths: 3, price: 4000, sortOrder: 2 },
  { name: '6 Months', durationMonths: 6, price: 7500, sortOrder: 3 },
  { name: '12 Months', durationMonths: 12, price: 14000, sortOrder: 4 },
];

/** Static accounts for testing and the client demo (SRS §1.3). */
export const DEMO_USERS = [
  { name: 'Gym Admin', email: 'admin@gym.com', password: 'Admin@123', role: 'admin' },
  { name: 'Front Desk', email: 'staff@gym.com', password: 'Staff@123', role: 'staff' },
];

/**
 * Inserts any missing packages.
 *
 * Deliberately does NOT update existing rows — an admin's edited price must
 * survive a re-seed.
 */
export const seedPackages = async () => {
  const created = [];

  for (const definition of DEFAULT_PACKAGES) {
    const existing = await Package.findOne({ name: definition.name });
    if (existing) continue;
    created.push(await Package.create(definition));
  }

  return created;
};

/** Inserts any missing demo accounts, never touching an existing password. */
export const seedUsers = async () => {
  const created = [];

  for (const definition of DEMO_USERS) {
    const existing = await User.findOne({ email: definition.email });
    if (existing) continue;

    created.push(
      await User.create({
        name: definition.name,
        email: definition.email,
        role: definition.role,
        passwordHash: await hashPassword(definition.password),
      }),
    );
  }

  return created;
};

/** CLI entry point: `npm run seed`. */
const runFromCli = async () => {
  const config = env();
  await connectDatabase(config.mongodbUri);

  const packages = await seedPackages();
  const users = await seedUsers();

  console.log(`[seed] packages created: ${packages.length}`);
  console.log(`[seed] users created: ${users.length}`);

  if (users.length > 0) {
    console.log('[seed] demo credentials:');
    for (const user of DEMO_USERS) {
      console.log(`  ${user.email} / ${user.password}`);
    }
    console.log('[seed] change these before the app handles real data.');
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
