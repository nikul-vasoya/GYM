import * as themesService from './themes.service.js';

export const list = async (req, res) => {
  res.json({ data: await themesService.listThemes() });
};

export const create = async (req, res) => {
  const theme = await themesService.createTheme({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ data: { ...theme.toJSON(), gymCount: 0 } });
};

export const update = async (req, res) => {
  const theme = await themesService.updateTheme(req.params.id, req.body);
  res.json({ data: theme.toJSON() });
};

export const remove = async (req, res) => {
  await themesService.deleteTheme(req.params.id);
  res.status(204).end();
};
