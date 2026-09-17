import { describe, it, expect, beforeEach } from 'vitest';
import { buildMemberFilter, buildSearchFilter } from '../../src/features/members/members.query.js';
import { Member } from '../../src/models/Member.js';
import { createMember, createPackage } from '../helpers/factories.js';

const TODAY = '2026-03-15';

/** Creates a member whose membership ends exactly `days` from TODAY. */
const memberEndingIn = async (days, durationMonths) => {
  const pkg = await createPackage({ durationMonths, name: `P${durationMonths}-${days}` });
  const endDate = new Date(Date.UTC(2026, 2, 15 + days));

  return createMember({
    package: pkg,
    durationMonths,
    startDate: '2026-01-01',
    endDate,
  });
};

describe('buildSearchFilter', () => {
  it('returns an empty filter for blank input', () => {
    expect(buildSearchFilter('')).toEqual({});
    expect(buildSearchFilter('   ')).toEqual({});
    expect(buildSearchFilter(undefined)).toEqual({});
  });

  it('matches name, phone or email case-insensitively', async () => {
    await createMember({ name: 'Priya Sharma', email: 'priya@example.com', phone: '9811111111' });
    await createMember({ name: 'Rahul Verma', email: 'rahul@example.com', phone: '9822222222' });

    expect(await Member.countDocuments(buildSearchFilter('priya'))).toBe(1);
    expect(await Member.countDocuments(buildSearchFilter('PRIYA'))).toBe(1);
    expect(await Member.countDocuments(buildSearchFilter('9822'))).toBe(1);
    expect(await Member.countDocuments(buildSearchFilter('example.com'))).toBe(2);
  });

  it('treats regex characters as literal text', async () => {
    await createMember({ name: 'Priya Sharma' });

    // Without escaping, '.*' would match every member.
    expect(await Member.countDocuments(buildSearchFilter('.*'))).toBe(0);
  });
});

describe('buildMemberFilter — status', () => {
  beforeEach(async () => {
    await memberEndingIn(-1, 3); // expired yesterday
    await memberEndingIn(0, 3); // last day
    await memberEndingIn(5, 3); // 3-month, exactly at its 5-day threshold
    await memberEndingIn(6, 3); // 3-month, one day outside
    await memberEndingIn(2, 1); // 1-month, exactly at its 2-day threshold
    await memberEndingIn(3, 1); // 1-month, one day outside
  });

  const namesMatching = async (status) => {
    const members = await Member.find(buildMemberFilter({ status, today: TODAY })).sort({
      endDate: 1,
    });
    return members.map((m) => m.durationMonths + '/' + m.endDate.toISOString().slice(0, 10));
  };

  it('expired = end date already passed', async () => {
    expect(await namesMatching('expired')).toEqual(['3/2026-03-14']);
  });

  it('expiring-soon respects the per-package threshold', async () => {
    // Qualifying: the 3-month ending today, the 1-month ending in 2 days (its
    // threshold), and the 3-month ending in 5 days (its threshold).
    // Excluded: the 1-month ending in 3 days and the 3-month ending in 6 days.
    expect(await namesMatching('expiring-soon')).toEqual([
      '3/2026-03-15',
      '1/2026-03-17',
      '3/2026-03-20',
    ]);
  });

  it('active excludes both expired and expiring-soon members', async () => {
    const active = await Member.find(buildMemberFilter({ status: 'active', today: TODAY }));
    expect(active).toHaveLength(2);
  });

  it('no status returns every member', async () => {
    expect(await Member.countDocuments(buildMemberFilter({ today: TODAY }))).toBe(6);
  });

  it('every member falls into exactly one status bucket', async () => {
    const counts = await Promise.all(
      ['expired', 'expiring-soon', 'active'].map((status) =>
        Member.countDocuments(buildMemberFilter({ status, today: TODAY })),
      ),
    );

    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(6);
  });
});

describe('buildMemberFilter — combining filters', () => {
  it('ANDs search with status instead of letting the $or clauses collide', async () => {
    const pkg = await createPackage({ durationMonths: 3 });
    await createMember({
      name: 'Expiring Anita',
      package: pkg,
      durationMonths: 3,
      startDate: '2026-01-01',
      endDate: new Date(Date.UTC(2026, 2, 17)),
    });
    await createMember({
      name: 'Active Anita',
      package: pkg,
      durationMonths: 3,
      startDate: '2026-01-01',
      endDate: new Date(Date.UTC(2026, 5, 30)),
    });

    const filter = buildMemberFilter({ search: 'Anita', status: 'expiring-soon', today: TODAY });
    const found = await Member.find(filter);

    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Expiring Anita');
  });

  it('filters by package', async () => {
    const premium = await createPackage({ name: 'Premium' });
    const basic = await createPackage({ name: 'Basic' });
    await createMember({ package: premium });
    await createMember({ package: basic });

    const filter = buildMemberFilter({ packageId: premium.id, today: TODAY });
    expect(await Member.countDocuments(filter)).toBe(1);
  });
});
