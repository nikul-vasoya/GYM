import { describe, it, expect } from 'vitest';

import { migrateBranding } from '../../src/seed/migrateBranding.js';
import { createGym } from '../helpers/factories.js';
import { Gym } from '../../src/models/Gym.js';
import { Theme } from '../../src/models/Theme.js';
import { SYSTEM_THEMES } from '../../src/lib/systemThemes.js';

const quiet = { log: () => {} };

describe('migrateBranding', () => {
  it('creates the built-in themes and dresses every unthemed gym in the default', async () => {
    const gym = await createGym({ theme: null });

    const result = await migrateBranding(quiet);

    expect(result.gymsUpdated).toBe(1);
    expect(await Theme.countDocuments({ isSystem: true })).toBe(SYSTEM_THEMES.length);
    const aura = await Theme.findOne({ key: 'aura-gold' });
    expect(String((await Gym.findById(gym.id)).theme)).toBe(aura.id);
  });

  it('changes nothing on a second run', async () => {
    await createGym({ theme: null });
    await migrateBranding(quiet);

    const second = await migrateBranding(quiet);

    expect(second.gymsUpdated).toBe(0);
    expect(await Theme.countDocuments()).toBe(SYSTEM_THEMES.length);
  });
});
