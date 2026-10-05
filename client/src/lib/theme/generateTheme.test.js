import { describe, it, expect } from 'vitest';

import { generateTheme, parseOklch } from './generateTheme';
import { contrastRatio, hexToOklch } from './color';

/** Mirrors `server/src/lib/systemThemes.js`. */
const SYSTEM_THEMES = [
  ['Aura Gold', '#c9a227', '#8c6a1c'],
  ['Ember Red', '#dc2626', '#f97316'],
  ['Ocean Blue', '#2563eb', '#06b6d4'],
  ['Emerald', '#059669', '#84cc16'],
  ['Royal Purple', '#7c3aed', '#ec4899'],
  ['Sunset Orange', '#ea580c', '#facc15'],
  ['Rose', '#e11d48', '#f472b6'],
  ['Teal', '#0d9488', '#38bdf8'],
  ['Steel', '#475569', '#94a3b8'],
  ['Volt Lime', '#65a30d', '#22d3ee'],
];

const EXTREMES = [
  ['white', '#ffffff', null],
  ['black', '#000000', null],
  ['pure yellow', '#ffff00', null],
  ['pure blue', '#0000ff', '#ff00ff'],
  ['neon green', '#00ff00', null],
];

const ratio = (tokens, fg, bg) => contrastRatio(parseOklch(tokens[fg]), parseOklch(tokens[bg]));

describe('generateTheme', () => {
  describe.each([...SYSTEM_THEMES, ...EXTREMES])('%s', (_name, primary, accent) => {
    const theme = generateTheme({ primary, accent });

    it.each(['light', 'dark'])('keeps button text readable in %s mode (≥ 4.5:1)', (mode) => {
      expect(ratio(theme[mode], '--primary-foreground', '--primary')).toBeGreaterThanOrEqual(4.5);
      expect(ratio(theme[mode], '--gold-ink', '--gold-2')).toBeGreaterThanOrEqual(4.5);
    });

    it.each(['light', 'dark'])('keeps body text readable in %s mode (≥ 7:1)', (mode) => {
      expect(ratio(theme[mode], '--foreground', '--background')).toBeGreaterThanOrEqual(7);
      expect(ratio(theme[mode], '--muted-foreground', '--background')).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('carries the brand hue into the primary colour', () => {
    const brand = hexToOklch('#2563eb');
    const { light, dark } = generateTheme({ primary: '#2563eb' });

    expect(Math.abs(parseOklch(light['--primary']).h - brand.h)).toBeLessThan(1);
    expect(Math.abs(parseOklch(dark['--primary']).h - brand.h)).toBeLessThan(1);
  });

  it('never themes the status colours', () => {
    const { light, dark } = generateTheme({ primary: '#dc2626' });

    for (const tokens of [light, dark]) {
      expect(tokens['--destructive']).toBeUndefined();
      expect(tokens['--success']).toBeUndefined();
      expect(tokens['--warning']).toBeUndefined();
    }
  });

  it('gives a grey brand grey surfaces', () => {
    const { light } = generateTheme({ primary: '#808080' });
    expect(parseOklch(light['--background']).c).toBeLessThan(0.002);
  });
});
