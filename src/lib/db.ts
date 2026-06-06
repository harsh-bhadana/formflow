import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface GlobalMongo {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  client: MongoClient | null;
}

declare global {
  var mongo: GlobalMongo | undefined;
}

const cached = globalThis.mongo || { conn: null, promise: null, client: null };

if (!globalThis.mongo) {
  globalThis.mongo = cached;
}

// Instantiate the raw MongoClient once and cache it in development
if (!cached.client) {
  cached.client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
  });
}

export const rawClient = cached.client;
export const rawDb = rawClient.db();

/**
 * Connect to MongoDB using Mongoose.
 * Reuses the connection promise to avoid duplicate connection pools.
 */
export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Ephemeral environment safety limit
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
