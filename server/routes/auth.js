// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper: ký token
function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register  -> tạo user + auto login (trả token)
router.post('/register', async (req, res) => {
  try {
    let { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Thiếu username/email/password' });
    }
    email = String(email).toLowerCase().trim();

    const existed = await User.findOne({ email });
    if (existed) return res.status(409).json({ error: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ username: username.trim(), email, password: hash });

    const token = signToken(u._id);
    return res.json({
      token,
      userId: u._id,
      username: u.username,
      email: u.email
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login  -> email + password
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Thiếu email/password' });
    email = String(email).toLowerCase().trim();

    const u = await User.findOne({ email });
    if (!u) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

    const token = signToken(u._id);
    return res.json({ token, userId: u._id, username: u.username, email: u.email });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
