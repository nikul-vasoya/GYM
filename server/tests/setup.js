import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { resetDefaultGym } from './helpers/factories.js';

// Set before any application module reads the environment.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-32';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ALLOW_DEV_RESET_TOKEN = 'true';

// Seeded here, not just in beforeAll: `dotenv/config` (imported by
// src/config/env.js) fills any UNSET key from the developer's real .env,
// which holds a live Atlas credential. Claiming the key synchronously —
// before any test file's imports are evaluated — means an eagerly-cached
// env() can never capture the production URI. beforeAll overwrites this
// with the real in-memory server URI once it is known.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/placeholder-replaced-in-beforeAll';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
});

// A clean database between tests means test order can never matter. The
// factories' default gym is part of that state, so it is cleared here too.
afterEach(async () => {
  resetDefaultGym();

  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});
