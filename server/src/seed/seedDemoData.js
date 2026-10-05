import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Package } from '../models/Package.js';
import { Member } from '../models/Member.js';
import { Expense } from '../models/Expense.js';
import { calculateEndDate } from '../lib/membership.js';
import { addDaysUtc, addMonthsUtc, todayUtc, toIsoDate } from '../lib/dates.js';
import { Gym } from '../models/Gym.js';
import { createDefaultPackages } from '../lib/defaultPackages.js';

const NAMES = [
  'Priya Sharma', 'Rahul Verma', 'Anita Desai', 'Vikram Singh', 'Meera Nair',
  'Arjun Patel', 'Kavya Reddy', 'Sanjay Gupta', 'Divya Menon', 'Rohit Joshi',
  'Neha Kapoor', 'Amit Chauhan', 'Sneha Iyer', 'Karan Malhotra', 'Pooja Rao',
];

const GENDERS = ['female', 'male', 'female', 'male', 'other'];

/**
 * Creates members spread across all three statuses, so Members, Expiry and
 * Action Required all have realistic content for a demo.
 *
 * DESTRUCTIVE: wipes every member and expense first. Never run against live
 * client data — see `npm run seed:demo` in package.json.
 */
const run = async () => {
  await connectDatabase(env().mongodbUri);

  // Demo data belongs to one gym. Pick it by slug when given, otherwise the
  // oldest — there is no sensible "all gyms" meaning for this script.
  const slug = process.env.DEMO_GYM_SLUG;
  const gym = slug ? await Gym.findOne({ slug }) : await Gym.findOne().sort({ createdAt: 1 });

  if (!gym) {
    throw new Error(
      'No gym found. Sign in at /admin-login and create one first, or run the migration.',
    );
  }

  await createDefaultPackages(gym._id);

  const packages = await Package.find({ gym: gym._id }).sort({ sortOrder: 1 });
  const today = todayUtc();

  // Scoped deletes: seeding one gym's demo data must not wipe another's.
  await Member.deleteMany({ gym: gym._id });
  await Expense.deleteMany({ gym: gym._id });

  for (const [index, name] of NAMES.entries()) {
    const pkg = packages[index % packages.length];

    // Cycle through: comfortably active, inside the reminder window, expired.
    const offsets = [45, pkg.durationMonths === 1 ? 1 : 3, -12];
    const daysUntilEnd = offsets[index % offsets.length];

    const endDate = addDaysUtc(today, daysUntilEnd);
    const startDate = addDaysUtc(addMonthsUtc(endDate, -pkg.durationMonths), 1);

    await Member.create({
      gym: gym._id,
      name,
      phone: `98${String(10000000 + index).padStart(8, '0')}`,
      email: `${name.split(' ')[0].toLowerCase()}${index}@example.com`,
      gender: GENDERS[index % GENDERS.length],
      package: pkg._id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      durationMonths: pkg.durationMonths,
      startDate,
      endDate: calculateEndDate(startDate, pkg.durationMonths),
    });
  }

  const EXPENSES = [
    ['Electricity bill', 8200],
    ['Treadmill servicing', 4500],
    ['Cleaning supplies', 1200],
    ['Trainer salary', 25000],
    ['New dumbbell set', 14000],
    ['Water cooler refill', 900],
  ];

  for (let monthsAgo = 0; monthsAgo < 6; monthsAgo += 1) {
    for (const [description, amount] of EXPENSES.slice(0, 3 + (monthsAgo % 3))) {
      await Expense.create({
        gym: gym._id,
        date: addMonthsUtc(today, -monthsAgo),
        description,
        amount,
      });
    }
  }

  console.log(
    `[seed:demo] ${NAMES.length} members and expenses created for "${gym.name}" ` +
      `up to ${toIsoDate(today)}`,
  );
  await disconnectDatabase();
};

// Only run when executed directly, never when imported by a test — mirrors
// seed.js so importing this module can never trigger the deleteMany calls.
if (process.argv[1]?.endsWith('seedDemoData.js')) {
  run().catch((error) => {
    console.error('[seed:demo] failed:', error);
    process.exit(1);
  });
}
