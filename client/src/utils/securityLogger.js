/**
 * Client-side security event logger
 * Sends security events to backend for centralized logging
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Log a security event to the backend
 */
export async function logSecurityEvent(eventType, details = '', metadata = {}) {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.warn('Cannot log security event: No auth token');
      return;
    }

    await fetch(`${API_BASE}/security/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        eventType,
        details,
        metadata
      })
    });
  } catch (error) {
    console.error('Failed to log security event:', error.message);
    // Don't throw - logging should never break the app
  }
}

/**
 * Get security statistics
 */
export async function getSecurityStats() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/security/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error('Failed to fetch security statistics');
  }

  return await response.json();
}

/**
 * Get security logs
 */
export async function getSecurityLogs(filters = {}) {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams();
  if (filters.eventType) params.append('eventType', filters.eventType);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await fetch(`${API_BASE}/security/logs?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error('Failed to fetch security logs');
  }

  return await response.json();
}

/**
 * Event type constants (must match backend)
 */
export const EVENT_TYPES = {
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
