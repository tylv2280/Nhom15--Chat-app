// server/src/sockets/chatSocket.js
const Message = require("../models/Message");
const Room = require("../models/Room");

function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    // Khi user join vào 1 room
    socket.on("joinRoom", ({ roomId, userId }) => {
      socket.join(roomId);
      console.log(`👤 User ${userId} joined room ${roomId}`);
    });

    // Khi user gửi tin nhắn
    socket.on("sendMessage", async ({ senderId, content, roomId, receiverId, type }) => {
      try {
        // Lưu tin nhắn vào DB
        const newMessage = await Message.create({
          sender: senderId,
          content,
          room: roomId || null,
          receiver: receiverId || null,
          type: type || "text",
        });

        // Nếu gửi trong room thì update lastMessage
        if (roomId) {
          await Room.findByIdAndUpdate(roomId, { lastMessage: newMessage._id });
          // Phát tin nhắn cho tất cả thành viên trong room
          io.to(roomId).emit("receiveMessage", newMessage);
        } else {
          // Nếu chat 1-1 → phát tin nhắn cho người nhận
          io.to(receiverId).emit("receiveMessage", newMessage);
          io.to(senderId).emit("receiveMessage", newMessage);
        }
      } catch (err) {
        console.error("❌ Error sending message:", err.message);
      }
    });

    // Khi user rời room
    socket.on("leaveRoom", ({ roomId, userId }) => {
      socket.leave(roomId);
      console.log(`👤 User ${userId} left room ${roomId}`);
    });

    // Khi user ngắt kết nối
    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });
}

module.exports = chatSocket;
