const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const Message = require('./models/message');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Kết nối MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/chat-app-clean', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => console.log('Connected to MongoDB: chat-app-clean'));

// Middleware để serve client
app.use(express.static(path.join(__dirname, '../client')));

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected');

  // Gửi tất cả tin nhắn cũ cho client mới
  Message.find().sort({ timestamp: 1 }).then(messages => {
    socket.emit('previousMessages', messages);
  });

  // Nhận tin nhắn mới từ client
  socket.on('chatMessage', async (msg) => {
    const message = new Message({
      username: msg.username,
      content: msg.content
    });
    await message.save();

    io.emit('chatMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
