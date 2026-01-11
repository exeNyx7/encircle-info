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
import { logSecurityEvent, EVENT_TYPES } from '../utils/securityLogger';
import FileUpload from './FileUpload';
import { 
  Search, 
  UserCircle, 
  ShieldCheck, 
  Paperclip, 
  Send, 
  LogOut, 
  X,
  Download,
  Loader2,
  Lock,
  AlertCircle,
  CheckCheck
} from 'lucide-react';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function Chat({ currentUser, onLogout, onViewSecurityLogs }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSessionKey, setCurrentSessionKey] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
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
              // Log key exchange failure
              await logSecurityEvent(
                EVENT_TYPES.KEY_EXCHANGE_FAILURE,
                `Key exchange failed with ${msg.senderId}`,
                { messageId: msg._id, error: keyExchangeErr.message }
              );
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
              // Log decryption failure
              await logSecurityEvent(
                EVENT_TYPES.DECRYPTION_FAILURE,
                `Failed to decrypt message from ${msg.senderId}`,
                { messageId: msg._id, error: decryptErr.message }
              );
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
          // Log replay attack detection
          await logSecurityEvent(
            EVENT_TYPES.REPLAY_ATTACK,
            `Replay attack detected from ${data.senderId}`,
            { sequenceNumber: data.sequenceNumber, keyId: data.keyId }
          );
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
        try {
          const keyExchangeResult = await complete(
            currentUser.userId,
            data.senderId,
            data.ephemeralPublicKey,
            data.headerData,
            data.signature
          );
          sessionKey = keyExchangeResult.sessionKey;
          // Log successful key exchange
          await logSecurityEvent(
            EVENT_TYPES.KEY_EXCHANGE_SUCCESS,
            `Key exchange completed with ${data.senderId}`,
            { keyId: data.keyId }
          );
        } catch (keyExchangeErr) {
          console.error('Key exchange failed:', keyExchangeErr);
          // Log key exchange failure
          await logSecurityEvent(
            EVENT_TYPES.KEY_EXCHANGE_FAILURE,
            `Key exchange failed with ${data.senderId}`,
            { error: keyExchangeErr.message }
          );
          throw keyExchangeErr;
        }
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
      // Log decryption failure
      await logSecurityEvent(
        EVENT_TYPES.DECRYPTION_FAILURE,
        `Failed to decrypt incoming message from ${data.senderId}`,
        { keyId: data.keyId, error: err.message }
      );
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

  // Filter users by search query
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Filter messages by search query (only if there's a search query)
  const searchFilteredMessages = messageSearchQuery.trim()
    ? filteredMessages.filter(msg =>
        msg.plaintext?.toLowerCase().includes(messageSearchQuery.toLowerCase())
      )
    : filteredMessages;

  // Helper function to format date labels
  const formatDateLabel = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    const diffTime = today - messageDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper function to group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({
          type: 'date',
          label: formatDateLabel(msg.timestamp),
          date: msgDate
        });
      }
      
      groups.push({
        type: 'message',
        data: msg
      });
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate(searchFilteredMessages);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card/50 backdrop-blur-md flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border bg-instagram-gradient">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 2C12 2 14 4 14 8C14 12 12 14 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 22C12 22 10 20 10 16C10 12 12 10 12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              Encircle
            </h2>
            <div className="flex gap-2">
              {onViewSecurityLogs && (
                <button 
                  onClick={onViewSecurityLogs} 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                  title="Security Logs"
                >
                  <ShieldCheck className="h-4 w-4 text-white" />
                </button>
              )}
              <button 
                onClick={handleLogout} 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
          
          {/* Current User Info */}
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{currentUser.username}</p>
              <p className="text-xs text-white/80 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Keys Verified
              </p>
            </div>
          </div>
        </div>

        {/* User Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contacts ({filteredUsers.length})
            </h3>
            {filteredUsers.map(user => (
              <button
                key={user._id}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-accent/50 ${
                  selectedUser?._id === user._id ? 'bg-accent' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                    selectedUser?._id === user._id 
                      ? 'bg-instagram-gradient ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {user.username[0].toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-card-foreground truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Lock className="h-3 w-3 flex-shrink-0" />
                    {user.keyFingerprint.substring(0, 12)}...
                  </p>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No contacts found
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-instagram-gradient flex items-center justify-center font-semibold text-white ring-2 ring-primary ring-offset-2 ring-offset-background">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{selectedUser.username}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    End-to-end encrypted
                  </p>
                </div>
              </div>
              
              {/* Message Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
                {messageSearchQuery && (
                  <button
                    onClick={() => setMessageSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messageSearchQuery && searchFilteredMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No messages found matching "{messageSearchQuery}"
                </div>
              )}
              
              {groupedMessages.map((item, idx) => {
                if (item.type === 'date') {
                  return (
                    <div key={`date-${idx}`} className="flex items-center justify-center my-4">
                      <div className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground font-medium">
                        {item.label}
                      </div>
                    </div>
                  );
                }

                const msg = item.data;
                const isSent = msg.senderId === currentUser.userId;
                
                return (
                  <div
                    key={idx}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {/* Message Bubble */}
                      <div
                        className={`relative px-4 py-2.5 ${
                          isSent
                            ? 'bg-instagram-gradient text-white rounded-3xl rounded-br-md'
                            : 'bg-muted text-card-foreground rounded-3xl rounded-bl-md'
                        } shadow-sm transition-all group-hover:shadow-md`}
                      >
                        <p className="text-sm break-words leading-relaxed">
                          {msg.plaintext || '[Encrypted]'}
                        </p>
                        
                        {!msg.decrypted && msg.error && (
                          <div className="mt-2 flex items-center gap-1 text-xs opacity-80">
                            <AlertCircle className="h-3 w-3" />
                            <span>{msg.error}</span>
                          </div>
                        )}
                        
                        {msg.isFile && msg.senderId !== currentUser.userId && (
                          <button 
                            className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isSent
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-card hover:bg-card/80 text-card-foreground'
                            }`}
                            onClick={() => handleFileDownload(msg)}
                            disabled={downloadingFiles[msg._id]}
                            title="Decrypt and download file"
                          >
                            {downloadingFiles[msg._id] ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Decrypting...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Timestamp and Status - Shows full timestamp on hover */}
                      <div className={`flex items-center gap-1.5 px-2 text-xs transition-opacity ${
                        isSent ? 'flex-row-reverse' : 'flex-row'
                      }`}>
                        {/* Short time (always visible) */}
                        <span className="text-muted-foreground group-hover:hidden">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {/* Full timestamp (visible on hover) */}
                        <span className="text-muted-foreground hidden group-hover:inline">
                          {new Date(msg.timestamp).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                        
                        {msg.decrypted && (
                          <Lock className="h-3 w-3 text-muted-foreground/70" />
                        )}
                        
                        {isSent && msg.decrypted && (
                          <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Error Banner */}
            {error && (
              <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {/* File Upload Overlay */}
            {showFileUpload && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="relative bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                  <button 
                    className="absolute top-4 right-4 p-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setShowFileUpload(false)}
                    title="Close file upload"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <FileUpload
                    currentUser={currentUser}
                    recipientId={selectedUser._id}
                    onUploadSuccess={(filename) => {
                      setShowFileUpload(false);
                      setError('');
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Message Input - Floating Pill Style */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1.5 shadow-sm hover:shadow-md transition-shadow">
                <button 
                  className={`p-2 rounded-full transition-all ${
                    showFileUpload 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-accent-foreground'
                  }`}
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  title={showFileUpload ? "Close file upload" : "Attach file"}
                >
                  {showFileUpload ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && newMessage.trim() && sendMessage()}
                  placeholder="Message..."
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                
                <button 
                  onClick={sendMessage} 
                  disabled={loading || !newMessage.trim()}
                  className={`p-2.5 rounded-full transition-all ${
                    newMessage.trim() && !loading
                      ? 'bg-instagram-gradient text-white hover:scale-110 shadow-md'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  title="Send message"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-instagram-gradient rounded-full flex items-center justify-center mx-auto">
                <UserCircle className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">Welcome to Encircle</h3>
              <p className="text-muted-foreground">Select a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
