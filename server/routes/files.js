const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { authenticate } = require('../middleware/auth');

// Socket.io will be injected by the main server
let io;

// Upload encrypted file
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipientId, filename, mimeType, size, ciphertext, iv, chunks, keyId, ephemeralPublicKey, signature, headerData } = req.body;
    
    if (!recipientId || !filename || !ciphertext || !iv || !keyId || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const file = new File({
      uploaderId: req.userId,
      recipientId,
      filename,
      mimeType,
      size,
      ciphertext,
      iv,
      chunks: chunks || 1,
      keyId,
      ephemeralPublicKey,
      signature,
      headerData
    });
    
    await file.save();
    
    // Emit real-time notification to recipient
    if (io) {
      io.to(recipientId).emit('file', {
        fileId: file._id,
        uploaderId: req.userId,
        recipientId,
        filename,
        mimeType,
        size,
        ciphertext,
        iv,
        chunks: chunks || 1,
        keyId,
        ephemeralPublicKey,
        signature,
        headerData,
        timestamp: file.timestamp
      });
    }
    
    res.status(201).json({
      fileId: file._id,
      timestamp: file.timestamp
    });
  } catch (error) {
    console.error('Error uploading file:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file by ID
router.get('/:fileId', authenticate, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      $or: [
        { uploaderId: req.userId },
        { recipientId: req.userId }
      ]
    }).populate('uploaderId', 'username');
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error fetching file:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Get files for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const files = await File.find({
      recipientId: req.userId
    }).populate('uploaderId', 'username').sort({ timestamp: -1 });
    
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error.message || 'Unknown error');
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

module.exports = (socketIo) => {
  io = socketIo;
  return router;
};
