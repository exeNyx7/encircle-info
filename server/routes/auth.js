const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createSession } = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, publicKey, keyFingerprint } = req.body;
    
    // Validate input
    if (!username || !password || !publicKey || !keyFingerprint) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user (password will be hashed by pre-save hook)
    const user = new User({
      username,
      passwordHash: password, // Will be hashed in pre-save
      publicKey,
      keyFingerprint
    });
    
    await user.save();
    
    // Create session
    const token = createSession(user._id.toString());
    
    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
      username: user.username,
      token
    });
  } catch (error) {
    console.error('Registration error:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const token = createSession(user._id.toString());
    
    res.json({
      message: 'Login successful',
      userId: user._id,
      username: user.username,
      token
    });
  } catch (error) {
    console.error('Login error:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
