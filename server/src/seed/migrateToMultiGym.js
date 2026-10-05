import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Gym, slugify } from '../models/Gym.js';
import { User } from '../models/User.js';
import { Member } from '../models/Member.js';
import { Package } from '../models/Package.js';
import { Expense } from '../models/Expense.js';
import { createDefaultPackages } from '../lib/defaultPackages.js';

/**
 * Moves a single-gym database onto the multi-gym model.
 *
 * Everything that predates tenancy has no `gym` field. This adopts all of it
 * into one gym, so an existing deployment keeps its members, expenses,
 * packages and accounts instead of going dark the moment tenancy is enforced.
 *
 * Safe to run more than once: each step only touches documents that still
 * have no gym, so a second run reports zeroes and changes nothing.
 *
 * `npm run migrate:multi-gym --workspace server`
 * Set MIGRATION_GYM_NAME to name the gym (default: "My Gym").
 */
export const migrateToMultiGym = async ({ log = console.log } = {}) => {
  const name = process.env.MIGRATION_GYM_NAME ?? 'My Gym';

  // Adopt into the existing gym if this has been run before, otherwise make one.
  let gym = await Gym.findOne().sort({ createdAt: 1 });

  if (!gym) {
    gym = await Gym.create({ name, slug: slugify(name) || 'my-gym' });
    log(`[migrate] created gym "${gym.name}" (${gym.slug})`);
  } else {
    log(`[migrate] adopting into existing gym "${gym.name}" (${gym.slug})`);
  }

  // `null` and "field absent" are different queries in Mongo; older documents
  // have no field at all, and a re-run may meet explicit nulls.
  const orphaned = { $or: [{ gym: { $exists: false } }, { gym: null }] };

  const [members, expenses, packages] = await Promise.all([
    Member.updateMany(orphaned, { $set: { gym: gym._id } }),
    Expense.updateMany(orphaned, { $set: { gym: gym._id } }),
    Package.updateMany(orphaned, { $set: { gym: gym._id } }),
  ]);

  // Only gym accounts are adopted. A superadmin legitimately has no gym and
  // must keep it that way, or it would lose access to the platform screens.
  const users = await User.updateMany(
    { $and: [orphaned, { role: { $ne: 'superadmin' } }] },
    { $set: { gym: gym._id } },
  );

  const seededPackages = await createDefaultPackages(gym._id);

  /*
   * Rebuild the indexes.
   *
   * This is the step that is easy to forget and expensive to skip: the old
   * database still carries the single-gym unique indexes on member email,
   * member phone and package name. Left in place they would stop a second
   * gym ever registering a member with the same phone number. syncIndexes
   * drops what the schema no longer declares and builds what it now does.
   */
  for (const model of [Member, Package, User, Expense, Gym]) {
    await model.syncIndexes();
  }

  const summary = {
    gym: gym.toJSON(),
    members: members.modifiedCount,
    expenses: expenses.modifiedCount,
    packages: packages.modifiedCount,
    users: users.modifiedCount,
    packagesCreated: seededPackages.length,
  };

  log(
    `[migrate] adopted ${summary.members} members, ${summary.expenses} expenses, ` +
      `${summary.packages} packages, ${summary.users} accounts`,
  );
  if (summary.packagesCreated > 0) {
    log(`[migrate] added ${summary.packagesCreated} missing default packages`);
  }
  log('[migrate] indexes rebuilt for the multi-gym schema');

  return summary;
};

const runFromCli = async () => {
  await connectDatabase(env().mongodbUri);

  const summary = await migrateToMultiGym();

  const admins = await User.countDocuments({ gym: summary.gym.id, role: 'admin' });
  if (admins === 0) {
    console.warn(
      '[migrate] WARNING: this gym has no administrator. Create one from /admin-login.',
    );
  }

  await disconnectDatabase();
  await mongoose.connection.close();
};

// Only run when executed directly, never when imported by a test.
if (process.argv[1]?.endsWith('migrateToMultiGym.js')) {
  runFromCli().catch((error) => {
    console.error('[migrate] failed:', error);
    process.exit(1);
  });
}
