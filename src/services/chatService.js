// client/src/services/chatService.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/chat";

// 🟢 Lấy danh sách phòng
export const getRooms = async (token) => {
  const res = await axios.get(`${API_URL}/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // [{id, name, users}, ...]
};

// 🟢 Tạo phòng mới
export const createRoom = async (name, token) => {
  const res = await axios.post(
    `${API_URL}/rooms`,
    { name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data; // { id, name }
};

// 🟢 Lấy tin nhắn trong phòng
export const getMessages = async (roomId, token) => {
  const res = await axios.get(`${API_URL}/rooms/${roomId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // [{ sender, text, createdAt }]
};

// 🟢 Gửi tin nhắn
export const sendMessage = async (roomId, text, token) => {
  const res = await axios.post(
    `${API_URL}/rooms/${roomId}/messages`,
    { text },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data; // { sender, text, createdAt }
};
