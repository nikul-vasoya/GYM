import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where uploaded files live, and the one module that knows it.
 *
 * Files are written to local disk and served by the API at `/uploads`. Moving
 * to S3 or Cloudinary means reimplementing these two functions; nothing else
 * in the server touches the filesystem for uploads.
 */
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

/** Read per call so tests can point it at a temporary directory. */
export const uploadRoot = () => process.env.UPLOAD_DIR ?? DEFAULT_ROOT;

export const PUBLIC_UPLOAD_PREFIX = '/uploads';

/** Saves a gym logo and returns its public URL path. */
export const saveLogo = async (gymId, buffer, extension) => {
  const directory = path.join(uploadRoot(), 'logos');
  await fs.mkdir(directory, { recursive: true });

  // Timestamped, so a replaced logo gets a new URL and no cache serves the old one.
  const fileName = `${gymId}-${Date.now()}.${extension}`;
  await fs.writeFile(path.join(directory, fileName), buffer);

  return `${PUBLIC_UPLOAD_PREFIX}/logos/${fileName}`;
};

/**
 * Deletes a previously saved logo. Missing files are ignored, and a URL that
 * does not point inside the logos directory is never touched.
 */
export const deleteLogo = async (url) => {
  if (!url?.startsWith(`${PUBLIC_UPLOAD_PREFIX}/logos/`)) return;

  const fileName = path.basename(url);
  try {
    await fs.unlink(path.join(uploadRoot(), 'logos', fileName));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};
