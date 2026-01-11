import React, { useState, useEffect, useCallback } from 'react';
import { getSecurityStats, getSecurityLogs } from '../utils/securityLogger';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Activity,
  ArrowLeft,
  Filter,
  Eye,
  X,
  TrendingUp,
  Lock,
  AlertCircle
} from 'lucide-react';

function SecurityLogs({ onBack, onSessionExpired }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = useCallback(async () => {
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
  }, [filter, onSessionExpired]);

  useEffect(() => {
    loadData();
    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-instagram-gradient rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading security logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-instagram-gradient border-b border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Security Logs & Monitoring</h1>
                <p className="text-sm text-white/80">Real-time security event tracking</p>
              </div>
            </div>
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-card-foreground">Security Statistics</h2>
              <span className="text-sm text-muted-foreground">(Last 24 Hours)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Auth Failure</span>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="text-3xl font-bold text-card-foreground">{stats.authFailure}</div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Auth Success</span>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-card-foreground">{stats.authSuccess}</div>
              </div>
              
              <div className="bg-card border border-destructive/50 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-destructive uppercase tracking-wider">Replay Attacks</span>
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-3xl font-bold text-destructive">{stats.replayAttack}</div>
                {stats.criticalCount > 0 && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 bg-destructive/20 rounded-full text-xs font-semibold text-destructive">
                    {stats.criticalCount} critical
                  </div>
                )}
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Messages Sent</span>
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-card-foreground">{stats.messageSent}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-card-foreground">Filter Events</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-instagram-gradient text-white shadow-md' 
                  : 'bg-card border border-border text-card-foreground hover:bg-accent'
              }`}
              onClick={() => setFilter('all')}
            >
              All Events
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'auth_failure' 
                  ? 'bg-instagram-gradient text-white shadow-md' 
                  : 'bg-card border border-border text-card-foreground hover:bg-accent'
              }`}
              onClick={() => setFilter('auth_failure')}
            >
              Auth Failures
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'replay_attack_detected' 
                  ? 'bg-instagram-gradient text-white shadow-md' 
                  : 'bg-card border border-border text-card-foreground hover:bg-accent'
              }`}
              onClick={() => setFilter('replay_attack_detected')}
            >
              Replay Attacks
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'invalid_signature' 
                  ? 'bg-instagram-gradient text-white shadow-md' 
                  : 'bg-card border border-border text-card-foreground hover:bg-accent'
              }`}
              onClick={() => setFilter('invalid_signature')}
            >
              Invalid Signatures
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'decryption_failure' 
                  ? 'bg-instagram-gradient text-white shadow-md' 
                  : 'bg-card border border-border text-card-foreground hover:bg-accent'
              }`}
              onClick={() => setFilter('decryption_failure')}
            >
              Decryption Failures
            </button>
          </div>
        </div>

        {/* Event Log Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-card-foreground">Security Event Log</h2>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Activity className="h-8 w-8 text-muted-foreground/50" />
                          <span>No security events found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={log._id || idx} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground font-medium">
                          {getEventTypeDisplay(log.eventType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            log.severity.toLowerCase() === 'critical' 
                              ? 'bg-destructive/20 text-destructive' 
                              : log.severity.toLowerCase() === 'high'
                              ? 'bg-orange-500/20 text-orange-600'
                              : log.severity.toLowerCase() === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-600'
                              : 'bg-blue-500/20 text-blue-600'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button 
                            className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border bg-instagram-gradient">
              <h3 className="text-xl font-semibold text-white">Event Details</h3>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Event Type</div>
                  <div className="text-card-foreground font-semibold">{getEventTypeDisplay(selectedLog.eventType)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Severity</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedLog.severity.toLowerCase() === 'critical' 
                      ? 'bg-destructive/20 text-destructive' 
                      : selectedLog.severity.toLowerCase() === 'high'
                      ? 'bg-orange-500/20 text-orange-600'
                      : selectedLog.severity.toLowerCase() === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-600'
                      : 'bg-blue-500/20 text-blue-600'
                  }`}>
                    {selectedLog.severity}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Timestamp</div>
                  <div className="text-card-foreground">{formatTimestamp(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">User ID</div>
                  <div className="text-card-foreground font-mono text-sm">{selectedLog.userId}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm font-medium text-muted-foreground mb-1">IP Address</div>
                  <div className="text-card-foreground font-mono">{selectedLog.ipAddress}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Details</div>
                  <div className="text-card-foreground">{selectedLog.details || 'No additional details'}</div>
                </div>
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Metadata</div>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto text-card-foreground font-mono">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityLogs;
