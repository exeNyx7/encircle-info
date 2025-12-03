const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'auth_success',
      'auth_failure',
      'message_sent',
      'replay_attack_detected',
      'invalid_signature',
      'decryption_failure',
      'key_exchange_success',
      'key_exchange_failure',
      'public_key_access',
      'registration_success',
      'registration_failure'
    ],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['INFO', 'CRITICAL'],
    default: 'INFO'
  },
  userId: {
    type: String,
    default: 'N/A'
  },
  ipAddress: {
    type: String,
    default: '-1'
  },
  details: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Index for faster queries on recent logs
securityLogSchema.index({ timestamp: -1 });
securityLogSchema.index({ eventType: 1, timestamp: -1 });
securityLogSchema.index({ severity: 1, timestamp: -1 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
