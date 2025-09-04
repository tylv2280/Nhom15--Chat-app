// server/routes/groups.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const User = require('../models/user');

const getUserId = (req) => String(req.user?.id || req.user?._id || req.userId);
const isMember = (conv, uid) => conv.members.map(String).includes(String(uid));
const isAdmin = (conv, uid) => String(conv.owner) === String(uid) || (conv.admins || []).map(String).includes(String(uid));

module.exports = function groupsRoutes({ notifyUser, onlineUsers, broadcastToConversation }) {
  const r = express.Router();

  // Tạo nhóm (người tạo = owner)
  r.post('/create', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { name, memberIds } = req.body || {};
      if (!name || !Array.isArray(memberIds) || memberIds.length < 2) {
        return res.status(400).json({ error: 'Tên nhóm và >= 2 thành viên' });
      }
      const uniqueMembers = Array.from(new Set([meId, ...memberIds]));
      const group = await Conversation.create({
        type: 'group', name, members: uniqueMembers, owner: meId, admins: []
      });
      uniqueMembers.forEach(uid => notifyUser(uid, 'groups:changed', { groupId: String(group._id) }));
      res.json(group);
    } catch (e) { next(e); }
  });

  // Tham gia bằng ID
  r.post('/join', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { conversationId } = req.body || {};
      if (!conversationId) return res.status(400).json({ error: 'Thiếu conversationId' });

      const conv = await Conversation.findById(conversationId);
      if (!conv || conv.type !== 'group') return res.status(404).json({ error: 'Nhóm không tồn tại' });

      const already = isMember(conv, meId);
      if (!already) { conv.members.push(meId); await conv.save(); }

      const me = await User.findById(meId).select('_id username');
      const payload = { groupId: String(conv._id), userId: meId, username: me?.username || 'Người dùng' };

      broadcastToConversation(String(conv._id), 'group:member_joined', payload);
      conv.members.map(String).forEach(uid => notifyUser(uid, 'groups:changed', { groupId: String(conv._id) }));
      res.json({ ok: true, joined: !already, groupId: String(conv._id) });
    } catch (e) { next(e); }
  });

  // Rời nhóm
  r.post('/leave', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { conversationId } = req.body || {};
      if (!conversationId) return res.status(400).json({ error: 'Thiếu conversationId' });

      const conv = await Conversation.findById(conversationId);
      if (!conv || conv.type !== 'group') return res.status(404).json({ error: 'Nhóm không tồn tại' });

      // Chủ nhóm rời -> chuyển owner cho người lâu năm nhất còn lại (nếu có)
      const wasOwner = String(conv.owner) === String(meId);
      conv.members = conv.members.filter(uid => String(uid) !== meId);
      await conv.save();

      if (wasOwner && conv.members.length > 0) {
        conv.owner = conv.members[0];
        conv.admins = (conv.admins || []).filter(id => String(id) !== String(meId));
        await conv.save();
        broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: '• Chủ nhóm đã được chuyển tự động.' });
      }

      const me = await User.findById(meId).select('_id username');
      const payload = { groupId: String(conv._id), userId: meId, username: me?.username || 'Người dùng' };

      broadcastToConversation(String(conv._id), 'group:member_left', payload);
      const targets = new Set([...conv.members.map(String), meId]);
      targets.forEach(uid => notifyUser(uid, 'groups:changed', { groupId: String(conv._id) }));
      res.json({ ok: true, left: true, groupId: String(conv._id) });
    } catch (e) { next(e); }
  });

  // Danh sách nhóm của tôi
  r.get('/', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const groups = await Conversation.find({ type: 'group', members: meId }).sort({ updatedAt: -1 });
      res.json(groups);
    } catch (e) { next(e); }
  });

  // Thành viên nhóm
  r.get('/:id/members', async (req, res, next) => {
    try {
      const conv = await Conversation.findById(req.params.id).populate('members', '_id username lastSeen avatarUrl');
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      const out = conv.members.map(u => ({
        _id: String(u._id),
        username: u.username,
        avatarUrl: u.avatarUrl || '',
        online: onlineUsers?.has(String(u._id)) || false,
        lastSeen: u.lastSeen || null
      }));
      res.json({ members: out, owner: String(conv.owner || ''), admins: (conv.admins || []).map(String) });
    } catch (e) { next(e); }
  });

  // ==== Quản trị nhóm ====

  // Đổi tên nhóm (owner/admin)
  r.patch('/:id/rename', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { name } = req.body || {};
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (!isAdmin(conv, meId)) return res.status(403).json({ error: 'Không có quyền' });
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Tên không hợp lệ' });

      conv.name = String(name).trim();
      await conv.save();
      broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: `• Nhóm đã đổi tên thành "${conv.name}"` });
      conv.members.map(String).forEach(uid => notifyUser(uid, 'groups:changed', { groupId: String(conv._id) }));
      res.json({ ok: true, name: conv.name });
    } catch (e) { next(e); }
  });

  // Thêm thành viên (owner/admin)
  r.post('/:id/members', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { memberIds } = req.body || {};
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (!isAdmin(conv, meId)) return res.status(403).json({ error: 'Không có quyền' });

      const ids = Array.from(new Set((memberIds || []).map(String))).filter(Boolean);
      if (ids.length === 0) return res.status(400).json({ error: 'Thiếu thành viên' });

      const before = conv.members.map(String);
      ids.forEach(id => { if (!before.includes(id)) conv.members.push(id); });
      await conv.save();

      broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: `• Đã thêm ${ids.length} thành viên` });
      conv.members.map(String).forEach(uid => notifyUser(uid, 'groups:changed', { groupId: String(conv._id) }));
      res.json({ ok: true, added: ids.length });
    } catch (e) { next(e); }
  });

  // Kick thành viên (owner/admin)
  r.delete('/:id/members/:uid', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (!isAdmin(conv, meId)) return res.status(403).json({ error: 'Không có quyền' });

      const uid = String(req.params.uid);
      if (!isMember(conv, uid)) return res.status(400).json({ error: 'Không phải thành viên' });
      if (String(conv.owner) === uid) return res.status(400).json({ error: 'Không thể kick Owner' });

      conv.members = conv.members.filter(id => String(id) !== uid);
      conv.admins = (conv.admins || []).filter(id => String(id) !== uid);
      await conv.save();

      broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: `• Đã xóa một thành viên khỏi nhóm` });
      const targets = new Set([...conv.members.map(String), uid]);
      targets.forEach(u => notifyUser(u, 'groups:changed', { groupId: String(conv._id) }));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Promote/Demote admin (owner)
  r.post('/:id/promote', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { uid } = req.body || {};
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (String(conv.owner) !== String(meId)) return res.status(403).json({ error: 'Chỉ Owner được phân quyền' });
      if (!isMember(conv, uid)) return res.status(400).json({ error: 'Không phải thành viên' });

      conv.admins = Array.from(new Set([...(conv.admins || []), uid]));
      await conv.save();
      broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: '• Đã thăng quyền một thành viên thành Admin' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.post('/:id/demote', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { uid } = req.body || {};
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (String(conv.owner) !== String(meId)) return res.status(403).json({ error: 'Chỉ Owner được phân quyền' });

      conv.admins = (conv.admins || []).filter(id => String(id) !== String(uid));
      await conv.save();
      broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: '• Đã hạ quyền một Admin' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Chuyển quyền owner
  r.post('/:id/transfer', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { uid } = req.body || {};
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (String(conv.owner) !== String(meId)) return res.status(403).json({ error: 'Chỉ Owner được chuyển quyền' });
      if (!isMember(conv, uid)) return res.status(400).json({ error: 'Không phải thành viên' });

      conv.owner = uid;
      conv.admins = Array.from(new Set([...(conv.admins || []), meId])); // chủ cũ thành admin
      await conv.save();
      broadcastToConversation(String(conv._id), 'group:system', { groupId: String(conv._id), text: '• Đã chuyển quyền Owner' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Mã mời
  r.post('/:id/invite', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const conv = await Conversation.findById(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });
      if (!isMember(conv, meId)) return res.status(403).json({ error: 'Không phải thành viên' });

      const token = jwt.sign({ conversationId: String(conv._id) }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
      res.json({ token });
    } catch (e) { next(e); }
  });

  // Tham gia bằng mã mời
  r.post('/join-by-invite', async (req, res, next) => {
    try {
      const meId = getUserId(req);
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: 'Thiếu token' });

      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const conv = await Conversation.findById(payload.conversationId);
      if (!conv) return res.status(404).json({ error: 'Nhóm không tồn tại' });

      if (!isMember(conv, meId)) { conv.members.push(meId); await conv.save(); }

      const me = await User.findById(meId).select('_id username');
      const p = { groupId: String(conv._id), userId: meId, username: me?.username || 'Người dùng' };
      broadcastToConversation(String(conv._id), 'group:member_joined', p);
      conv.members.map(String).forEach(uid => notifyUser(uid, 'groups:changed', { groupId: String(conv._id) }));

      res.json({ ok: true, groupId: String(conv._id) });
    } catch (e) { next(e); }
  });

  return r;
};
