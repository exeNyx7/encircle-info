// API client for backend communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api'; // Pointing to MITM attacker for testing
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api'; // Pointing to replay attacker for testing

let authToken = localStorage.getItem('authToken');

export function setAuthToken(token) {
  authToken = token;
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('authToken');
}

export function getAuthToken() {
  return authToken;
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}

// Auth endpoints
export async function register(username, password, publicKey, keyFingerprint) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, publicKey, keyFingerprint })
  });
}

export async function login(username, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

// User endpoints
export async function getUsers() {
  return apiRequest('/users');
}

export async function getUserPublicKey(userId) {
  return apiRequest(`/users/${userId}/public-key`);
}

// Message endpoints
export async function sendMessage(messageData) {
  return apiRequest('/messages', {
    method: 'POST',
    body: JSON.stringify(messageData)
  });
}

export async function getMessages() {
  return apiRequest('/messages');
}

export async function markMessageDelivered(messageId) {
  return apiRequest(`/messages/${messageId}/delivered`, {
    method: 'PATCH'
  });
}

export async function markMessageRead(messageId) {
  return apiRequest(`/messages/${messageId}/read`, {
    method: 'PATCH'
  });
}

// File endpoints
export async function uploadFile(fileData) {
  return apiRequest('/files', {
    method: 'POST',
    body: JSON.stringify(fileData)
  });
}

export async function getFile(fileId) {
  return apiRequest(`/files/${fileId}`);
}

export async function getFiles() {
  return apiRequest('/files');
}
