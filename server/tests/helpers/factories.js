import { Package } from '../../src/models/Package.js';
import { Member } from '../../src/models/Member.js';
import { Expense } from '../../src/models/Expense.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { calculateEndDate } from '../../src/lib/membership.js';
import { toUtcMidnight, addDaysUtc, addMonthsUtc } from '../../src/lib/dates.js';

let sequence = 0;
const nextId = () => ++sequence;

export const createUser = async (overrides = {}) => {
  const n = nextId();
  return User.create({
    name: `User ${n}`,
    email: `user${n}@gym.com`,
    passwordHash: await hashPassword('Test@123'),
    role: 'admin',
    ...overrides,
  });
};

export const createPackage = (overrides = {}) => {
  const n = nextId();
  return Package.create({
    name: `Package ${n}`,
    durationMonths: 3,
    price: 4000,
    sortOrder: n,
    ...overrides,
  });
};

/**
 * Creates a member, deriving whichever membership date the test did not pin.
 *
 * A test that only sets `endDate` (to make a member expired, say) gets a
 * start date worked backwards from it — otherwise a fixed default start date
 * would be later than the end date and trip the model's ordering validator.
 */
export const createMember = async (overrides = {}) => {
  const n = nextId();
  const {
    package: packageDoc = await createPackage(),
    startDate,
    endDate,
    ...rest
  } = overrides;

  const durationMonths = rest.durationMonths ?? packageDoc.durationMonths;

  let resolvedStart;
  if (startDate) {
    resolvedStart = toUtcMidnight(startDate);
  } else if (endDate) {
    // Inverse of calculateEndDate.
    resolvedStart = addDaysUtc(addMonthsUtc(endDate, -durationMonths), 1);
  } else {
    resolvedStart = toUtcMidnight('2026-01-01');
  }

  const resolvedEnd = endDate
    ? toUtcMidnight(endDate)
    : calculateEndDate(resolvedStart, durationMonths);

  return Member.create({
    name: `Member ${n}`,
    phone: `90000000${String(n).padStart(2, '0')}`,
    email: `member${n}@example.com`,
    gender: 'male',
    package: packageDoc._id,
    packageName: packageDoc.name,
    packagePrice: packageDoc.price,
    durationMonths,
    startDate: resolvedStart,
    endDate: resolvedEnd,
    ...rest,
  });
};

export const createExpense = (overrides = {}) => {
  const n = nextId();
  return Expense.create({
    date: toUtcMidnight('2026-02-10'),
    description: `Expense ${n}`,
    amount: 1000,
    ...overrides,
  });
};
