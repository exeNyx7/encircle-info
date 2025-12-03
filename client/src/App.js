import React, { useState, useEffect } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Chat from './components/Chat';
import { hasIdentityKeys, validateIdentityKeys, clearAllKeys } from './utils/storage';
import { getAuthToken, clearAuthToken } from './utils/api';
import './App.css';

function App() {
  const [view, setView] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [keyValidationError, setKeyValidationError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = getAuthToken();
    const hasKeys = await hasIdentityKeys();
    
    if (token && hasKeys) {
      // Validate key structure
      const validation = await validateIdentityKeys();
      
      if (!validation.valid) {
        // Keys are invalid - force re-registration
        console.warn('Invalid keys detected:', validation.reason);
        setKeyValidationError(validation.reason);
        await clearAllKeys();
        clearAuthToken();
        localStorage.clear();
        setView('login');
        return;
      }
      
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      setCurrentUser({ userId, username });
      setView('chat');
    } else {
      setView('login');
    }
  }

  function handleLoginSuccess(userData) {
    setCurrentUser(userData);
    setView('chat');
  }

  function handleRegisterSuccess(userData) {
    setCurrentUser(userData);
    setView('chat');
  }

  function handleLogout() {
    localStorage.clear();
    setCurrentUser(null);
    setView('login');
  }

  return (
    <div className="App">
      {view === 'loading' && (
        <div className="loading">Loading...</div>
      )}
      
      {keyValidationError && (
        <div className="key-error-banner">
          <strong>⚠️ Security Upgrade Required</strong>
          <p>{keyValidationError}</p>
          <p>Your account was created with an older key format. Please register a new account.</p>
          <button onClick={() => {
            setKeyValidationError(null);
            setView('register');
          }}>
            Register New Account
          </button>
        </div>
      )}
      
      {view === 'login' && (
        <div className="auth-container">
          <Login 
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setView('register')}
          />
        </div>
      )}
      
      {view === 'register' && (
        <div className="auth-container">
          <Register 
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setView('login')}
          />
        </div>
      )}
      
      {view === 'chat' && currentUser && (
        <Chat 
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
