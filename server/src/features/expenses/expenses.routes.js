import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  expenseIdParamsSchema,
} from './expenses.schema.js';
import * as expensesController from './expenses.controller.js';

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get(
  '/',
  validate(listExpensesQuerySchema, 'query'),
  asyncHandler(expensesController.list),
);

expensesRouter.post('/', validate(createExpenseSchema), asyncHandler(expensesController.create));

expensesRouter.get(
  '/:id',
  validate(expenseIdParamsSchema, 'params'),
  asyncHandler(expensesController.get),
);

expensesRouter.patch(
  '/:id',
  validate(expenseIdParamsSchema, 'params'),
  validate(updateExpenseSchema),
  asyncHandler(expensesController.update),
);
