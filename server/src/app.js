// server/src/app.js
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

// Load biến môi trường
dotenv.config();

// Kết nối DB
connectDB();

const app = express();

// Middleware đọc JSON
app.use(express.json());

// Import routes
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const roomRoutes = require("./routes/roomRoutes");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/room", roomRoutes);

// Middleware xử lý lỗi (nên đặt cuối cùng)
app.use(errorHandler);

module.exports = app;
