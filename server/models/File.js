const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  // Encrypted file data
  ciphertext: {
    type: String,
    required: true
  },
  // Initialization vector
  iv: {
    type: String,
    required: true
  },
  // Number of chunks (for future streaming support)
  chunks: {
    type: Number,
    default: 1
  },
  // Key exchange metadata
  keyId: {
    type: String,
    required: true
  },
  ephemeralPublicKey: {
    type: String,
    required: false
  },
  signature: {
    type: String,
    required: true
  },
  headerData: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
