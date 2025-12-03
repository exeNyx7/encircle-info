import React, { useState, useEffect } from 'react';
import { getSecurityStats, getSecurityLogs } from '../utils/securityLogger';
import './SecurityLogs.css';

function SecurityLogs({ onBack, onSessionExpired }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadData();
    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  async function loadData() {
    try {
      const [statsData, logsData] = await Promise.all([
        getSecurityStats(),
        getSecurityLogs({ eventType: filter === 'all' ? undefined : filter, limit: 100 })
      ]);
      
      setStats(statsData);
      setLogs(logsData.logs || []);
      setError('');
    } catch (err) {
      const errorMessage = err.message;
      setError('Failed to load security logs: ' + errorMessage);
      
      // If session expired, redirect to login after a delay
      if (errorMessage.includes('Session expired') || errorMessage.includes('Not authenticated')) {
        setTimeout(() => {
          if (onSessionExpired) {
            onSessionExpired();
          } else {
            // Fallback: clear storage and reload
            localStorage.clear();
            window.location.reload();
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  function getEventTypeDisplay(eventType) {
    const map = {
      'auth_success': 'auth success',
      'auth_failure': 'auth failure',
      'message_sent': 'message sent',
      'replay_attack_detected': 'replay attack detected',
      'invalid_signature': 'invalid signature',
      'decryption_failure': 'decryption failure',
      'key_exchange_success': 'key exchange success',
      'key_exchange_failure': 'key exchange failure',
      'public_key_access': 'public key access',
      'registration_success': 'registration success',
      'registration_failure': 'registration failure'
    };
    return map[eventType] || eventType;
  }

  if (loading && !stats) {
    return <div className="security-logs-loading">Loading security logs...</div>;
  }

  return (
    <div className="security-logs-container">
      <div className="security-logs-header">
        <div className="header-left">
          <span className="security-icon">🔒</span>
          <h2>Security Logs & Monitoring</h2>
        </div>
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Cards */}
      {stats && (
        <div className="security-stats">
          <h3>📊 Security Statistics (Last 24 Hours)</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">AUTH FAILURE</div>
              <div className="stat-value">{stats.authFailure}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">AUTH SUCCESS</div>
              <div className="stat-value">{stats.authSuccess}</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-label">REPLAY ATTACK DETECTED</div>
              <div className="stat-value">{stats.replayAttack}</div>
              {stats.criticalCount > 0 && (
                <div className="stat-critical-badge">{stats.criticalCount} critical</div>
              )}
            </div>
            <div className="stat-card">
              <div className="stat-label">MESSAGE SENT</div>
              <div className="stat-value">{stats.messageSent}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="security-filters">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Events
        </button>
        <button 
          className={`filter-tab ${filter === 'auth_failure' ? 'active' : ''}`}
          onClick={() => setFilter('auth_failure')}
        >
          Auth Failures
        </button>
        <button 
          className={`filter-tab ${filter === 'replay_attack_detected' ? 'active' : ''}`}
          onClick={() => setFilter('replay_attack_detected')}
        >
          Replay Attacks
        </button>
        <button 
          className={`filter-tab ${filter === 'invalid_signature' ? 'active' : ''}`}
          onClick={() => setFilter('invalid_signature')}
        >
          Invalid Signatures
        </button>
        <button 
          className={`filter-tab ${filter === 'decryption_failure' ? 'active' : ''}`}
          onClick={() => setFilter('decryption_failure')}
        >
          Decryption Failures
        </button>
      </div>

      {/* Event Log Table */}
      <div className="security-event-log">
        <h3>📋 Security Event Log</h3>
        <div className="log-table-container">
          <table className="log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Severity</th>
                <th>User</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-logs">No security events found</td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log._id || idx}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>{getEventTypeDisplay(log.eventType)}</td>
                    <td>
                      <span className={`severity-badge ${log.severity.toLowerCase()}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td>{log.userId}</td>
                    <td>{log.ipAddress}</td>
                    <td>
                      <button 
                        className="view-details-btn"
                        onClick={() => setSelectedLog(log)}
                      >
                        ▶ View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Event Details</h3>
              <button onClick={() => setSelectedLog(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Event Type:</strong>
                <span>{getEventTypeDisplay(selectedLog.eventType)}</span>
              </div>
              <div className="detail-row">
                <strong>Severity:</strong>
                <span className={`severity-badge ${selectedLog.severity.toLowerCase()}`}>
                  {selectedLog.severity}
                </span>
              </div>
              <div className="detail-row">
                <strong>Timestamp:</strong>
                <span>{formatTimestamp(selectedLog.timestamp)}</span>
              </div>
              <div className="detail-row">
                <strong>User ID:</strong>
                <span>{selectedLog.userId}</span>
              </div>
              <div className="detail-row">
                <strong>IP Address:</strong>
                <span>{selectedLog.ipAddress}</span>
              </div>
              <div className="detail-row">
                <strong>Details:</strong>
                <span>{selectedLog.details || 'No additional details'}</span>
              </div>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="detail-row">
                  <strong>Metadata:</strong>
                  <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityLogs;
