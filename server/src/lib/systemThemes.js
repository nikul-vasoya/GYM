import { Theme } from '../models/Theme.js';

export const DEFAULT_THEME_KEY = 'aura-gold';

/**
 * The themes every platform starts with. `aura-gold` is the original look,
 * and the one every gym wears until someone picks another.
 */
export const SYSTEM_THEMES = [
  { key: 'aura-gold', name: 'Aura Gold', primary: '#c9a227', accent: '#8c6a1c' },
  { key: 'ember-red', name: 'Ember Red', primary: '#dc2626', accent: '#f97316' },
  { key: 'ocean-blue', name: 'Ocean Blue', primary: '#2563eb', accent: '#06b6d4' },
  { key: 'emerald', name: 'Emerald', primary: '#059669', accent: '#84cc16' },
  { key: 'royal-purple', name: 'Royal Purple', primary: '#7c3aed', accent: '#ec4899' },
  { key: 'sunset-orange', name: 'Sunset Orange', primary: '#ea580c', accent: '#facc15' },
  { key: 'rose', name: 'Rose', primary: '#e11d48', accent: '#f472b6' },
  { key: 'teal', name: 'Teal', primary: '#0d9488', accent: '#38bdf8' },
  { key: 'steel', name: 'Steel', primary: '#475569', accent: '#94a3b8' },
  { key: 'volt-lime', name: 'Volt Lime', primary: '#65a30d', accent: '#22d3ee' },
];

/**
 * Creates any missing system theme and restores any whose colours drifted.
 *
 * Idempotent — the seed, the migration and gym creation all call it, so a
 * fresh database never has a gym pointing at a theme that does not exist.
 */
export const ensureSystemThemes = async () => {
  await Theme.bulkWrite(
    SYSTEM_THEMES.map((theme) => ({
      updateOne: {
        filter: { key: theme.key },
        update: { $set: { ...theme, isSystem: true } },
        upsert: true,
      },
    })),
  );
};

/** The id of the theme a gym wears when none was chosen. */
export const defaultThemeId = async () => {
  let theme = await Theme.findOne({ key: DEFAULT_THEME_KEY }).select('_id');

  if (!theme) {
    await ensureSystemThemes();
    theme = await Theme.findOne({ key: DEFAULT_THEME_KEY }).select('_id');
  }

  return theme._id;
};
