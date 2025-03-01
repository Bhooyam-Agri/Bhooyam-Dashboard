const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Replace the URI string with your MongoDB deployment's connection string.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
