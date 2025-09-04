const express = require("express");
const router = express.Router();
const User = require("../models/user");

// ===== Gửi lời mời kết bạn =====
router.post("/add", async (req, res) => {
  try {
    const { userId } = req.body;
    const me = req.user._id;  // từ middleware auth

    if (!userId) return res.status(400).json({ error: "Thiếu userId" });
    if (String(me) === String(userId)) return res.status(400).json({ error: "Không thể tự kết bạn với chính mình" });

    // Kiểm tra user tồn tại
    const friend = await User.findById(userId);
    if (!friend) return res.status(404).json({ error: "Người dùng không tồn tại" });

    // Nếu đã là bạn rồi
    if (friend.friends && friend.friends.includes(me)) {
      return res.status(400).json({ error: "Đã là bạn bè" });
    }

    // Cập nhật danh sách bạn bè (2 chiều)
    await User.findByIdAndUpdate(me, { $addToSet: { friends: userId } });
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: me } });

    res.json({ success: true, message: "Kết bạn thành công!" });
  } catch (err) {
    console.error("Add friend error", err);
    res.status(500).json({ error: "Không thể kết bạn" });
  }
});

// ===== Xóa bạn =====
router.post("/remove", async (req, res) => {
  try {
    const { userId } = req.body;
    const me = req.user._id;

    await User.findByIdAndUpdate(me, { $pull: { friends: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { friends:
