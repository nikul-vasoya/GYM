import { Package } from '../models/Package.js';

/**
 * The packages every new gym starts with (decision D4).
 *
 * Placeholder prices — each gym edits its own from Settings, and editing one
 * gym's prices can never touch another's because packages are per gym.
 */
export const DEFAULT_PACKAGES = [
  { name: '1 Month', durationMonths: 1, price: 1500, sortOrder: 1 },
  { name: '3 Months', durationMonths: 3, price: 4000, sortOrder: 2 },
  { name: '6 Months', durationMonths: 6, price: 7500, sortOrder: 3 },
  { name: '12 Months', durationMonths: 12, price: 14000, sortOrder: 4 },
];

/**
 * Inserts any of the defaults this gym does not already have.
 *
 * Deliberately does NOT update existing rows — an admin's edited price must
 * survive re-running this.
 */
export const createDefaultPackages = async (gymId) => {
  const created = [];

  for (const definition of DEFAULT_PACKAGES) {
    const existing = await Package.findOne({ gym: gymId, name: definition.name });
    if (existing) continue;
    created.push(await Package.create({ ...definition, gym: gymId }));
  }

  return created;
};
