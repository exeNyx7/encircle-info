// Simple session token verification (replace with JWT in production)
const User = require('../models/User');

const sessions = new Map(); // In-memory session store (use Redis in production)

function generateSessionToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

function createSession(userId) {
  const token = generateSessionToken();
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function verifySession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  
  // Expire sessions after 24 hours
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return null;
  }
  
  return session.userId;
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const userId = verifySession(token);
  
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.userId = userId;
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = { authenticate, createSession, verifySession };
