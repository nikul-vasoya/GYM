import { describe, it, expect } from 'vitest';
import { seedSuperadmin, superadminDefinition } from '../../src/seed/seed.js';
import { createDefaultPackages, DEFAULT_PACKAGES } from '../../src/lib/defaultPackages.js';
import { Package } from '../../src/models/Package.js';
import { User } from '../../src/models/User.js';
import { verifyPassword } from '../../src/lib/password.js';
import { createGym } from '../helpers/factories.js';

describe('createDefaultPackages', () => {
  it('creates the four packages from the SRS, owned by the gym', async () => {
    const gym = await createGym();

    await createDefaultPackages(gym._id);

    const packages = await Package.find({ gym: gym._id }).sort({ sortOrder: 1 });
    expect(packages.map((p) => p.name)).toEqual(['1 Month', '3 Months', '6 Months', '12 Months']);
    expect(packages.map((p) => p.durationMonths)).toEqual([1, 3, 6, 12]);
    expect(packages.every((p) => String(p.gym) === gym.id)).toBe(true);
  });

  it('is idempotent — running twice does not duplicate', async () => {
    const gym = await createGym();

    await createDefaultPackages(gym._id);
    await createDefaultPackages(gym._id);

    expect(await Package.countDocuments({ gym: gym._id })).toBe(DEFAULT_PACKAGES.length);
  });

  it('does not overwrite a price an admin has already changed', async () => {
    const gym = await createGym();
    await createDefaultPackages(gym._id);
    await Package.updateOne({ gym: gym._id, name: '1 Month' }, { price: 9999 });

    await createDefaultPackages(gym._id);

    const onemonth = await Package.findOne({ gym: gym._id, name: '1 Month' });
    expect(onemonth.price).toBe(9999);
  });

  it('gives each gym its own copy, so one gym repricing cannot touch another', async () => {
    const first = await createGym();
    const second = await createGym();

    await createDefaultPackages(first._id);
    await createDefaultPackages(second._id);
    await Package.updateOne({ gym: first._id, name: '1 Month' }, { price: 9999 });

    const untouched = await Package.findOne({ gym: second._id, name: '1 Month' });
    expect(untouched.price).toBe(1500);
  });
});

describe('seedSuperadmin', () => {
  it('creates the platform account with a usable hashed password', async () => {
    const created = await seedSuperadmin();
    const { email, password } = superadminDefinition();

    expect(created).not.toBeNull();

    const admin = await User.findOne({ email }).select('+passwordHash');
    expect(admin.role).toBe('superadmin');
    expect(admin.gym).toBeNull();
    expect(admin.passwordHash).not.toContain(password);
    expect(await verifyPassword(password, admin.passwordHash)).toBe(true);
  });

  it('is idempotent and leaves an existing password untouched', async () => {
    await seedSuperadmin();
    const { email } = superadminDefinition();
    await User.updateOne({ email }, { passwordHash: 'already-changed' });

    const created = await seedSuperadmin();

    expect(created).toBeNull();
    const admin = await User.findOne({ email }).select('+passwordHash');
    expect(admin.passwordHash).toBe('already-changed');
  });

  it('creates no gym, and therefore no gym data', async () => {
    await seedSuperadmin();

    // A gym only ever exists because someone asked for it from /admin-login.
    expect(await Package.countDocuments()).toBe(0);
    expect(await User.countDocuments({ gym: { $ne: null } })).toBe(0);
  });
});
