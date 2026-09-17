import mongoose from 'mongoose';

/**
 * Opens the shared Mongoose connection.
 *
 * `strictQuery` keeps unknown query fields from silently matching everything,
 * which is a quiet source of "why is this returning all members" bugs.
 */
export const connectDatabase = async (uri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};
