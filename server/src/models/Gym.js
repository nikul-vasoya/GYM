import mongoose from 'mongoose';

import { SLUG_PATTERN, isReservedSlug } from '../lib/reservedSlugs.js';

/**
 * One gym on the platform — the tenant every other record belongs to.
 *
 * `slug` is the gym's address: its staff sign in at `/<slug>/login` and work
 * under `/<slug>/…`. The platform administrator may change it, so nothing
 * stores a slug as a reference — records point at the gym's id.
 */
const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens only'],
      validate: {
        validator: (value) => !isReservedSlug(value),
        message: 'That address is reserved. Choose another.',
      },
    },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 200 },

    /** The colours the gym's screens wear. Set to the default theme on creation. */
    theme: { type: mongoose.Schema.Types.ObjectId, ref: 'Theme', default: null },
    /** Public path of the uploaded logo, e.g. `/uploads/logos/<id>-<ts>.png`. */
    logoUrl: { type: String, default: null },

    /**
     * Suspending a gym is the platform's only lever over it: every sign-in
     * and every authenticated request from that gym is refused while false.
     * Nothing is deleted, so reactivating restores the gym untouched.
     */
    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

gymSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

/**
 * Turns a gym name into a URL-safe slug.
 *
 * Exported because gym creation needs to propose one before the document
 * exists, and the seed and migration scripts need the same rule.
 */
export const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');

export const Gym = mongoose.models.Gym ?? mongoose.model('Gym', gymSchema);
