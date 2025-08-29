// server/src/models/Room.js
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Danh sách user trong room
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Quản trị viên phòng
      },
    ],
    isGroup: {
      type: Boolean,
      default: true, // Nếu false thì có thể dùng cho chat 1-1
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message", // Lưu tin nhắn cuối cùng
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;
