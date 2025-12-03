const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Encrypted payload (server cannot decrypt)
  ciphertext: {
    type: String,
    required: true
  },
  // Initialization vector for AES-GCM
  iv: {
    type: String,
    required: true
  },
  // Key identifier for session key derivation
  keyId: {
    type: String,
    required: true
  },
  // Ephemeral public key used for ECDH (if applicable)
  ephemeralPublicKey: {
    type: String,
    required: false
  },
  // Signature for authenticity
  signature: {
    type: String,
    required: true
  },
  // Header data for signature verification
  headerData: {
    type: String,
    required: false
  },
  // Sequence number for replay protection
  sequenceNumber: {
    type: Number,
    required: false,
    default: 0
  },
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
