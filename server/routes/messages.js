const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');

// Send message (store encrypted)
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipientId, ciphertext, iv, keyId, ephemeralPublicKey, headerData, signature, sequenceNumber } = req.body;
    
    if (!recipientId || !ciphertext || !iv || !keyId || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const message = new Message({
      senderId: req.userId,
      recipientId,
      ciphertext,
      iv,
      keyId,
      ephemeralPublicKey,
      headerData,
      signature,
      sequenceNumber: sequenceNumber || 0
    });
    
    await message.save();
    
    res.status(201).json({
      messageId: message._id,
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Error sending message:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { recipientId: req.userId },
        { senderId: req.userId }
      ]
    }).sort({ timestamp: 1 });
    
    // Convert ObjectIds to strings for consistency
    const formattedMessages = messages.map(msg => ({
      ...msg.toObject(),
      senderId: msg.senderId.toString(),
      recipientId: msg.recipientId.toString()
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as delivered
router.patch('/:messageId/delivered', authenticate, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.messageId, recipientId: req.userId },
      { delivered: true },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating message:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Mark message as read
router.patch('/:messageId/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.messageId, recipientId: req.userId },
      { read: true },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating message:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to update message' });
  }
});

module.exports = router;
