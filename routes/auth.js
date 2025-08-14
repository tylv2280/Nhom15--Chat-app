const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Route đăng ký người dùng
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Kiểm tra xem người dùng đã tồn tại chưa
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }

        // Tạo mới người dùng
        const user = new User({ username, email, password });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error creating user', error });
    }
});

// Route đăng nhập người dùng
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Kiểm tra người dùng có tồn tại không
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Tạo JWT token sau khi đăng nhập thành công
    const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token });
});

module.exports = router;
