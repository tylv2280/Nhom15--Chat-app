// server/routes/dm.js
const express = require('express');
const Message = require('../models/Message');
const User = require('../models/user');

const me = (req) => String(req.user?.id || req.user?._id || req.userId);

module.exports = function dmRoutes({ notifyUser }) {
  const r = express.Router();

  // Gửi DM
  r.post('/send', async (req, res, next) => {
    try {
      const userId = me(req);
      const { to, text, attachments } = req.body || {};
      if (!to || (!text && (!attachments || attachments.length === 0))) {
        return res.status(400).json({ error: 'Thiếu nội dung' });
      }

      const msg = await Message.create({
        sender: userId,
        receiver: to,
        text: text || null,
        attachments: attachments || []
      });

      const u = await User.findById(userId).select('username');
      const payload = {
        _id: String(msg._id),
        sender: userId,
        receiver: String(to),
        senderName: u?.username || 'Người dùng',
        text: msg.text || '',
        attachments: msg.attachments || [],
        createdAt: msg.createdAt
      };

      // gửi cho 2 đầu
      notifyUser(String(to), 'message:new', payload);
      notifyUser(String(userId), 'message:new', payload);
      res.json(payload);
    } catch (e) { next(e); }
  });

  // Lịch sử DM có phân trang: /api/dm/history/:otherId?before=...&limit=...
  r.get('/history/:otherId', async (req, res, next) => {
    try {
      const userId = me(req);
      const otherId = String(req.params.otherId);
      const { before, limit } = req.query;
      const lim = Math.max(1, Math.min(parseInt(limit || '50', 10), 100));
      const beforeDate = before ? new Date(isNaN(before) ? before : Number(before)) : null;

      const filterBase = {
        $or: [
          { sender: userId, receiver: otherId },
          { sender: otherId, receiver: userId }
        ]
      };
      const filter = beforeDate ? { ...filterBase, createdAt: { $lt: beforeDate } } : filterBase;

      const msgsDesc = await Message
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(lim);

      const msgs = msgsDesc.reverse().map(m => ({
        _id: String(m._id),
        sender: String(m.sender),
        receiver: String(m.receiver),
        text: m.text || '',
        attachments: m.attachments || [],
        createdAt: m.createdAt
      }));

      res.json(msgs);
    } catch (e) { next(e); }
  });

  // Đánh dấu đã đọc DM (đánh dấu tất cả tin của other → me)
  r.post('/read', async (req, res, next) => {
    try {
      const userId = me(req);
      const { otherId } = req.body || {};
      if (!otherId) return res.status(400).json({ error: 'Thiếu otherId' });

      const result = await Message.updateMany(
        { sender: otherId, receiver: userId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      // thông báo cho 2 bên để UI hiển thị note
      notifyUser(String(userId), 'message:read', { otherId: String(otherId) });
      notifyUser(String(otherId), 'message:read', { otherId: String(userId) });
      res.json({ ok: true, modified: result.modifiedCount || 0 });
    } catch (e) { next(e); }
  });

  return r;
};
