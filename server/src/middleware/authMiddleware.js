// server/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra header Authorization: "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Giải mã token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Lấy user từ DB (bỏ password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User không tồn tại" });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Không có token, quyền truy cập bị từ chối" });
  }
};
