// server/src/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesByRoom,
  getMessagesByUser,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

// Gửi tin nhắn
router.post("/send", protect, sendMessage);

// Lấy tin nhắn theo room
router.get("/room/:roomId", protect, getMessagesByRoom);

// Lấy lịch sử chat 1-1
router.get("/user/:userId", protect, getMessagesByUser);

module.exports = router;
