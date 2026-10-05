/**
 * Just enough colour science to derive a theme from one brand colour.
 *
 * Works in OKLCH because its lightness is perceptual: two colours at the same
 * L look equally light whatever their hue, which is what lets one set of
 * lightness steps produce a readable theme for red, blue and yellow alike.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toLinear = (channel) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** `#rrggbb` → [r, g, b] in linear sRGB, 0–1. */
export const hexToLinearRgb = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => toLinear(parseInt(value.slice(offset, offset + 2), 16) / 255));
};

/** Linear sRGB → OKLCH { l, c, h } (h in degrees). */
export const linearRgbToOklch = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(A * A + B * B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
};

export const hexToOklch = (hex) => linearRgbToOklch(hexToLinearRgb(hex));

/** OKLCH → linear sRGB, unclamped (values outside 0–1 are out of gamut). */
export const oklchToLinearRgb = ({ l, c, h }) => {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
};

const inGamut = (rgb) => rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);

/**
 * Brings a colour inside sRGB by lowering its chroma, keeping lightness and
 * hue. Lightness is what contrast depends on, so it is the one thing that
 * must survive the trip to the screen.
 */
export const fitToGamut = ({ l, c, h }) => {
  const L = clamp(l, 0, 1);
  if (inGamut(oklchToLinearRgb({ l: L, c, h }))) return { l: L, c, h };

  let low = 0;
  let high = c;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToLinearRgb({ l: L, c: mid, h }))) low = mid;
    else high = mid;
  }
  return { l: L, c: low, h };
};

/** WCAG relative luminance of an OKLCH colour. */
export const luminance = (colour) => {
  const [r, g, b] = oklchToLinearRgb(colour).map((channel) => clamp(channel, 0, 1));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1–21. */
export const contrastRatio = (a, b) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const round = (value, places) => Number(value.toFixed(places));

/** `oklch(L C H)` or `oklch(L C H / A%)` for a CSS custom property. */
export const toCss = ({ l, c, h }, alpha) =>
  `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)}${alpha === undefined ? '' : ` / ${alpha}%`})`;
