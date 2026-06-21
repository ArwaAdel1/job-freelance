const mongoose = require("mongoose");

let cachedPromise = null;

function connectDB() {
  if (cachedPromise) return cachedPromise;

  cachedPromise = mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then((conn) => {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((err) => {
      console.error(`❌ MongoDB Error: ${err.message}`);
      cachedPromise = null;
      throw err;
    });

  return cachedPromise;
}

module.exports = connectDB;
