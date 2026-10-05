import { Member } from '../../models/Member.js';
import { Package } from '../../models/Package.js';
import { ApiError } from '../../lib/ApiError.js';
import { calculateEndDate, nextRenewalStartDate } from '../../lib/membership.js';
import { toUtcMidnight, todayUtc } from '../../lib/dates.js';
import { buildMemberFilter } from './members.query.js';

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  endDate: { endDate: 1 },
};

/**
 * Loads a package for sale, rejecting unknown or retired ones.
 *
 * Scoped to the gym, so a package id belonging to another gym is "not found"
 * rather than quietly sellable at that gym's price.
 */
const loadSellablePackage = async (gymId, packageId) => {
  const pkg = await Package.findOne({ _id: packageId, gym: gymId });
  if (!pkg) throw ApiError.notFound('Package not found');
  if (!pkg.isActive) throw ApiError.badRequest('That package is no longer available');
  return pkg;
};

/** The package fields copied onto a membership at purchase time (decision D9). */
const snapshotOf = (pkg) => ({
  package: pkg._id,
  packageName: pkg.name,
  packagePrice: pkg.price,
  durationMonths: pkg.durationMonths,
});

export const listMembers = async (gymId, { search, status, packageId, page, limit, sort }) => {
  const filter = buildMemberFilter({ gym: gymId, search, status, packageId });

  const [members, total] = await Promise.all([
    Member.find(filter)
      .sort(SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Member.countDocuments(filter),
  ]);

  return {
    members,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const getMember = async (gymId, id) => {
  const member = await Member.findOne({ _id: id, gym: gymId });
  if (!member) throw ApiError.notFound('Member not found');
  return member;
};

/**
 * Registers a new member (SRS §2.2).
 *
 * The price and end date are always derived — never taken from the request —
 * so the client cannot sell a membership at the wrong price.
 */
export const createMember = async (gymId, { packageId, startDate, ...details }) => {
  const pkg = await loadSellablePackage(gymId, packageId);
  const start = startDate ? toUtcMidnight(startDate) : todayUtc();

  return Member.create({
    ...details,
    gym: gymId,
    ...snapshotOf(pkg),
    startDate: start,
    endDate: calculateEndDate(start, pkg.durationMonths),
  });
};

/**
 * Edits a member (SRS §2.4).
 *
 * Changing the package or the start date re-derives the end date; editing
 * only contact details leaves the membership period exactly as it was.
 */
export const updateMember = async (gymId, id, { packageId, startDate, ...details }) => {
  const member = await getMember(gymId, id);

  Object.assign(member, details);

  if (packageId && packageId !== member.package.toString()) {
    Object.assign(member, snapshotOf(await loadSellablePackage(gymId, packageId)));
  }

  if (startDate) {
    member.startDate = toUtcMidnight(startDate);
  }

  if (packageId || startDate) {
    member.endDate = calculateEndDate(member.startDate, member.durationMonths);
  }

  await member.save();
  return member;
};

/**
 * Renews a membership (decision D8, SRS §3.3).
 *
 * Archives the period that is ending into `history` and starts a new one, so
 * the member drops out of the Expiry list and the gym keeps a purchase record.
 */
export const renewMember = async (gymId, id, { packageId } = {}) => {
  const member = await getMember(gymId, id);
  const pkg = await loadSellablePackage(gymId, packageId ?? member.package.toString());

  member.history.push({
    package: member.package,
    packageName: member.packageName,
    packagePrice: member.packagePrice,
    durationMonths: member.durationMonths,
    startDate: member.startDate,
    endDate: member.endDate,
  });

  const start = nextRenewalStartDate(member.endDate);

  Object.assign(member, snapshotOf(pkg));
  member.startDate = start;
  member.endDate = calculateEndDate(start, pkg.durationMonths);

  await member.save();
  return member;
};
