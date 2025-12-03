import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  getUsers, 
  getUserPublicKey, 
  sendMessage as sendMessageAPI, 
  getMessages 
} from '../utils/api';
import { getMessageKey } from '../utils/keyExchange';
import { encryptMessage, decryptMessage, decryptFile } from '../utils/crypto';
import { useKeyExchange } from '../hooks/useKeyExchange';
import { clearAllKeys, getNextSequenceNumber, validateSequenceNumber } from '../utils/storage';
import FileUpload from './FileUpload';
import './Chat.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function Chat({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSessionKey, setCurrentSessionKey] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState({});
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { initiate, complete } = useKeyExchange();

  const loadUsers = useCallback(async () => {
    try {
      const usersList = await getUsers();
      setUsers(usersList.filter(u => u._id !== currentUser.userId));
    } catch (err) {
      setError('Failed to load users');
    }
  }, [currentUser.userId]);

  const loadMessages = useCallback(async () => {
    try {
      const messagesList = await getMessages();
      
      // Decrypt historical messages
      const decryptedMessages = await Promise.all(messagesList.map(async (msg) => {
        try {
          // Determine if we're the sender or recipient
          const isSender = msg.senderId === currentUser.userId;
          
          // If we're the sender, we can't decrypt our own sent messages
          // (they were encrypted for the recipient)
          if (isSender) {
            return { ...msg, plaintext: '[Sent]', decrypted: false };
          }
          
          const otherUserId = msg.senderId;
          
          // Try to get session key from storage first
          let sessionKey = await getMessageKey(msg.keyId);
          
          // If we don't have the key and there's ephemeral data, derive it
          if (!sessionKey && msg.ephemeralPublicKey && msg.headerData && msg.signature) {
            try {
              // Get sender's public key
              const userData = await getUserPublicKey(otherUserId);
              
              // Verify we have valid key data
              if (!userData || !userData.publicKey) {
                console.warn('Missing public key for sender:', otherUserId);
                return { ...msg, plaintext: '[Missing sender key]', decrypted: false };
              }
              
              // Complete key exchange to derive session key
              const keyExchangeResult = await complete(
                currentUser.userId,
                msg.senderId,
                msg.ephemeralPublicKey,
                msg.headerData,
                msg.signature
              );
              sessionKey = keyExchangeResult.sessionKey;
            } catch (keyExchangeErr) {
              console.error('Key exchange failed for message:', msg._id, keyExchangeErr);
              return { ...msg, plaintext: '[Key exchange failed]', decrypted: false, error: keyExchangeErr.message };
            }
          }
          
          // Decrypt if we have the session key
          if (sessionKey) {
            try {
              const plaintext = await decryptMessage(sessionKey, msg.ciphertext, msg.iv);
              return { ...msg, plaintext, decrypted: true };
            } catch (decryptErr) {
              console.error('Decryption failed for message:', msg._id, decryptErr);
              return { ...msg, plaintext: '[Decryption failed]', decrypted: false, error: decryptErr.message };
            }
          }
          
          return { ...msg, plaintext: '[Encrypted]', decrypted: false };
        } catch (err) {
          console.error('Failed to process message:', err);
          return { ...msg, plaintext: '[Processing failed]', decrypted: false, error: err.message };
        }
      }));
      
      setMessages(decryptedMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
    }
  }, [currentUser.userId]);

  const handleIncomingMessage = useCallback(async (data) => {
    try {
      // Validate sequence number to prevent replay attacks
      if (data.sequenceNumber) {
        const isValid = await validateSequenceNumber(data.senderId, data.sequenceNumber);
        if (!isValid) {
          console.error('Replay attack detected - ignoring message');
          setError('⚠️ Replay attack detected - message rejected');
          setTimeout(() => setError(''), 5000);
          return;
        }
      }
      
      // Get sender's public key
      const senderData = await getUserPublicKey(data.senderId);
      
      // If we don't have the session key, complete key exchange
      let sessionKey = await getMessageKey(data.keyId);
      
      if (!sessionKey && data.ephemeralPublicKey) {
        const keyExchangeResult = await complete(
          currentUser.userId,
          data.senderId,
          data.ephemeralPublicKey,
          data.headerData,
          data.signature
        );
        sessionKey = keyExchangeResult.sessionKey;
      }
      
      // Decrypt message
      const plaintext = await decryptMessage(
        sessionKey,
        data.ciphertext,
        data.iv
      );
      
      const decryptedMessage = {
        ...data,
        plaintext,
        decrypted: true
      };
      
      setMessages(prev => [...prev, decryptedMessage]);
    } catch (err) {
      console.error('Failed to decrypt message:', err);
      const failedMessage = {
        ...data,
        plaintext: '[Decryption failed]',
        decrypted: false,
        error: err.message
      };
      setMessages(prev => [...prev, failedMessage]);
    }
  }, [currentUser.userId]);

  const handleIncomingFile = useCallback(async (data) => {
    try {
      console.log('Received file notification:', data);
      
      // Add file as a special message type
      const fileMessage = {
        _id: data.fileId,
        senderId: data.uploaderId,
        recipientId: data.recipientId,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        ciphertext: data.ciphertext,
        iv: data.iv,
        keyId: data.keyId,
        ephemeralPublicKey: data.ephemeralPublicKey,
        signature: data.signature,
        headerData: data.headerData,
        timestamp: data.timestamp,
        isFile: true,
        plaintext: `📎 ${data.filename}`,
        decrypted: true
      };
      
      setMessages(prev => [...prev, fileMessage]);
    } catch (err) {
      console.error('Failed to handle incoming file:', err);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadMessages();
    
    // Connect to Socket.io
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join', currentUser.userId);
    
    socketRef.current.on('message', handleIncomingMessage);
    socketRef.current.on('file', handleIncomingFile);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser.userId, loadUsers, loadMessages, handleIncomingMessage, handleIncomingFile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleFileDownload(fileMessage) {
    const fileId = fileMessage._id;
    setDownloadingFiles(prev => ({ ...prev, [fileId]: true }));
    setError('');

    try {
      // Get session key for decryption
      let sessionKey = await getMessageKey(fileMessage.keyId);

      if (!sessionKey && fileMessage.ephemeralPublicKey) {
        // Complete key exchange to derive session key
        const keyExchangeResult = await complete(
          currentUser.userId,
          fileMessage.senderId,
          fileMessage.ephemeralPublicKey,
          fileMessage.headerData,
          fileMessage.signature
        );
        sessionKey = keyExchangeResult.sessionKey;
      }

      if (!sessionKey) {
        throw new Error('Session key not found');
      }

      // Decrypt file
      const decryptedData = await decryptFile(
        sessionKey,
        fileMessage.ciphertext,
        fileMessage.iv
      );

      // Create blob and download
      const blob = new Blob([decryptedData], { type: fileMessage.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMessage.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('File download failed:', err);
      setError(`Failed to download file: ${err.message}`);
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [fileId]: false }));
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Initiate key exchange and get session key
      const keyExchange = await initiate(
        currentUser.userId,
        selectedUser._id
      );
      
      // Store session key for file uploads
      setCurrentSessionKey(keyExchange.sessionKey);
      
      // Encrypt message
      const encrypted = await encryptMessage(keyExchange.sessionKey, newMessage);
      
      // Get next sequence number for this conversation
      const sequenceNumber = await getNextSequenceNumber(selectedUser._id);
      
      // Send to server
      const messageData = {
        senderId: currentUser.userId,
        recipientId: selectedUser._id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyId: keyExchange.keyId,
        ephemeralPublicKey: keyExchange.ephemeralPublicKey,
        headerData: keyExchange.headerData,
        signature: keyExchange.signature,
        sequenceNumber: sequenceNumber
      };
      
      await sendMessageAPI(messageData);
      
      // Add to local messages
      setMessages(prev => [...prev, {
        senderId: currentUser.userId,
        recipientId: selectedUser._id,
        plaintext: newMessage,
        timestamp: new Date(),
        decrypted: true
      }]);
      
      // Emit via socket for real-time delivery
      socketRef.current.emit('message', messageData);
      
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearAllKeys();
    onLogout();
  }

  const filteredMessages = messages.filter(
    m => 
      (m.senderId === currentUser.userId && m.recipientId === selectedUser?._id) ||
      (m.senderId === selectedUser?._id && m.recipientId === currentUser.userId)
  );

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Encircle</h3>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
        
        <div className="user-info">
          <strong>{currentUser.username}</strong>
        </div>
        
        <div className="users-list">
          <h4>Contacts</h4>
          {users.map(user => (
            <div
              key={user._id}
              className={`user-item ${selectedUser?._id === user._id ? 'active' : ''}`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="user-avatar">{user.username[0].toUpperCase()}</div>
              <div className="user-details">
                <div className="user-name">{user.username}</div>
                <div className="key-fingerprint" title={user.keyFingerprint}>
                  {user.keyFingerprint.substring(0, 8)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>{selectedUser.username}</h3>
              <span className="security-indicator" title="End-to-end encrypted">
                🔒 E2EE
              </span>
            </div>
            
            <div className="messages-container">
              {filteredMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.senderId === currentUser.userId ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    {msg.plaintext || '[Encrypted]'}
                    {!msg.decrypted && msg.error && (
                      <div className="decryption-error">{msg.error}</div>
                    )}
                    {msg.isFile && msg.senderId !== currentUser.userId && (
                      <button 
                        className="file-download-btn"
                        onClick={() => handleFileDownload(msg)}
                        disabled={downloadingFiles[msg._id]}
                        title="Decrypt and download file"
                      >
                        {downloadingFiles[msg._id] ? '⏳ Decrypting...' : '📥 Download'}
                      </button>
                    )}
                  </div>
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {error && <div className="error-banner">{error}</div>}
            
            {showFileUpload && (
              <FileUpload
                currentUser={currentUser}
                recipientId={selectedUser._id}
                onUploadSuccess={(filename) => {
                  setShowFileUpload(false);
                  setError('');
                }}
              />
            )}
            
            <div className="message-input">
              <button 
                className="attach-btn"
                onClick={() => setShowFileUpload(!showFileUpload)}
                title="Attach file"
              >
                📎
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                disabled={loading}
              />
              <button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
