import { describe, it, expect } from 'vitest';
import { seedPackages, seedUsers, DEFAULT_PACKAGES } from '../../src/seed/seed.js';
import { Package } from '../../src/models/Package.js';
import { User } from '../../src/models/User.js';
import { verifyPassword } from '../../src/lib/password.js';

describe('seedPackages', () => {
  it('creates the four packages from the SRS', async () => {
    await seedPackages();

    const packages = await Package.find().sort({ sortOrder: 1 });
    expect(packages.map((p) => p.name)).toEqual([
      '1 Month',
      '3 Months',
      '6 Months',
      '12 Months',
    ]);
    expect(packages.map((p) => p.durationMonths)).toEqual([1, 3, 6, 12]);
  });

  it('is idempotent — running twice does not duplicate', async () => {
    await seedPackages();
    await seedPackages();

    expect(await Package.countDocuments()).toBe(DEFAULT_PACKAGES.length);
  });

  it('does not overwrite a price an admin has already changed', async () => {
    await seedPackages();
    await Package.updateOne({ name: '1 Month' }, { price: 9999 });

    await seedPackages();

    const onemonth = await Package.findOne({ name: '1 Month' });
    expect(onemonth.price).toBe(9999);
  });
});

describe('seedUsers', () => {
  it('creates the demo accounts with usable hashed passwords', async () => {
    const created = await seedUsers();

    expect(created).toHaveLength(2);

    const admin = await User.findOne({ email: 'admin@gym.com' }).select('+passwordHash');
    expect(admin.name).toBe('Gym Admin');
    expect(admin.passwordHash).not.toContain('Admin@123');
    expect(await verifyPassword('Admin@123', admin.passwordHash)).toBe(true);
  });

  it('is idempotent and leaves an existing password untouched', async () => {
    await seedUsers();
    await User.updateOne({ email: 'admin@gym.com' }, { passwordHash: 'already-changed' });

    const created = await seedUsers();

    expect(created).toHaveLength(0);
    const admin = await User.findOne({ email: 'admin@gym.com' }).select('+passwordHash');
    expect(admin.passwordHash).toBe('already-changed');
  });
});
