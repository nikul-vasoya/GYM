import { Member } from '../../models/Member.js';
import { Package } from '../../models/Package.js';
import { ApiError } from '../../lib/ApiError.js';
import { calculateEndDate } from '../../lib/membership.js';
import { toUtcMidnight, todayUtc } from '../../lib/dates.js';
import { buildMemberFilter } from './members.query.js';

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  endDate: { endDate: 1 },
};

/** Loads a package for sale, rejecting unknown or retired ones. */
const loadSellablePackage = async (packageId) => {
  const pkg = await Package.findById(packageId);
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

export const listMembers = async ({ search, status, packageId, page, limit, sort }) => {
  const filter = buildMemberFilter({ search, status, packageId });

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

export const getMember = async (id) => {
  const member = await Member.findById(id);
  if (!member) throw ApiError.notFound('Member not found');
  return member;
};

/**
 * Registers a new member (SRS §2.2).
 *
 * The price and end date are always derived — never taken from the request —
 * so the client cannot sell a membership at the wrong price.
 */
export const createMember = async ({ packageId, startDate, ...details }) => {
  const pkg = await loadSellablePackage(packageId);
  const start = startDate ? toUtcMidnight(startDate) : todayUtc();

  return Member.create({
    ...details,
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
export const updateMember = async (id, { packageId, startDate, ...details }) => {
  const member = await getMember(id);

  Object.assign(member, details);

  if (packageId && packageId !== member.package.toString()) {
    Object.assign(member, snapshotOf(await loadSellablePackage(packageId)));
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

// `renewMember` is added in Step 12, after its test is written and failing.
