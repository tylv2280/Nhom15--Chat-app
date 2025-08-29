// server/src/controllers/roomController.js
const Room = require("../models/Room");

// Tạo phòng mới
exports.createRoom = async (req, res) => {
  try {
    const { name, members } = req.body;

    const room = await Room.create({
      name,
      members,
      admins: [req.user.id],
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy danh sách phòng mà user tham gia
exports.getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user.id })
      .populate("members", "username email avatar")
      .populate("lastMessage");

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Thêm thành viên vào phòng
exports.addMember = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    const room = await Room.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: userId } }, // addToSet tránh trùng
      { new: true }
    ).populate("members", "username email avatar");

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Xóa thành viên khỏi phòng
exports.removeMember = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    const room = await Room.findByIdAndUpdate(
      roomId,
      { $pull: { members: userId } },
      { new: true }
    ).populate("members", "username email avatar");

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
