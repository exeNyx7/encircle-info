// Web Crypto API utilities for P-256 ECDH/ECDSA
// All private keys are non-extractable and stored in IndexedDB

/**
 * Generate identity keypairs (separate ECDSA for signing and ECDH for key exchange)
 * Private keys are non-extractable and stored in IndexedDB
 */
export async function generateIdentityKeyPair() {
  // Generate ECDSA keypair for signing
  const signingKeyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    false, // non-extractable private key
    ['sign', 'verify']
  );
  
  // Generate ECDH keypair for key exchange
  const dhKeyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false, // non-extractable private key
    ['deriveKey', 'deriveBits']
  );
  
  return {
    signing: signingKeyPair,
    dh: dhKeyPair
  };
}

/**
 * Generate ephemeral ECDH keypair for key exchange
 */
export async function generateEphemeralKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true, // extractable for export
    ['deriveKey', 'deriveBits']
  );
  
  return keyPair;
}

/**
 * Export public key to JWK format
 */
export async function exportPublicKey(publicKey) {
  const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

/**
 * Import public key from JWK string
 */
export async function importPublicKey(jwkString, algorithm = 'ECDSA') {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: algorithm,
      namedCurve: 'P-256'
    },
    true,
    algorithm === 'ECDSA' ? ['verify'] : []
  );
}

/**
 * Import ECDH public key for key derivation
 */
export async function importECDHPublicKey(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

/**
 * Calculate SHA-256 fingerprint of public key
 */
export async function calculateKeyFingerprint(publicKeyJwk) {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKeyJwk);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign data with ECDSA private key
 */
export async function signData(privateKey, data) {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const signature = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    privateKey,
    encodedData
  );
  
  return arrayBufferToBase64(signature);
}

/**
 * Verify ECDSA signature
 */
export async function verifySignature(publicKey, data, signatureBase64) {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const signature = base64ToArrayBuffer(signatureBase64);
  
  return await window.crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    publicKey,
    signature,
    encodedData
  );
}

/**
 * Perform ECDH and derive AES-256-GCM key using HKDF
 */
export async function deriveSharedKey(privateKey, publicKey, context) {
  // First derive raw bits using ECDH
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey
    },
    privateKey,
    256
  );
  
  // Import shared secret as key material for HKDF
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );
  
  // Derive AES-256-GCM key using HKDF
  const encoder = new TextEncoder();
  const contextData = encoder.encode(context);
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // Use random salt in production
      info: contextData
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
  
  return aesKey;
}

/**
 * Encrypt data with AES-256-GCM
 * Includes timestamp in encrypted payload for replay protection
 */
export async function encryptMessage(key, plaintext) {
  // Create payload with timestamp for replay protection
  const payload = JSON.stringify({
    text: plaintext,
    timestamp: Date.now()
  });
  
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  
  // Generate fresh random 96-bit (12 bytes) IV for every message
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    data
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt data with AES-256-GCM
 * Extracts and validates timestamp from encrypted payload
 */
export async function decryptMessage(key, ciphertextBase64, ivBase64, options = {}) {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  const payloadStr = decoder.decode(plaintext);
  
  // Parse payload to extract text and timestamp
  try {
    const payload = JSON.parse(payloadStr);
    
    // Check if payload has expected structure
    if (payload && typeof payload === 'object' && 'text' in payload && 'timestamp' in payload) {
      // Validate timestamp for replay protection (default: 1 hour max age)
      const maxAge = options.maxAge || 3600000; // 1 hour in milliseconds
      const age = Date.now() - payload.timestamp;
      
      if (age > maxAge) {
        throw new Error('Message timestamp too old - possible replay attack');
      }
      
      if (age < -60000) { // Allow 1 minute clock skew
        throw new Error('Message timestamp is in the future - possible replay attack');
      }
      
      return payload.text;
    }
  } catch (e) {
    // If parsing fails or structure is wrong, might be old format
    // Try to return as-is for backward compatibility
    if (e.message.includes('replay attack')) {
      throw e; // Re-throw replay attack errors
    }
  }
  
  // Fallback for old messages without timestamp (backward compatibility)
  return payloadStr;
}

/**
 * Encrypt file chunk with AES-256-GCM
 */
export async function encryptFileChunk(key, chunk) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    chunk
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt file with AES-256-GCM
 * Extracts and validates timestamp from encrypted payload
 */
export async function decryptFile(key, ciphertextBase64, ivBase64, options = {}) {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    ciphertext
  );

  // Extract timestamp (first 8 bytes) and file data
  const dataView = new DataView(plaintext);
  
  // Check if we have at least 8 bytes for timestamp
  if (plaintext.byteLength >= 8) {
    try {
      const timestamp = Number(dataView.getBigUint64(0, false));
      
      // Validate timestamp for replay protection
      const maxAge = options.maxAge || 3600000; // 1 hour
      const age = Date.now() - timestamp;
      
      if (age > maxAge) {
        throw new Error('File timestamp too old - possible replay attack');
      }
      
      if (age < -60000) { // Allow 1 minute clock skew
        throw new Error('File timestamp is in the future - possible replay attack');
      }
      
      // Return file data without timestamp
      return plaintext.slice(8);
    } catch (e) {
      if (e.message.includes('replay attack')) {
        throw e;
      }
      // If timestamp parsing fails, might be old format
    }
  }
  
  // Fallback: return entire plaintext for backward compatibility
  return plaintext;
}

/**
 * Encrypt file with AES-256-GCM
 * Simplified version: encrypts entire file with timestamp in single operation
 */
export async function encryptFile(key, fileBuffer) {
  // Create payload with file data and timestamp for replay protection
  const fileArray = new Uint8Array(fileBuffer);
  const timestamp = Date.now();
  
  // Create a combined buffer: [timestamp (8 bytes)] + [file data]
  const timestampBuffer = new ArrayBuffer(8);
  const timestampView = new DataView(timestampBuffer);
  timestampView.setBigUint64(0, BigInt(timestamp), false);
  
  // Combine timestamp and file data
  const combined = new Uint8Array(8 + fileArray.length);
  combined.set(new Uint8Array(timestampBuffer), 0);
  combined.set(fileArray, 8);
  
  // Generate fresh random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    combined.buffer
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    chunks: 1
  };
}

/**
 * Decrypt file chunk with AES-256-GCM
 */
export async function decryptFileChunk(key, ciphertextBase64, ivBase64) {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    ciphertext
  );
}

// Utility functions
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
