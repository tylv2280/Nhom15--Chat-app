import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

/**
 * Custom hook quản lý socket.io
 * - Kết nối 1 lần khi component mount
 * - Tự động disconnect khi unmount
 * - Cho phép đăng ký/unregister event
 */
export default function useSocket(onMessage) {
  const socketRef = useRef(null);

  useEffect(() => {
    // 👉 Tạo kết nối socket
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    console.log("✅ Socket connected:", socketRef.current.id);

    // 👉 Lắng nghe sự kiện tin nhắn
    if (onMessage) {
      socketRef.current.on("chatMessage", onMessage);
    }

    // 👉 Cleanup khi component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("❌ Socket disconnected");
      }
    };
  }, [onMessage]);

  // 👉 API cho component sử dụng
  const sendMessage = (msg) => {
    if (socketRef.current) {
      socketRef.current.emit("chatMessage", msg);
    }
  };

  return { socket: socketRef.current, sendMessage };
}

