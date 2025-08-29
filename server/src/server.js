// server/server.js
const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const chatSocket = require("./src/sockets/chatSocket");

// Tạo HTTP server
const server = http.createServer(app);

// Tạo socket.io server
const io = new Server(server, {
  cors: {
    origin: "*", // cho phép mọi origin (dev)
    methods: ["GET", "POST"],
  },
});

// Gắn socket chat
chatSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
