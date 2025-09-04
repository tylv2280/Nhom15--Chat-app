// server/routes/search.js
const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');

const router = express.Router();
const oid = (x) => { try { return new mongoose.Types.ObjectId(x); } catch { return null; } };

router.get('/', async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?._id || req.userId);
    const { scope, id, q, limit } = req.query;
    if (!q || !String(q).trim()) return res.json([]);

    const lim = Math.max(1, Math.min(parseInt(limit || '50', 10), 100));
    const rx = new RegExp(String(q).trim(), 'i');

    let filter;
    if (scope === 'group') {
      const x = oid(id);
      filter = x ? { $or: [{ group: id }, { group: x }] } : { group: id };
    } else if (scope === 'dm') {
      filter = {
        $or: [
          { sender: userId, receiver: id },
          { sender: id, receiver: userId }
        ]
      };
    } else {
      return res.status(400).json({ error: 'scope phải là dm hoặc group' });
    }

    const rows = await Message.find({ ...filter, text: rx })
      .sort({ createdAt: -1 })
      .limit(lim);

    res.json(rows.map(m => ({
      _id: String(m._id),
      sender: String(m.sender),
      receiver: m.receiver ? String(m.receiver) : null,
      conversationId: m.group ? String(m.group) : null,
      text: m.text || '',
      createdAt: m.createdAt
    })));
  } catch (e) { next(e); }
});

module.exports = () => router;
