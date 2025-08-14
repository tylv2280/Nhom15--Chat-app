const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Mô hình người dùng với các trường: username, email, password
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

// Mã hóa mật khẩu trước khi lưu vào MongoDB
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

// Kiểm tra mật khẩu khi người dùng đăng nhập
userSchema.methods.comparePassword = function(password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
