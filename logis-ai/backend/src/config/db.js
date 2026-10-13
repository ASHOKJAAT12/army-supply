const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 * Fails clearly if MONGODB_URI is not set.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('FATAL: MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
