import React, { useState } from 'react';
import { encryptFile } from '../utils/crypto';
import { uploadFile } from '../utils/api';
import { getUserPublicKey } from '../utils/api';
import { initiateKeyExchange } from '../utils/keyExchange';
import './FileUpload.css';

function FileUpload({ currentUser, recipientId, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !recipientId) {
      setError('Please select a file and recipient');
      return;
    }
    
    setUploading(true);
    setError('');
    setProgress(0);
    
    try {
      // Get recipient's public key and perform key exchange
      setProgress(10);
      const recipientData = await getUserPublicKey(recipientId);
      
      setProgress(20);
      const keyExchange = await initiateKeyExchange(
        currentUser.userId,
        recipientId,
        recipientData.publicKey
      );
      
      // Read file as ArrayBuffer
      setProgress(30);
      const fileBuffer = await selectedFile.arrayBuffer();
      
      // Encrypt file
      setProgress(50);
      const encrypted = await encryptFile(keyExchange.sessionKey, fileBuffer);
      
      setProgress(70);
      
      // Prepare file metadata with all required fields
      const fileData = {
        recipientId,
        filename: selectedFile.name,
        mimeType: selectedFile.type,
        size: selectedFile.size,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        chunks: encrypted.chunks || 1,
        keyId: keyExchange.keyId,
        ephemeralPublicKey: keyExchange.ephemeralPublicKey,
        signature: keyExchange.signature,
        headerData: keyExchange.headerData
      };
      
      setProgress(85);
      
      // Upload to server
      await uploadFile(fileData);
      
      setProgress(100);
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(selectedFile.name);
      }
      
      // Reset after 2 seconds
      setTimeout(() => {
        setSelectedFile(null);
        setProgress(0);
        setUploading(false);
      }, 2000);
      
    } catch (err) {
      console.error('File upload error:', err);
      setError('Upload failed: ' + err.message);
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <div 
        className={`file-drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <>
            <div className="drop-icon">📎</div>
            <p>Drag and drop a file here, or</p>
            <label className="file-select-btn">
              Choose File
              <input 
                type="file" 
                onChange={handleFileSelect}
                disabled={uploading}
                hidden
              />
            </label>
          </>
        ) : (
          <div className="file-selected">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">{formatFileSize(selectedFile.size)}</div>
            </div>
            {!uploading && (
              <button 
                className="remove-file-btn"
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
      
      {selectedFile && !uploading && (
        <button 
          className="upload-btn"
          onClick={handleUpload}
          disabled={!recipientId}
        >
          🔒 Encrypt & Send
        </button>
      )}
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">{progress}% Complete</div>
        </div>
      )}
      
      {error && <div className="upload-error">{error}</div>}
      
      {!recipientId && selectedFile && (
        <div className="upload-warning">
          ⚠️ Please select a recipient first
        </div>
      )}
    </div>
  );
}

export default FileUpload;
