import { Package } from '../../models/Package.js';
import { ApiError } from '../../lib/ApiError.js';

export const list = async (req, res) => {
  const { includeInactive } = req.validatedQuery ?? {};
  const filter = includeInactive ? {} : { isActive: true };

  const packages = await Package.find(filter).sort({ sortOrder: 1, durationMonths: 1 });

  res.json({ data: packages.map((pkg) => pkg.toJSON()) });
};

/**
 * Updates a package definition.
 *
 * Deliberately does NOT touch existing members — each member snapshots the
 * price it was sold at (decision D9).
 */
export const update = async (req, res) => {
  const updated = await Package.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updated) throw ApiError.notFound('Package not found');

  res.json({ data: updated.toJSON() });
};
