import React, { useState } from 'react';
import { login, setAuthToken } from '../utils/api';
import { User, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(username, password);
      
      setAuthToken(response.token);
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('username', response.username);
      
      onLoginSuccess({
        userId: response.userId,
        username: response.username
      });
    } catch (err) {
      setError(err.message);
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
            <h1 className="text-3xl font-bold tracking-tight text-card-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your secure messaging account</p>
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
                  autoComplete="username"
                  placeholder="Enter your username"
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
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-instagram-gradient text-white font-semibold py-2.5 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button 
              onClick={onSwitchToRegister} 
              className="text-card-foreground font-semibold hover:underline focus:outline-none focus:underline"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
