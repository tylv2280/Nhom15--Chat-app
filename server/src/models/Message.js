// server/src/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Liên kết tới User gửi tin
      required: true,
    },
    content: {
      type: String,
      required: true, // Nội dung tin nhắn
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room", // Liên kết tới Room (nếu chat group)
      required: false, // Có thể null nếu chat riêng
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Người nhận (nếu chat 1-1)
      required: false,
    },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text", // Loại tin nhắn
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Danh sách user đã đọc tin nhắn
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
