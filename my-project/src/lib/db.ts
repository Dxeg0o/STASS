import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';

export const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  }
};