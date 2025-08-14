const express = require('express');  // Chỉ cần khai báo một lần
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Cấu hình middleware để phục vụ tệp tĩnh từ thư mục client
app.use(express.static(path.join(__dirname, '..', 'client')));

// Cấu hình middleware để xử lý JSON request body
app.use(express.json());

// Sử dụng các route đăng ký và đăng nhập
app.use('/api/auth', authRoutes);

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/chat-app', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Xử lý khi có người dùng kết nối
io.on('connection', (socket) => {
    console.log('Một người dùng đã kết nối');
    
    socket.on('message', (msg) => {
        console.log('Tin nhắn nhận được:', msg);
        io.emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Người dùng đã ngắt kết nối');
    });
});

// Cấu hình route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Chạy server trên cổng 3000
server.listen(3000, () => {
    console.log('Server đang chạy trên http://localhost:3000');
});
