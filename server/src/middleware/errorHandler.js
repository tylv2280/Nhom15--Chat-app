// server/src/middleware/errorHandler.js

// Middleware bắt lỗi
const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
