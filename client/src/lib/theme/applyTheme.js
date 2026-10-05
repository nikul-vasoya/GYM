import { generateTheme } from './generateTheme';

const STYLE_ID = 'gym-theme';

const block = (selector, tokens) =>
  `${selector}{${Object.entries(tokens)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`;

/**
 * Paints the whole app in a gym's theme.
 *
 * Writes one <style> block at the end of <head>, so it overrides the default
 * palette in index.css for both modes. Dark uses `:root.dark` — one step more
 * specific than the light block — so the existing light/dark toggle keeps
 * working without knowing themes exist.
 *
 * @param {{ primary: string, accent?: string|null } | null} theme
 */
export const applyGymTheme = (theme) => {
  if (!theme?.primary) {
    clearGymTheme();
    return;
  }

  const { light, dark } = generateTheme(theme);

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
  }
  style.textContent = `${block(':root', light)}\n${block(':root.dark', dark)}`;

  // Re-appended every time so it stays last, after any stylesheet Vite injects.
  document.head.appendChild(style);
};

/** Back to the default palette — the platform console never wears a gym's colours. */
export const clearGymTheme = () => {
  document.getElementById(STYLE_ID)?.remove();
};

/** CSS custom properties for a scoped preview (e.g. a theme card), not the whole page. */
export const themeStyle = (theme, mode = 'dark') => (theme?.primary ? generateTheme(theme)[mode] : {});
