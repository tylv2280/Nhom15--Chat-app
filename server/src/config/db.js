// server/src/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Lấy URL từ file .env
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true,  // Chỉ cần nếu mongoose < 6
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // Dừng server nếu không kết nối được
  }
};
module.exports = connectDB;

