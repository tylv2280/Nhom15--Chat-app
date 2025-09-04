// server/routes/unread.js
const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');

const getUserId = (req) => String(req.user?.id || req.user?._id || req.userId);

module.exports = function unreadRoutes() {
  const r = express.Router();

  // Trả về tổng hợp số tin chưa đọc cho DM và Group
  r.get('/summary', async (req, res, next) => {
    try {
      const me = getUserId(req);
      const meId = new mongoose.Types.ObjectId(me);

      // --- DM: tin người khác gửi cho tôi, tôi chưa đọc ---
      const dmAgg = await Message.aggregate([
        { $match: {
            receiver: meId,
            sender: { $ne: meId },
            $or: [
              { readBy: { $exists: false } },
              { readBy: { $nin: [meId] } }
            ]
        }},
        { $group: { _id: '$sender', c: { $sum: 1 } } }
      ]);

      // --- Group: tin trong nhóm, tôi chưa đọc ---
      const gpAgg = await Message.aggregate([
        { $match: {
            group: { $exists: true, $ne: null },
            sender: { $ne: meId },
            $or: [
              { readBy: { $exists: false } },
              { readBy: { $nin: [meId] } }
            ]
        }},
        { $addFields: { gid: { $toString: '$group' } } },
        { $group: { _id: '$gid', c: { $sum: 1 } } }
      ]);

      const dms = {};
      dmAgg.forEach(row => { dms[String(row._id)] = row.c; });

      const groups = {};
      gpAgg.forEach(row => { groups[String(row._id)] = row.c; });

      res.json({ dms, groups });
    } catch (e) { next(e); }
  });

  return r;
};
