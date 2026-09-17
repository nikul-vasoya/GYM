import mongoose from 'mongoose';

/** One completed membership period, archived when a member renews. */
const membershipPeriodSchema = new mongoose.Schema(
  {
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false },
);

/**
 * A gym member and their CURRENT membership period.
 *
 * The package fields are snapshots taken when the membership was sold — a
 * later price change in Settings must not rewrite what this member paid.
 * Previous periods move into `history` on renewal.
 */
const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gender: {
      type: String,
      required: true,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female or other',
      },
    },

    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, required: true, min: 1 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },

    history: { type: [membershipPeriodSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

memberSchema.path('endDate').validate(function validateEndDate(value) {
  return !this.startDate || value >= this.startDate;
}, 'End date must be on or after the start date');

// Sparse + unique: duplicates are blocked, but blanks never collide (D10).
memberSchema.index({ email: 1 }, { unique: true, sparse: true });
memberSchema.index({ phone: 1 }, { unique: true, sparse: true });
// Supports the expiry and action-required queries, which sort by end date.
memberSchema.index({ endDate: 1, durationMonths: 1 });

memberSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Member = mongoose.models.Member ?? mongoose.model('Member', memberSchema);
