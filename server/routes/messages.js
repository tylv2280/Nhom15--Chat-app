// server/routes/messages.js
const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/user');

const toObjectId = (id) => { try { return new mongoose.Types.ObjectId(id); } catch { return null; } };
const me = (req) => String(req.user?.id || req.user?._id || req.userId);

module.exports = function messagesRoutes({ broadcastToConversation }) {
  const r = express.Router();

  // Gửi tin trong group (text + files)
  r.post('/', async (req, res, next) => {
    try {
      const userId = me(req);
      const { conversationId, text, attachments } = req.body || {};
      if (!conversationId || (!text && (!attachments || attachments.length === 0))) {
        return res.status(400).json({ error: 'Thiếu nội dung' });
      }
      const conv = await Conversation.findById(conversationId);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (!conv.members.map(String).includes(userId)) {
        return res.status(403).json({ error: 'Không phải thành viên nhóm' });
      }

      const msg = await Message.create({
        sender: userId,
        group: conv._id,
        text: text || null,
        attachments: attachments || []
      });

      const u = await User.findById(userId).select('username');
      const payload = {
        _id: String(msg._id),
        conversationId: String(conv._id),
        senderId: userId,
        senderName: u?.username || 'Người dùng',
        text: msg.text || '',
        attachments: msg.attachments || [],
        createdAt: msg.createdAt,
        mode: 'group'
      };

      broadcastToConversation(String(conv._id), 'message:new', payload);
      res.json(payload);
    } catch (e) { next(e); }
  });

  // Lịch sử group có phân trang
  r.get('/:conversationId', async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { before, limit } = req.query;
      const lim = Math.max(1, Math.min(parseInt(limit || '50', 10), 100));

      const beforeDate = before
        ? new Date(isNaN(before) ? before : Number(before))
        : null;

      const oid = toObjectId(conversationId);
      const base = oid
        ? { $or: [ { group: conversationId }, { group: oid } ] }
        : { group: conversationId };

      const filter = beforeDate ? { ...base, createdAt: { $lt: beforeDate } } : base;

      const msgsDesc = await Message
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(lim)
        .populate('sender', 'username _id');

      const msgs = msgsDesc.reverse().map(m => ({
        _id: String(m._id),
        conversationId,
        senderId: String(m.sender?._id || m.sender),
        senderName: m.sender?.username,
        text: m.text || '',
        attachments: m.attachments || [],
        createdAt: m.createdAt,
        readBy: (m.readBy || []).map(id => String(id)),
        mode: 'group'
      }));

      res.json(msgs);
    } catch (e) { next(e); }
  });

  // Đánh dấu đã đọc group
  r.post('/read', async (req, res, next) => {
    try {
      const userId = me(req);
      const { conversationId } = req.body || {};
      if (!conversationId) return res.status(400).json({ error: 'Thiếu conversationId' });

      const oid = toObjectId(conversationId);
      const filter = oid
        ? { $or: [ { group: conversationId }, { group: oid } ] }
        : { group: conversationId };

      const result = await Message.updateMany(
        { ...filter, sender: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      broadcastToConversation(String(conversationId), 'message:read', { by: userId, conversationId: String(conversationId) });
      res.json({ ok: true, modified: result.modifiedCount || 0 });
    } catch (e) { next(e); }
  });

  return r;
};
