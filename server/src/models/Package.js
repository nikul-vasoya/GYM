import mongoose from 'mongoose';

/**
 * A membership package the gym sells.
 *
 * Prices live here rather than in code so staff can change them from the
 * Settings screen without a deploy (SRS §6.3).
 */
const packageSchema = new mongoose.Schema(
  {
    gym: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    /** Optional note shown to staff when choosing a plan, e.g. "Includes PT". */
    description: { type: String, trim: true, maxlength: 200, default: null },
    durationMonths: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: [0, 'Package price cannot be negative'] },
    isActive: { type: Boolean, default: true },
    /** Controls display order on the Settings screen and in the package dropdown. */
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Package names are unique per gym: every gym gets its own "3 Months".
packageSchema.index({ gym: 1, name: 1 }, { unique: true });

packageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Package = mongoose.models.Package ?? mongoose.model('Package', packageSchema);
