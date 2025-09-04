// server/routes/chat.js
const express = require('express');
const router = express.Router();

// Route kiểm tra sống
router.get('/', (req, res) => {
  res.json({ ok: true, route: 'chat', note: 'Use /api/groups and /api/messages for features.' });
});

module.exports = router;
