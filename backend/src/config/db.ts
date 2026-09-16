import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.warn("MONGODB_URI is not defined, using in-memory store.");
      return;
    }

    mongoose.connection.on('error', (err) => {
      console.warn('MongoDB runtime warning (in-memory store active):', err.message);
    });

    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.warn('MongoDB connection offline/timed out (in-memory store active):', (error as Error).message);
  }
};
