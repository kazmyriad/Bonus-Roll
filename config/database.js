/* COPIED NEARLY VERBATIM FROM IN-CLASS SLIDES... */

const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/BonusRoll");
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1); // stop the app — no point running without a DB
  }
};
module.exports = connectDB;