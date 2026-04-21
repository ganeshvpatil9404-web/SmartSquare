const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, monthlyIncome, currency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const user = await User.create({ name, email, password, monthlyIncome: monthlyIncome || 0, currency: currency || 'INR' });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email, currency: user.currency, smartSquareIndex: user.smartSquareIndex }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, currency: user.currency, smartSquareIndex: user.smartSquareIndex }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, monthlyIncome, currency, preferences } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (monthlyIncome !== undefined) updates.monthlyIncome = monthlyIncome;
    if (currency) updates.currency = currency;
    if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
