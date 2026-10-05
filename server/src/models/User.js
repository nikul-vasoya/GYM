import mongoose from 'mongoose';

/**
 * An account that can sign in.
 *
 * Three roles, two kinds of account. A `superadmin` runs the platform and
 * belongs to no gym; an `admin` or `staff` belongs to exactly one gym and
 * can only ever see that gym's data. The pre-validate hook below enforces
 * that pairing in both directions, so a role can never drift away from the
 * tenancy it implies.
 *
 * `passwordHash` and the reset-token fields are `select: false`, so an
 * accidental `User.find()` in a controller can never leak them.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Optional for gym accounts; the platform superadmin signs in with it. */
    email: { type: String, lowercase: true, trim: true },
    /**
     * Mobile number, normalised by `normalizePhone`. Gym accounts sign in with
     * it (or with their email, when they have one).
     */
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: {
        values: ['superadmin', 'admin', 'staff'],
        message: 'Role must be superadmin, admin or staff',
      },
      default: 'admin',
    },
    /** Null for a platform superadmin; required for everyone else. */
    gym: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      default: null,
      index: true,
    },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

/*
 * Both are unique platform-wide, because either one identifies the account at
 * sign-in. Partial rather than plain unique: accounts without an email (or,
 * from before mobile sign-in, without a phone) must not collide on "missing".
 */
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });

userSchema.pre('validate', function enforceGymForRole(next) {
  if (!this.email && !this.phone) {
    return next(new Error('An account needs a mobile number or an email'));
  }
  if (this.role === 'superadmin' && this.gym) {
    return next(new Error('A platform superadmin must not belong to a gym'));
  }
  if (this.role !== 'superadmin' && !this.gym) {
    return next(new Error('A gym account must belong to a gym'));
  }
  return next();
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpiresAt;
    return ret;
  },
});

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
