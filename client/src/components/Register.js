import React, { useState } from 'react';
import { register, setAuthToken } from '../utils/api';
import { 
  generateIdentityKeyPair, 
  exportPublicKey, 
  calculateKeyFingerprint 
} from '../utils/crypto';
import { storeIdentityKeyPair } from '../utils/storage';
import { User, Lock, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-instagram-gradient rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 2C12 2 14 4 14 8C14 12 12 14 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 22C12 22 10 20 10 16C10 12 12 10 12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-card-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground">Join the secure messaging network</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-card-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength="3"
                  autoComplete="username"
                  placeholder="Choose a username"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-md text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-card-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="8"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-md text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-card-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="8"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-md text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Key Generation Status */}
            {keyGenStatus && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-md text-card-foreground text-sm">
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                <span>{keyGenStatus}</span>
              </div>
            )}
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-instagram-gradient text-white font-semibold py-2.5 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="flex gap-3 p-4 bg-muted/50 rounded-md border border-border">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-card-foreground">End-to-End Encryption</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your encryption keys are generated locally and never leave your device. Only you can decrypt your messages.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button 
              onClick={onSwitchToLogin} 
              className="text-card-foreground font-semibold hover:underline focus:outline-none focus:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
