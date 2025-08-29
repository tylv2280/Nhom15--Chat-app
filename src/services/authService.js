// client/src/services/authService.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/auth";

// 🟢 Đăng ký
export const register = async (name, email, password) => {
  const res = await axios.post(`${API_URL}/register`, { name, email, password });
  return res.data; // { user, token }
};

// 🟢 Đăng nhập
export const login = async (email, password) => {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  return res.data; // { user, token }
};

// 🟢 Lấy thông tin user hiện tại
export const getCurrentUser = async (token) => {
  const res = await axios.get(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // user
};
