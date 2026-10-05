import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Gym } from '../models/Gym.js';
import { Theme } from '../models/Theme.js';
import { ensureSystemThemes, defaultThemeId } from '../lib/systemThemes.js';

/**
 * Brings a database from before gym branding up to date.
 *
 * Creates the built-in themes and gives every gym without a theme the
 * default one, so existing gyms look exactly as they did before. Safe to run
 * more than once: a second run finds nothing to change.
 *
 * `npm run migrate:branding`
 */
export const migrateBranding = async ({ log = console.log } = {}) => {
  await ensureSystemThemes();
  await Theme.syncIndexes();
  log(`[migrate] built-in themes: ${await Theme.countDocuments({ isSystem: true })}`);

  const themeId = await defaultThemeId();
  const result = await Gym.updateMany(
    { $or: [{ theme: { $exists: false } }, { theme: null }] },
    { $set: { theme: themeId } },
  );
  log(`[migrate] gyms given the default theme: ${result.modifiedCount}`);

  return { gymsUpdated: result.modifiedCount };
};

const runFromCli = async () => {
  await connectDatabase(env().mongodbUri);
  await migrateBranding();
  await disconnectDatabase();
};

// Only run when executed directly, never when imported by a test.
if (process.argv[1]?.endsWith('migrateBranding.js')) {
  runFromCli().catch((error) => {
    console.error('[migrate] failed:', error);
    process.exit(1);
  });
}
