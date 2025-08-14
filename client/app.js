const socket = io();

// Lắng nghe sự kiện message từ server và hiển thị tin nhắn
socket.on('message', (msg) => {
    const messagesContainer = document.getElementById('messages');
    const newMessage = document.createElement('div');
    newMessage.textContent = msg;
    messagesContainer.appendChild(newMessage);
});

// Gửi tin nhắn khi người dùng nhấn nút gửi
document.getElementById('send-button').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;
    if (message) {
        socket.emit('message', message);
        messageInput.value = '';
    }
});
