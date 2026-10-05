import { SYSTEM_THEMES, DEFAULT_THEME_KEY } from './systemThemes.js';

const FALLBACK_THEME = SYSTEM_THEMES.find((theme) => theme.key === DEFAULT_THEME_KEY);

/**
 * The colours a client needs to paint a gym — nothing else.
 *
 * Accepts a populated theme document. A gym whose theme is missing (a
 * database not yet migrated, or a deleted theme) wears the default rather
 * than failing to render.
 */
export const publicTheme = (theme) => {
  const source = theme && typeof theme === 'object' && theme.primary ? theme : FALLBACK_THEME;

  return {
    id: source._id ? String(source._id) : null,
    name: source.name,
    primary: source.primary,
    accent: source.accent ?? null,
  };
};

/**
 * What an anonymous visitor to `/<slug>/login` may know about a gym: enough to
 * draw its sign-in page, and nothing about its members, contacts or accounts.
 *
 * Expects `theme` to be populated.
 */
export const publicGym = (gym) => ({
  name: gym.name,
  slug: gym.slug,
  logoUrl: gym.logoUrl ?? null,
  theme: publicTheme(gym.theme),
});
