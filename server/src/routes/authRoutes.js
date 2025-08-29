// server/src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { register, login, getProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Đăng ký
router.post("/register", register);

// Đăng nhập
router.post("/login", login);

// Lấy profile (cần đăng nhập)
router.get("/profile", protect, getProfile);

module.exports = router;
