import { Gym, slugify } from '../../src/models/Gym.js';
import { Package } from '../../src/models/Package.js';
import { Member } from '../../src/models/Member.js';
import { Expense } from '../../src/models/Expense.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { calculateEndDate } from '../../src/lib/membership.js';
import { toUtcMidnight, addDaysUtc, addMonthsUtc } from '../../src/lib/dates.js';

let sequence = 0;
const nextId = () => ++sequence;

export const createGym = (overrides = {}) => {
  const n = nextId();
  const name = overrides.name ?? `Gym ${n}`;
  return Gym.create({ name, slug: `${slugify(name)}-${n}`, ...overrides });
};

/**
 * The gym a test works in when it does not say.
 *
 * Almost every test is about one gym and does not care which, so the first
 * factory call creates one and the rest of that test reuses it — the user,
 * the packages and the members all land in the same gym without any test
 * having to say so. Tests that are ABOUT tenancy pass gyms explicitly.
 *
 * Reset between tests by `tests/setup.js`, alongside the database wipe.
 */
let defaultGym = null;

export const resetDefaultGym = () => {
  defaultGym = null;
};

/** The gym the current test is working in, creating it if needed. */
export const currentGym = async () => {
  if (!defaultGym) defaultGym = await createGym();
  return defaultGym;
};

const resolveGym = async (gym) => gym ?? currentGym();

export const createUser = async (overrides = {}) => {
  const n = nextId();
  const { gym, role = 'admin', ...rest } = overrides;

  // A superadmin belongs to no gym; everyone else must have one.
  const gymId = role === 'superadmin' ? null : (await resolveGym(gym))._id;

  return User.create({
    name: `User ${n}`,
    email: `user${n}@gym.com`,
    // Superadmins sign in by email only; gym accounts carry a mobile.
    ...(role === 'superadmin' ? {} : { phone: `70000${String(n).padStart(5, '0')}` }),
    passwordHash: await hashPassword('Test@123'),
    role,
    gym: gymId,
    ...rest,
  });
};

export const createPackage = async (overrides = {}) => {
  const n = nextId();
  const { gym, ...rest } = overrides;

  return Package.create({
    gym: (await resolveGym(gym))._id,
    name: `Package ${n}`,
    durationMonths: 3,
    price: 4000,
    sortOrder: n,
    ...rest,
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
  const { gym, startDate, endDate, ...rest } = overrides;

  // The member, its package and its gym must agree, so the package is created
  // in the same gym unless the test supplied one itself.
  const gymDoc = await resolveGym(gym);
  const packageDoc = rest.package ?? (await createPackage({ gym: gymDoc }));
  delete rest.package;

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
    gym: packageDoc.gym ?? gymDoc._id,
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

export const createExpense = async (overrides = {}) => {
  const n = nextId();
  const { gym, ...rest } = overrides;

  return Expense.create({
    gym: (await resolveGym(gym))._id,
    date: toUtcMidnight('2026-02-10'),
    description: `Expense ${n}`,
    amount: 1000,
    ...rest,
  });
};
