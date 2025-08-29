// server/src/utils/jwt.js
const jwt = require("jsonwebtoken");

// 🔑 Tạo access token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Thời hạn 7 ngày
  });
};

// ✅ Xác minh token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null; // Nếu token sai hoặc hết hạn
  }
};

// (Optional) 🔄 Tạo refresh token (nếu bạn muốn áp dụng cơ chế refresh token)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d", // Refresh token sống lâu hơn
  });
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
};
