// server/src/controllers/chatController.js
const Message = require("../models/Message");
const User = require("../models/User");
const Room = require("../models/Room");

// Gửi tin nhắn
exports.sendMessage = async (req, res) => {
  try {
    const { content, roomId, receiverId, type } = req.body;

    const newMessage = await Message.create({
      sender: req.user.id,
      content,
      room: roomId || null,
      receiver: receiverId || null,
      type: type || "text",
    });

    // Nếu gửi trong room thì update lastMessage
    if (roomId) {
      await Room.findByIdAndUpdate(roomId, { lastMessage: newMessage._id });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy lịch sử tin nhắn trong room
exports.getMessagesByRoom = async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username email avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy lịch sử chat 1-1
exports.getMessagesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    })
      .populate("sender", "username email avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
