// server/src/routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const {
  createRoom,
  getUserRooms,
  addMember,
  removeMember,
} = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");

// Tạo phòng mới
router.post("/", protect, createRoom);

// Lấy danh sách phòng của user
router.get("/", protect, getUserRooms);

// Thêm thành viên
router.post("/add-member", protect, addMember);

// Xóa thành viên
router.post("/remove-member", protect, removeMember);

module.exports = router;
