const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Tạo ứng dụng Express
const app = express();
const server = http.createServer(app);

// Cấu hình socket.io
const io = socketIo(server);

// Thiết lập middleware để phục vụ tệp tĩnh từ thư mục client
app.use(express.static(path.join(__dirname, '..', 'client')));

// Xử lý khi có người dùng kết nối
io.on('connection', (socket) => {
    console.log('Một người dùng đã kết nối');
    
    // Lắng nghe tin nhắn từ client
    socket.on('message', (msg) => {
        console.log('Tin nhắn nhận được:', msg);
        // Gửi lại tin nhắn cho tất cả các client khác
        io.emit('message', msg);
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', () => {
        console.log('Người dùng đã ngắt kết nối');
    });
});

// Cấu hình route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));  // Đảm bảo đường dẫn đúng
});

// Chạy server trên cổng 3000
server.listen(3005, () => {
    console.log('Server đang chạy trên http://localhost:3000');
});
