import React, { useState } from 'react';
import { register, setAuthToken } from '../utils/api';
import { 
  generateIdentityKeyPair, 
  exportPublicKey, 
  calculateKeyFingerprint 
} from '../utils/crypto';
import { storeIdentityKeyPair } from '../utils/storage';
import './Auth.css';

function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyGenStatus, setKeyGenStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      // Generate identity keypairs using Web Crypto API
      setKeyGenStatus('Generating cryptographic keys...');
      const keyPairs = await generateIdentityKeyPair();
      
      // Export both public keys (signing and DH)
      const signingPublicKeyJwk = await exportPublicKey(keyPairs.signing.publicKey);
      const dhPublicKeyJwk = await exportPublicKey(keyPairs.dh.publicKey);
      
      // Calculate key fingerprint from signing key
      const fingerprint = await calculateKeyFingerprint(signingPublicKeyJwk);
      
      // Create combined public key data
      const publicKeyData = JSON.stringify({
        signing: signingPublicKeyJwk,
        dh: dhPublicKeyJwk
      });
      
      // Register with server
      setKeyGenStatus('Registering with server...');
      const response = await register(username, password, publicKeyData, fingerprint);
      
      // Store keys locally in IndexedDB
      setKeyGenStatus('Storing keys securely...');
      await storeIdentityKeyPair(keyPairs, response.userId);
      
      // Set auth token
      setAuthToken(response.token);
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('username', response.username);
      
      onRegisterSuccess({
        userId: response.userId,
        username: response.username
      });
    } catch (err) {
      setError(err.message);
      setKeyGenStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-box">
      <div className="brand-logo">🔒</div>
      <h2>Encircle</h2>
      <p className="subtitle">Create your secure account</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength="3"
            autoComplete="username"
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
            autoComplete="new-password"
          />
        </div>
        
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="8"
            autoComplete="new-password"
          />
        </div>
        
        {error && <div className="error">{error}</div>}
        {keyGenStatus && <div className="status">{keyGenStatus}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
      
      <div className="security-notice">
        <p><strong>Security Notice:</strong></p>
        <ul>
          <li>Your private encryption keys will be generated on this device</li>
          <li>Keys are stored locally and never sent to the server</li>
          <li>Only your public key is shared for secure communication</li>
        </ul>
      </div>
      
      <p className="switch-link">
        Already have an account? 
        <button onClick={onSwitchToLogin} className="link-button">
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;
