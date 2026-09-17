import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express app without starting a server.
 *
 * Keeping `listen` out of this file is what lets Supertest mount the real
 * app in tests. `src/index.js` is the only place that opens a port.
 */
export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Feature routers are mounted here as they are built (Tasks 8, 15, 17, 18, 19).

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
