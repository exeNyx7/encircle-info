const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Get all users (for contact list)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find({}, 'username keyFingerprint createdAt');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user's public key
router.get('/:userId/public-key', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validate userId is not undefined or empty
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      userId: user._id,
      username: user.username,
      publicKey: user.publicKey,
      keyFingerprint: user.keyFingerprint
    });
  } catch (error) {
    console.error('Error fetching public key:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

module.exports = router;
