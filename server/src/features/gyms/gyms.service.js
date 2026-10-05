import { Gym, slugify } from '../../models/Gym.js';
import { User } from '../../models/User.js';
import { Member } from '../../models/Member.js';
import { Package } from '../../models/Package.js';
import { Expense } from '../../models/Expense.js';
import { ApiError } from '../../lib/ApiError.js';
import { hashPassword } from '../../lib/password.js';
import { createDefaultPackages } from '../../lib/defaultPackages.js';
import { Theme } from '../../models/Theme.js';
import { defaultThemeId } from '../../lib/systemThemes.js';
import { isReservedSlug } from '../../lib/reservedSlugs.js';
import { publicTheme } from '../../lib/gymBranding.js';
import { saveLogo, deleteLogo } from '../../lib/storage.js';
import { assertAccountFree } from '../../lib/accountFields.js';

/**
 * A gym as the platform console sees it: its theme flattened to the colours
 * the client paints with. Expects `theme` to be populated.
 */
export const serializeGym = (gym) => ({ ...gym.toJSON(), theme: publicTheme(gym.theme) });

/** Refuses a slug another gym already answers to. */
const assertSlugFree = async (slug, exceptId) => {
  const taken = await Gym.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (taken) {
    throw ApiError.conflict('Another gym already uses that address', {
      slug: 'Another gym already uses that address',
    });
  }
};

/** The theme to store: the one asked for (which must exist), or the default. */
const resolveTheme = async (themeId) => {
  if (!themeId) return defaultThemeId();

  if (!(await Theme.exists({ _id: themeId }))) {
    throw ApiError.badRequest('Please correct the highlighted fields', {
      theme: 'That theme no longer exists',
    });
  }
  return themeId;
};

/**
 * Finds a free slug for a gym name.
 *
 * Two gyms may legitimately share a name ("Iron House" in two cities), so a
 * collision appends a counter rather than failing the whole creation.
 */
export const uniqueSlug = async (name) => {
  const base = slugify(name) || 'gym';

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (isReservedSlug(candidate)) continue;
    const taken = await Gym.exists({ slug: candidate });
    if (!taken) return candidate;
  }

  throw ApiError.badRequest('Could not derive a unique address for that gym name');
};

/**
 * Creates a gym, its default packages and its first admin account.
 *
 * Mongo transactions are not available here (the test suite and most small
 * deployments run a standalone mongod, not a replica set), so a failure part
 * way through is undone by hand. Leaving a gym with no administrator behind
 * would be worse than failing outright.
 */
export const provisionGym = async ({ admin, createdBy, slug, theme, ...details }) => {
  const email = admin.email ? admin.email.toLowerCase() : null;
  await assertAccountFree({ phone: admin.phone, email });

  if (slug) await assertSlugFree(slug);

  const gym = await Gym.create({
    ...details,
    slug: slug ?? (await uniqueSlug(details.name)),
    theme: await resolveTheme(theme),
    createdBy: createdBy ?? null,
  });

  try {
    await createDefaultPackages(gym._id);

    const user = await User.create({
      name: admin.name,
      phone: admin.phone,
      ...(email ? { email } : {}),
      role: 'admin',
      gym: gym._id,
      passwordHash: await hashPassword(admin.password),
    });

    return { gym, admin: user };
  } catch (error) {
    // Roll back by hand: a gym nobody can sign in to is not a useful gym.
    await Package.deleteMany({ gym: gym._id });
    await Gym.deleteOne({ _id: gym._id });
    throw error;
  }
};

/**
 * Every gym with the counts the platform list shows.
 *
 * Counted with grouped aggregations rather than a query per gym, so the list
 * stays two round trips however many gyms there are.
 */
export const listGymsWithCounts = async () => {
  const [gyms, memberCounts, staffCounts] = await Promise.all([
    Gym.find().sort({ createdAt: -1 }).populate('theme'),
    Member.aggregate([{ $group: { _id: '$gym', count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { gym: { $ne: null } } },
      { $group: { _id: '$gym', count: { $sum: 1 } } },
    ]),
  ]);

  const byGym = (rows) => new Map(rows.map((row) => [String(row._id), row.count]));
  const members = byGym(memberCounts);
  const staff = byGym(staffCounts);

  return gyms.map((gym) => ({
    ...serializeGym(gym),
    memberCount: members.get(gym.id) ?? 0,
    staffCount: staff.get(gym.id) ?? 0,
  }));
};

/** Suspends or reactivates a gym (M2). */
export const setGymActive = async (id, isActive) => {
  const gym = await Gym.findByIdAndUpdate(id, { isActive }, { new: true, runValidators: true })
    .populate('theme');
  if (!gym) throw ApiError.notFound('Gym not found');
  return gym;
};

const findGym = async (id) => {
  const gym = await Gym.findById(id);
  if (!gym) throw ApiError.notFound('Gym not found');
  return gym;
};

/**
 * Edits a gym's details, address or theme.
 *
 * Changing the slug moves the gym's sign-in page: the old link stops working
 * at once. Nothing else refers to a gym by slug, so no data needs to follow.
 */
export const updateGym = async (id, values) => {
  const gym = await findGym(id);

  if (values.slug && values.slug !== gym.slug) await assertSlugFree(values.slug, gym._id);
  if (values.theme) values.theme = await resolveTheme(values.theme);

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) gym.set(key, value);
  }

  await gym.save();
  return gym.populate('theme');
};

/** Stores a new logo and removes the one it replaces. */
export const setGymLogo = async (id, buffer, extension) => {
  const gym = await findGym(id);
  const previous = gym.logoUrl;

  gym.logoUrl = await saveLogo(gym.id, buffer, extension);
  await gym.save();
  await deleteLogo(previous);

  return gym.populate('theme');
};

export const removeGymLogo = async (id) => {
  const gym = await findGym(id);
  const previous = gym.logoUrl;

  gym.logoUrl = null;
  await gym.save();
  await deleteLogo(previous);

  return gym.populate('theme');
};

/** Counts used by the platform header — cheap, and the only cross-gym figures. */
export const platformTotals = async () => {
  const [gyms, activeGyms, members, expenses] = await Promise.all([
    Gym.countDocuments(),
    Gym.countDocuments({ isActive: true }),
    Member.countDocuments(),
    Expense.countDocuments(),
  ]);

  return { gyms, activeGyms, suspendedGyms: gyms - activeGyms, members, expenses };
};
