import mongoose from 'mongoose';

/**
 * A membership package the gym sells.
 *
 * Prices live here rather than in code so staff can change them from the
 * Settings screen without a deploy (SRS §6.3).
 */
const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: [0, 'Package price cannot be negative'] },
    isActive: { type: Boolean, default: true },
    /** Controls display order on the Settings screen and in the package dropdown. */
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

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
