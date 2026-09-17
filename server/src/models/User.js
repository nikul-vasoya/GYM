import mongoose from 'mongoose';

/**
 * A staff account that can sign in to the app.
 *
 * `passwordHash` and the reset-token fields are `select: false`, so an
 * accidental `User.find()` in a controller can never leak them.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

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
