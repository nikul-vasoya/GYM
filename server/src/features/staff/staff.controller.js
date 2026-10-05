import * as staffService from './staff.service.js';

export const list = async (req, res) => {
  const staff = await staffService.listStaff(req.gymId);
  res.json({ data: staff.map((user) => user.toJSON()) });
};

export const create = async (req, res) => {
  const user = await staffService.createStaff(req.gymId, req.body);
  res.status(201).json({ data: user.toJSON() });
};

export const remove = async (req, res) => {
  await staffService.removeStaff(req.gymId, req.params.id, req.user);
  res.json({ message: 'Account removed' });
};

export const update = async (req, res) => {
  const user = await staffService.updateAccount(req.gymId, req.params.id, req.body);
  res.json({ data: user.toJSON() });
};

export const resetPassword = async (req, res) => {
  await staffService.resetAccountPassword(req.gymId, req.params.id, req.body.password);
  res.json({ message: 'Password updated' });
};
