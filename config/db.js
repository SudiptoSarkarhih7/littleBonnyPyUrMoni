// config/db.js
// Handles MongoDB connection using Mongoose

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Use replica set in production for transactions
      // For local dev, MongoDB must be started as a replica set
      // for mongoose session transactions to work.
      // Use: mongod --replSet rs0
      // Then in mongo shell: rs.initiate()
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
