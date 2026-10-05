import { Package } from '../../models/Package.js';
import { Member } from '../../models/Member.js';
import { ApiError } from '../../lib/ApiError.js';

export const list = async (req, res) => {
  const { includeInactive } = req.validatedQuery ?? {};
  const filter = { gym: req.gymId, ...(includeInactive ? {} : { isActive: true }) };

  const packages = await Package.find(filter).sort({ sortOrder: 1, durationMonths: 1 });

  res.json({ data: packages.map((pkg) => pkg.toJSON()) });
};

/** Names are unique per gym; case-insensitive so "Gold" and "gold" cannot both exist. */
const assertNameFree = async (gymId, name, exceptId) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const taken = await Package.exists({
    gym: gymId,
    name: new RegExp(`^${escaped}$`, 'i'),
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
  if (taken) {
    throw ApiError.conflict('A plan with that name already exists', {
      name: 'A plan with that name already exists',
    });
  }
};

/** Adds a plan at the end of the gym's list. */
export const create = async (req, res) => {
  await assertNameFree(req.gymId, req.body.name);

  const last = await Package.findOne({ gym: req.gymId }).sort({ sortOrder: -1 }).select('sortOrder');
  const created = await Package.create({
    ...req.body,
    description: req.body.description ?? null,
    gym: req.gymId,
    sortOrder: (last?.sortOrder ?? 0) + 1,
  });

  res.status(201).json({ data: created.toJSON() });
};

/**
 * Updates a package definition.
 *
 * Deliberately does NOT touch existing members — each member snapshots the
 * name, price and duration it was sold at (decision D9).
 */
export const update = async (req, res) => {
  if (req.body.name) await assertNameFree(req.gymId, req.body.name, req.params.id);

  const changes = Object.fromEntries(
    Object.entries(req.body).filter(([, value]) => value !== undefined),
  );

  const updated = await Package.findOneAndUpdate({ _id: req.params.id, gym: req.gymId }, changes, {
    new: true,
    runValidators: true,
  });

  if (!updated) throw ApiError.notFound('Package not found');

  res.json({ data: updated.toJSON() });
};

/**
 * Deletes a plan nobody has ever bought.
 *
 * A plan that appears on any membership, current or past, is kept so the
 * record of what was sold stays intact — deactivate it instead.
 */
export const remove = async (req, res) => {
  const pkg = await Package.findOne({ _id: req.params.id, gym: req.gymId });
  if (!pkg) throw ApiError.notFound('Package not found');

  const used = await Member.exists({
    gym: req.gymId,
    $or: [{ package: pkg._id }, { 'history.package': pkg._id }],
  });
  if (used) {
    throw ApiError.conflict(
      'Members have bought this plan, so it cannot be deleted. Deactivate it instead.',
    );
  }

  await pkg.deleteOne();
  res.status(204).end();
};
