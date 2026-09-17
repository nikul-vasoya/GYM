import * as authService from './auth.service.js';

export const login = async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.json({ user, token });
};

export const me = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};

export const forgotPassword = async (req, res) => {
  res.json(await authService.requestPasswordReset(req.body));
};

export const resetPassword = async (req, res) => {
  res.json(await authService.resetPassword(req.body));
};
