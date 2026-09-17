import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Package } from '../models/Package.js';
import { Member } from '../models/Member.js';
import { Expense } from '../models/Expense.js';
import { calculateEndDate } from '../lib/membership.js';
import { addDaysUtc, addMonthsUtc, todayUtc, toIsoDate } from '../lib/dates.js';
import { seedPackages } from './seed.js';

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
  await seedPackages();

  const packages = await Package.find().sort({ sortOrder: 1 });
  const today = todayUtc();

  await Member.deleteMany({});
  await Expense.deleteMany({});

  for (const [index, name] of NAMES.entries()) {
    const pkg = packages[index % packages.length];

    // Cycle through: comfortably active, inside the reminder window, expired.
    const offsets = [45, pkg.durationMonths === 1 ? 1 : 3, -12];
    const daysUntilEnd = offsets[index % offsets.length];

    const endDate = addDaysUtc(today, daysUntilEnd);
    const startDate = addDaysUtc(addMonthsUtc(endDate, -pkg.durationMonths), 1);

    await Member.create({
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
        date: addMonthsUtc(today, -monthsAgo),
        description,
        amount,
      });
    }
  }

  console.log(`[seed:demo] ${NAMES.length} members and expenses created up to ${toIsoDate(today)}`);
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
