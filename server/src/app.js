import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';
import { authRouter } from './features/auth/auth.routes.js';
import { packagesRouter } from './features/packages/packages.routes.js';
import { membersRouter } from './features/members/members.routes.js';
import { expensesRouter } from './features/expenses/expenses.routes.js';
import { dashboardRouter } from './features/dashboard/dashboard.routes.js';

/**
 * Builds the Express app without starting a server.
 *
 * Keeping `listen` out of this file is what lets Supertest mount the real
 * app in tests. `src/index.js` is the only place that opens a port.
 */
export const createApp = () => {
  const app = express();

  // The production deployment proxies /api to this process, so req.ip must be
  // taken from X-Forwarded-For. Without this, express-rate-limit keys every
  // request to the proxy's address and the login limit becomes one shared
  // bucket for all staff. Value is the number of trusted proxy hops.
  app.set('trust proxy', 1);

  app.use(helmet());

  // Only the app's own origin may call the API with credentials. Tests and
  // same-origin production requests send no Origin header and are unaffected.
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'test' ? true : env().clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/packages', packagesRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
