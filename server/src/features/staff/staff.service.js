import { User } from '../../models/User.js';
import { ApiError } from '../../lib/ApiError.js';
import { hashPassword } from '../../lib/password.js';
import { assertAccountFree } from '../../lib/accountFields.js';

/** Everyone who can sign in to one gym. Scoped by the caller's own gym. */
export const listStaff = async (gymId) =>
  User.find({ gym: gymId }).sort({ role: 1, createdAt: 1 });

export const createStaff = async (gymId, { name, phone, email, password, role }) => {
  // Mobile and email are unique platform-wide, because either one names the
  // account at sign-in — so this check spans every gym.
  await assertAccountFree({ phone, email });

  return User.create({
    name,
    phone,
    ...(email ? { email } : {}),
    role,
    gym: gymId,
    passwordHash: await hashPassword(password),
  });
};

/** One account in one gym. An id from another gym is simply not found. */
const findAccount = async (gymId, id) => {
  const user = await User.findOne({ _id: id, gym: gymId });
  if (!user) throw ApiError.notFound('Account not found');
  return user;
};

/** Edits a colleague's name, mobile or email. */
export const updateAccount = async (gymId, id, { name, phone, email }) => {
  const user = await findAccount(gymId, id);
  await assertAccountFree({ phone, email }, user._id);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (email !== undefined) user.email = email ?? undefined;

  await user.save();
  return user;
};

/**
 * Sets a new password for someone who has forgotten theirs. Also cancels any
 * outstanding emailed reset link, so only the new password works.
 */
export const resetAccountPassword = async (gymId, id, password) => {
  const user = await findAccount(gymId, id);

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return user;
};

/**
 * Removes a colleague's account.
 *
 * Refusing self-removal is what guarantees a gym always keeps at least one
 * administrator, and it needs no separate "last admin" rule to do it: only an
 * admin can call this, so any OTHER admin they could name means the gym has
 * two. The one admin who could leave the gym empty is the caller, and the
 * caller is exactly who is refused.
 */
export const removeStaff = async (gymId, id, currentUser) => {
  if (String(id) === String(currentUser._id)) {
    throw ApiError.badRequest('You cannot remove your own account');
  }

  const user = await findAccount(gymId, id);

  await User.deleteOne({ _id: user._id });
  return user;
};
