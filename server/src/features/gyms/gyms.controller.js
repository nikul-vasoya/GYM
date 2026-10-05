import multer from 'multer';

import * as gymsService from './gyms.service.js';
import { ApiError } from '../../lib/ApiError.js';
import { detectImageType } from '../../lib/imageSniff.js';

export const LOGO_MAX_BYTES = 1024 * 1024;

/** Held in memory: a logo is small, and its bytes are checked before any write. */
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LOGO_MAX_BYTES, files: 1 },
}).single('logo');

/** Runs multer and turns its errors into the API's own 400s. */
export const receiveLogo = (req, res, next) => {
  logoUpload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest('The logo must be 1 MB or smaller', { logo: 'The logo must be 1 MB or smaller' }));
    }
    return next(ApiError.badRequest('Upload one image in the "logo" field', { logo: 'Upload one image' }));
  });
};

export const list = async (req, res) => {
  const [data, totals] = await Promise.all([
    gymsService.listGymsWithCounts(),
    gymsService.platformTotals(),
  ]);

  res.json({ data, totals });
};

export const create = async (req, res) => {
  const { gym, admin } = await gymsService.provisionGym({
    ...req.body,
    createdBy: req.user._id,
  });

  await gym.populate('theme');
  res.status(201).json({
    data: { ...gymsService.serializeGym(gym), memberCount: 0, staffCount: 1 },
    admin: admin.toJSON(),
  });
};

export const setStatus = async (req, res) => {
  const gym = await gymsService.setGymActive(req.params.id, req.body.isActive);
  res.json({ data: gymsService.serializeGym(gym) });
};

export const update = async (req, res) => {
  const gym = await gymsService.updateGym(req.params.id, req.body);
  res.json({ data: gymsService.serializeGym(gym) });
};

export const uploadLogo = async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Choose an image to upload', { logo: 'Choose an image to upload' });
  }

  const extension = detectImageType(req.file.buffer);
  if (!extension) {
    throw ApiError.badRequest('The logo must be a PNG, JPG, WebP or SVG image', {
      logo: 'The logo must be a PNG, JPG, WebP or SVG image',
    });
  }

  const gym = await gymsService.setGymLogo(req.params.id, req.file.buffer, extension);
  res.json({ data: gymsService.serializeGym(gym) });
};

export const removeLogo = async (req, res) => {
  const gym = await gymsService.removeGymLogo(req.params.id);
  res.json({ data: gymsService.serializeGym(gym) });
};
