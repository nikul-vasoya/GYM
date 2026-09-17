import * as authService from './auth.service.js';

export const login = async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.json({ user, token });
};
