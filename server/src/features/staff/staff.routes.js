import { Router } from 'express';

import { requireAuth, requireGymAdmin } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  createStaffSchema,
  updateAccountSchema,
  resetPasswordByAdminSchema,
  staffIdParamsSchema,
} from './staff.schema.js';
import * as staffController from './staff.controller.js';

export const staffRouter = Router();

// Staff management is the gym administrator's, not the front desk's (M3).
staffRouter.use(requireAuth, requireGymAdmin);

staffRouter.get('/', asyncHandler(staffController.list));

staffRouter.post('/', validate(createStaffSchema), asyncHandler(staffController.create));

staffRouter.delete(
  '/:id',
  validate(staffIdParamsSchema, 'params'),
  asyncHandler(staffController.remove),
);

staffRouter.patch(
  '/:id',
  validate(staffIdParamsSchema, 'params'),
  validate(updateAccountSchema),
  asyncHandler(staffController.update),
);

// How a forgotten password is recovered: the gym admin sets a new one.
staffRouter.put(
  '/:id/password',
  validate(staffIdParamsSchema, 'params'),
  validate(resetPasswordByAdminSchema),
  asyncHandler(staffController.resetPassword),
);
