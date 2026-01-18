import mongoose from "mongoose";

// Replaced SRV URI with standard URI to bypass DNS resolution issues on local network
const MONGODB_URI = "mongodb://dsolerolguin:k16MA4ZyqiLeCj7P@stass-shard-00-00.vk4ne.mongodb.net:27017,stass-shard-00-01.vk4ne.mongodb.net:27017,stass-shard-00-02.vk4ne.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=STASS";
// const MONGODB_URI = "mongodb+srv://dsolerolguin:k16MA4ZyqiLeCj7P@stass.vk4ne.mongodb.net/?retryWrites=true&w=majority&appName=STASS";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (global as any).mongoose;

if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      family: 4, // Force IPv4 to avoid queryTxt ETIMEOUT
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
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
