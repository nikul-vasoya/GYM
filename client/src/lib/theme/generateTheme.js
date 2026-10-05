import { contrastRatio, fitToGamut, hexToOklch, toCss } from './color';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Near-white and near-black inks; whichever reads better sits on the brand colour. */
const INK_LIGHT = { l: 0.99, c: 0.004, h: 85 };
const INK_DARK = { l: 0.16, c: 0.02, h: 78 };

const pickInk = (background) =>
  contrastRatio(INK_LIGHT, background) >= contrastRatio(INK_DARK, background)
    ? INK_LIGHT
    : INK_DARK;

/**
 * Derives every themed CSS token, for light and dark, from a brand colour.
 *
 * What changes with the theme: the primary action colour, focus ring, the
 * metal gradient behind primary buttons, the ambient glow, hover surfaces,
 * and a faint tint on neutral surfaces. What never changes: success, warning
 * and destructive — red has to mean danger in every gym.
 *
 * The lightness of each token is fixed per mode, borrowed from the original
 * Aura palette; only hue and chroma come from the brand. Primary lightness
 * is clamped so its ink always clears WCAG AA, whatever colour was picked.
 *
 * @param {{ primary: string, accent?: string|null }} theme hex colours
 * @returns {{ light: Record<string,string>, dark: Record<string,string> }}
 *   token name (with leading `--`) → CSS value
 */
export const generateTheme = ({ primary, accent }) => {
  const brand = hexToOklch(primary);
  // No accent: a neighbouring hue, so the gradient still has somewhere to go.
  const second = accent ? hexToOklch(accent) : { ...brand, h: (brand.h + 28) % 360 };

  const hue = brand.h;
  const chroma = Math.min(brand.c, 0.2);
  // A grey brand gets grey surfaces; a vivid one gets a whisper of its hue.
  const tint = Math.min(0.012, chroma * 0.09);

  const at = (l, c, h = hue) => fitToGamut({ l, c, h });

  const build = (mode) => {
    const isDark = mode === 'dark';

    const primaryColour = at(
      isDark ? clamp(brand.l, 0.74, 0.84) : clamp(brand.l, 0.42, 0.53),
      chroma,
    );
    const ink = pickInk(primaryColour);

    const highlight = at(
      isDark ? Math.min(primaryColour.l + 0.1, 0.94) : primaryColour.l + 0.14,
      Math.min(second.c, 0.16) * 0.8,
      second.h,
    );
    const shade = at(primaryColour.l - (isDark ? 0.16 : 0.1), chroma * 0.85);
    const ring = at(primaryColour.l + (isDark ? 0 : 0.06), chroma * 0.95);
    const accentSeries = at(isDark ? 0.72 : 0.55, Math.min(second.c, 0.14), second.h);

    const surfaces = isDark
      ? {
          '--background': at(0.13, tint * 0.5),
          '--foreground': at(0.95, tint * 0.6),
          '--card': at(0.165, tint * 0.65),
          '--popover': at(0.185, tint * 0.75),
          '--secondary': at(0.225, tint * 0.85),
          '--secondary-foreground': at(0.94, tint * 0.65),
          '--muted': at(0.215, tint * 0.75),
          '--muted-foreground': at(0.68, tint),
          '--accent': at(0.255, chroma * 0.17),
          '--accent-foreground': at(0.93, chroma * 0.15),
          '--border': at(0.27, tint),
          '--input': at(0.24, tint),
          '--sidebar': at(0.145, tint * 0.6),
          '--sidebar-border': at(0.25, tint),
        }
      : {
          '--background': at(0.985, tint * 0.35),
          '--foreground': at(0.22, tint),
          '--card': at(1, 0),
          '--popover': at(1, 0),
          '--secondary': at(0.955, tint * 0.7),
          '--secondary-foreground': at(0.3, tint * 1.2),
          '--muted': at(0.955, tint * 0.7),
          '--muted-foreground': at(0.51, tint * 1.2),
          '--accent': at(0.945, chroma * 0.17),
          '--accent-foreground': at(0.32, chroma * 0.3),
          '--border': at(0.9, tint * 0.85),
          '--input': at(0.91, tint * 0.85),
          '--sidebar': at(0.975, tint * 0.5),
          '--sidebar-border': at(0.9, tint * 0.85),
        };

    const tokens = Object.fromEntries(
      Object.entries(surfaces).map(([name, colour]) => [name, toCss(colour)]),
    );

    return {
      ...tokens,
      '--primary': toCss(primaryColour),
      '--primary-foreground': toCss(ink),
      '--ring': toCss(ring),
      '--chart-1': toCss(primaryColour),
      '--chart-5': toCss(accentSeries),
      '--gold-1': toCss(highlight),
      '--gold-2': toCss(primaryColour),
      '--gold-3': toCss(shade),
      '--gold-ink': toCss(ink),
      '--aura': toCss(primaryColour, isDark ? 16 : 22),
      '--gold-glow': toCss(primaryColour, isDark ? 28 : 22),
    };
  };

  return { light: build('light'), dark: build('dark') };
};

/** Parses one generated `oklch(L C H)` value back into numbers, for tests and previews. */
export const parseOklch = (value) => {
  const [l, c, h] = value.replace(/oklch\(|\)|\/.*$/g, '').trim().split(/\s+/).map(Number);
  return { l, c, h };
};
