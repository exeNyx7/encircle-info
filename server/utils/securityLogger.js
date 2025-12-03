const SecurityLog = require('../models/SecurityLog');

/**
 * Security event types
 */
const EVENT_TYPES = {
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILURE: 'auth_failure',
  MESSAGE_SENT: 'message_sent',
  REPLAY_ATTACK: 'replay_attack_detected',
  INVALID_SIGNATURE: 'invalid_signature',
  DECRYPTION_FAILURE: 'decryption_failure',
  KEY_EXCHANGE_SUCCESS: 'key_exchange_success',
  KEY_EXCHANGE_FAILURE: 'key_exchange_failure',
  PUBLIC_KEY_ACCESS: 'public_key_access',
  REGISTRATION_SUCCESS: 'registration_success',
  REGISTRATION_FAILURE: 'registration_failure'
};

/**
 * Severity levels
 */
const SEVERITY = {
  INFO: 'INFO',
  CRITICAL: 'CRITICAL'
};

/**
 * Log a security event
 * @param {string} eventType - Type of security event
 * @param {object} data - Event data
 */
async function logSecurityEvent(eventType, data = {}) {
  try {
    const severity = getCriticalEvents().includes(eventType) ? SEVERITY.CRITICAL : SEVERITY.INFO;
    
    const logEntry = new SecurityLog({
      eventType,
      severity,
      userId: data.userId || 'N/A',
      ipAddress: data.ipAddress || '-1',
      details: data.details || '',
      metadata: data.metadata || {}
    });

    await logEntry.save();
    
    // Console log for debugging
    console.log(`[SECURITY ${severity}] ${eventType} - User: ${logEntry.userId} - IP: ${logEntry.ipAddress}`);
    
    return logEntry;
  } catch (error) {
    console.error('Error logging security event:', error.message);
    // Don't throw - logging should never break the app
  }
}

/**
 * Get list of critical events
 */
function getCriticalEvents() {
  return [
    EVENT_TYPES.REPLAY_ATTACK,
    EVENT_TYPES.INVALID_SIGNATURE,
    EVENT_TYPES.AUTH_FAILURE
  ];
}

/**
 * Extract IP address from request
 */
function getIpAddress(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         '-1';
}

module.exports = {
  logSecurityEvent,
  EVENT_TYPES,
  SEVERITY,
  getCriticalEvents,
  getIpAddress
};
