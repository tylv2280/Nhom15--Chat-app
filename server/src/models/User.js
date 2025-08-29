// server/src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Định nghĩa schema User
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    avatar: {
      type: String,
      default: "https://i.pravatar.cc/150", // ảnh avatar mặc định
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt, updatedAt
  }
);

// 🔑 Mã hóa mật khẩu trước khi lưu vào DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Nếu không đổi pass thì bỏ qua

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 📌 Hàm kiểm tra mật khẩu khi login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Xuất model
const User = mongoose.model("User", userSchema);
module.exports = User;
