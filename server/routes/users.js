// server/routes/users.js
const express = require('express');
const User = require('../models/user');

const router = express.Router();

router.get("/search", async (req, res) => {
  const q = req.query.q || "";
  try {
    // Tìm theo username hoặc email, không phân biệt hoa/thường
    const users = await User.find({
      $or: [
        { username: new RegExp(q, "i") },
        { email: new RegExp(q, "i") }
      ]
    }).select("_id username email");

    res.json(users);
  } catch (err) {
    console.error("Search error", err);
    res.status(500).json({ error: "Lỗi tìm kiếm người dùng" });
  }
});


// Thông tin tài khoản hiện tại
router.get('/me', async (req, res, next) => {
  try {
    const id = String(req.user?.id || req.user?._id || req.userId);
    const u = await User.findById(id).select('_id username avatarUrl lastSeen friends');
    res.json(u);
  } catch (e) { next(e); }
});

// Cập nhật avatar (và username nếu cần)
router.put('/me', async (req, res, next) => {
  try {
    const id = String(req.user?.id || req.user?._id || req.userId);
    const { avatarUrl, username } = req.body || {};
    const patch = {};
    if (typeof avatarUrl === 'string') patch.avatarUrl = avatarUrl;
    if (typeof username === 'string' && username.trim()) patch.username = username.trim();
    const u = await User.findByIdAndUpdate(id, { $set: patch }, { new: true })
      .select('_id username avatarUrl lastSeen friends');
    res.json(u);
  } catch (e) { next(e); }
});

// Lấy profile rút gọn theo id (để hiển thị avatar)
router.get('/profile/:id', async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id).select('_id username avatarUrl lastSeen');
    if (!u) return res.status(404).json({ error: 'Không tồn tại' });
    res.json(u);
  } catch (e) { next(e); }
});

module.exports = router;
