import { Gym } from '../../models/Gym.js';
import * as authService from './auth.service.js';

export const login = async (req, res) => {
  const { user, gym, token } = await authService.login(req.body);
  res.json({ user, gym, token });
};

export const me = async (req, res) => {
  // requireAuth has already proven the gym exists and is active.
  const gym = req.gymId ? await Gym.findById(req.gymId).populate('theme') : null;
  res.json({ user: req.user.toJSON(), gym: authService.gymSummary(gym) });
};

export const forgotPassword = async (req, res) => {
  res.json(await authService.requestPasswordReset(req.body));
};

export const resetPassword = async (req, res) => {
  res.json(await authService.resetPassword(req.body));
};
