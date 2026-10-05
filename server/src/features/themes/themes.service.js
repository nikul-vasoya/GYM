import { Theme } from '../../models/Theme.js';
import { Gym } from '../../models/Gym.js';
import { ApiError } from '../../lib/ApiError.js';
import { ensureSystemThemes } from '../../lib/systemThemes.js';

/** Case-insensitive, matching the collation of the unique name index. */
const nameTaken = (name, exceptId) =>
  Theme.exists({ name, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).collation({
    locale: 'en',
    strength: 2,
  });

/** Every theme, system ones first, each with how many gyms wear it. */
export const listThemes = async () => {
  await ensureSystemThemes();

  const [themes, usage] = await Promise.all([
    Theme.find().sort({ isSystem: -1, createdAt: 1 }),
    Gym.aggregate([
      { $match: { theme: { $ne: null } } },
      { $group: { _id: '$theme', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = new Map(usage.map((row) => [String(row._id), row.count]));
  return themes.map((theme) => ({ ...theme.toJSON(), gymCount: counts.get(theme.id) ?? 0 }));
};

export const createTheme = async ({ createdBy, ...values }) => {
  if (await nameTaken(values.name)) {
    throw ApiError.conflict('A theme with that name already exists');
  }

  return Theme.create({ ...values, accent: values.accent ?? null, isSystem: false, createdBy });
};

const findEditable = async (id) => {
  const theme = await Theme.findById(id);
  if (!theme) throw ApiError.notFound('Theme not found');
  if (theme.isSystem) throw new ApiError(403, 'Built-in themes cannot be changed');
  return theme;
};

export const updateTheme = async (id, values) => {
  const theme = await findEditable(id);

  if (values.name && (await nameTaken(values.name, theme._id))) {
    throw ApiError.conflict('A theme with that name already exists');
  }

  for (const key of ['name', 'primary', 'accent']) {
    if (values[key] !== undefined) theme[key] = values[key];
  }

  await theme.save();
  return theme;
};

export const deleteTheme = async (id) => {
  const theme = await findEditable(id);

  const inUse = await Gym.countDocuments({ theme: theme._id });
  if (inUse > 0) {
    throw ApiError.conflict(
      `This theme is used by ${inUse} gym${inUse === 1 ? '' : 's'}. Move them to another theme first.`,
    );
  }

  await theme.deleteOne();
};
