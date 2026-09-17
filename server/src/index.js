import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';

const start = async () => {
  const config = env();

  try {
    await connectDatabase(config.mongodbUri);
    console.log('[db] connected');
  } catch (error) {
    console.error('[db] connection failed:', error.message);
    process.exit(1);
  }

  createApp().listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
  });
};

start();
