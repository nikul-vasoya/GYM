import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../../src/models/User.js';
import { Package } from '../../src/models/Package.js';
import { Member } from '../../src/models/Member.js';
import { Expense } from '../../src/models/Expense.js';
import { createGym } from '../helpers/factories.js';

// Every model below is tenanted, so each test needs a gym to hang it on.
let gym;

beforeEach(async () => {
  gym = await createGym();
});

describe('User model', () => {
  it('lowercases and trims the email', async () => {
    const user = await User.create({
      name: 'Gym Admin',
      email: '  Admin@Gym.COM ',
      passwordHash: 'hashed',
      gym: gym._id,
    });

    expect(user.email).toBe('admin@gym.com');
  });

  it('never exposes the password hash or reset token in JSON', async () => {
    const user = await User.create({
      name: 'Gym Admin',
      email: 'admin@gym.com',
      passwordHash: 'hashed',
      resetTokenHash: 'secret-hash',
      gym: gym._id,
    });

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.resetTokenHash).toBeUndefined();
    expect(json.id).toBe(user._id.toString());
    expect(json.email).toBe('admin@gym.com');
  });

  it('rejects a duplicate email', async () => {
    await User.create({ name: 'A', email: 'dup@gym.com', passwordHash: 'x', gym: gym._id });
    await User.init();

    await expect(
      User.create({ name: 'B', email: 'dup@gym.com', passwordHash: 'y', gym: gym._id }),
    ).rejects.toThrow();
  });

  it('rejects an email already used at another gym', async () => {
    const other = await createGym();
    await User.create({ name: 'A', email: 'shared@gym.com', passwordHash: 'x', gym: gym._id });
    await User.init();

    // Email is the whole login identity (decision M1), so it is unique across
    // the platform, not merely within a gym.
    await expect(
      User.create({ name: 'B', email: 'shared@gym.com', passwordHash: 'y', gym: other._id }),
    ).rejects.toThrow();
  });

  it('requires a gym for a gym account', async () => {
    await expect(
      User.create({ name: 'No gym', email: 'nogym@gym.com', passwordHash: 'x', role: 'admin' }),
    ).rejects.toThrow(/must belong to a gym/i);
  });

  it('refuses to put a platform superadmin inside a gym', async () => {
    await expect(
      User.create({
        name: 'Platform',
        email: 'platform@gym.com',
        passwordHash: 'x',
        role: 'superadmin',
        gym: gym._id,
      }),
    ).rejects.toThrow(/must not belong to a gym/i);
  });

  it('allows a superadmin with no gym', async () => {
    const user = await User.create({
      name: 'Platform',
      email: 'platform@gym.com',
      passwordHash: 'x',
      role: 'superadmin',
    });

    expect(user.gym).toBeNull();
  });
});

describe('Package model', () => {
  it('requires a non-negative price', async () => {
    await expect(
      Package.create({ gym: gym._id, name: '1 Month', durationMonths: 1, price: -1 }),
    ).rejects.toThrow(/price/i);
  });

  it('defaults to active', async () => {
    const pkg = await Package.create({
      gym: gym._id,
      name: '1 Month',
      durationMonths: 1,
      price: 1500,
    });
    expect(pkg.isActive).toBe(true);
  });

  it('lets two gyms each have a package of the same name', async () => {
    const other = await createGym();
    await Package.init();

    await Package.create({ gym: gym._id, name: '3 Months', durationMonths: 3, price: 4000 });
    const twin = await Package.create({
      gym: other._id,
      name: '3 Months',
      durationMonths: 3,
      price: 5500,
    });

    expect(twin.price).toBe(5500);
  });

  it('rejects the same package name twice within one gym', async () => {
    await Package.init();
    await Package.create({ gym: gym._id, name: '3 Months', durationMonths: 3, price: 4000 });

    await expect(
      Package.create({ gym: gym._id, name: '3 Months', durationMonths: 3, price: 4000 }),
    ).rejects.toThrow();
  });
});

describe('Member model', () => {
  const basePackage = { name: '3 Months', durationMonths: 3, price: 4000 };

  const buildMember = (overrides = {}) => ({
    gym: gym._id,
    name: 'Ravi Kumar',
    phone: '9876543210',
    email: 'ravi@example.com',
    gender: 'male',
    packageName: basePackage.name,
    packagePrice: basePackage.price,
    durationMonths: basePackage.durationMonths,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
    ...overrides,
  });

  it('stores a member with a snapshotted package', async () => {
    const pkg = await Package.create({ ...basePackage, gym: gym._id });
    const member = await Member.create(buildMember({ package: pkg._id }));

    expect(member.packagePrice).toBe(4000);
    expect(member.durationMonths).toBe(3);
    expect(member.history).toHaveLength(0);
  });

  it('rejects an unsupported gender', async () => {
    await expect(Member.create(buildMember({ gender: 'unknown' }))).rejects.toThrow(/gender/i);
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      Member.create(
        buildMember({
          startDate: new Date('2026-03-01T00:00:00.000Z'),
          endDate: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow(/end date/i);
  });

  it('rejects a duplicate email regardless of casing', async () => {
    const pkg = await Package.create({ ...basePackage, gym: gym._id });
    await Member.create(buildMember({ package: pkg._id }));
    await Member.init();

    await expect(
      Member.create(buildMember({ package: pkg._id, name: 'Other', phone: '9000000000' })),
    ).rejects.toThrow();
  });

  it('lets another gym register the same email and phone', async () => {
    const other = await createGym();
    const pkg = await Package.create({ ...basePackage, gym: gym._id });
    await Member.init();

    await Member.create(buildMember({ package: pkg._id }));

    // Contact details are unique within a gym, not across the platform —
    // the same person may train at two gyms.
    const twin = await Member.create(buildMember({ package: pkg._id, gym: other._id }));
    expect(twin.email).toBe('ravi@example.com');
  });

  it('allows many members with no email at all', async () => {
    const pkg = await Package.create({ ...basePackage, gym: gym._id });
    await Member.init();
    await Member.create(buildMember({ package: pkg._id, email: undefined, phone: '9000000001' }));
    await Member.create(
      buildMember({ package: pkg._id, email: undefined, phone: '9000000002', name: 'Second' }),
    );

    expect(await Member.countDocuments()).toBe(2);
  });
});

describe('Expense model', () => {
  it('requires a positive amount', async () => {
    await expect(
      Expense.create({ gym: gym._id, date: new Date(), description: 'Dumbbells', amount: 0 }),
    ).rejects.toThrow(/amount/i);
  });

  it('trims the description', async () => {
    const expense = await Expense.create({
      gym: gym._id,
      date: new Date('2026-02-10T00:00:00.000Z'),
      description: '  New treadmill  ',
      amount: 45000,
    });

    expect(expense.description).toBe('New treadmill');
  });
});
