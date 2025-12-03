// IndexedDB wrapper for secure key storage
// Private keys are stored as non-extractable CryptoKey objects

const DB_NAME = 'EncircleDB';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';
const SESSIONS_STORE = 'sessions';

let db = null;

/**
 * Initialize IndexedDB
 */
export async function initDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for identity keys
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        const keysStore = db.createObjectStore(KEYS_STORE, { keyPath: 'id' });
        keysStore.createIndex('type', 'type', { unique: false });
      }
      
      // Store for session keys
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'keyId' });
        sessionsStore.createIndex('recipientId', 'recipientId', { unique: false });
      }
    };
  });
}

/**
 * Store identity keypair
 */
export async function storeIdentityKeyPair(keyPairs, userId) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    
    const keyData = {
      id: 'identity',
      type: 'identity',
      userId: userId,
      signingPrivateKey: keyPairs.signing.privateKey,
      signingPublicKey: keyPairs.signing.publicKey,
      dhPrivateKey: keyPairs.dh.privateKey,
      dhPublicKey: keyPairs.dh.publicKey,
      createdAt: new Date().toISOString()
    };
    
    const request = store.put(keyData);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get identity signing private key (for ECDSA signatures)
 */
export async function getIdentitySigningKey() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get('identity');
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.signingPrivateKey);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get identity DH private key (for ECDH key exchange)
 */
export async function getIdentityDHKey() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get('identity');
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.dhPrivateKey);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get identity private key (deprecated - use getIdentitySigningKey or getIdentityDHKey)
 */
export async function getIdentityPrivateKey() {
  return await getIdentitySigningKey();
}

/**
 * Get identity public key (signing public key for verification)
 */
export async function getIdentityPublicKey() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get('identity');
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.signingPublicKey);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get identity DH public key
 */
export async function getIdentityDHPublicKey() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get('identity');
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.dhPublicKey);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store session key for a conversation
 */
export async function storeSessionKey(keyId, recipientId, key, ephemeralPublicKey) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    
    const sessionData = {
      keyId: keyId,
      recipientId: recipientId,
      key: key,
      ephemeralPublicKey: ephemeralPublicKey,
      createdAt: new Date().toISOString()
    };
    
    const request = store.put(sessionData);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get session key by keyId
 */
export async function getSessionKey(keyId) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.get(keyId);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.key);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all stored keys (logout)
 */
export async function clearAllKeys() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE, SESSIONS_STORE], 'readwrite');
    
    const keysStore = transaction.objectStore(KEYS_STORE);
    const sessionsStore = transaction.objectStore(SESSIONS_STORE);
    
    keysStore.clear();
    sessionsStore.clear();
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Check if identity keys exist
 */
export async function hasIdentityKeys() {
  const signingKey = await getIdentitySigningKey();
  return signingKey !== null;
}

/**
 * Validate that identity keys have the correct dual-keypair structure
 */
export async function validateIdentityKeys() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get('identity');
    
    request.onsuccess = () => {
      if (!request.result) {
        resolve({ valid: false, reason: 'No keys found' });
        return;
      }
      
      const keys = request.result;
      
      // Check for dual keypair structure
      const hasSigningKeys = keys.signingPrivateKey && keys.signingPublicKey;
      const hasDHKeys = keys.dhPrivateKey && keys.dhPublicKey;
      
      if (!hasSigningKeys || !hasDHKeys) {
        resolve({ 
          valid: false, 
          reason: 'Old key format detected. Please re-register for security upgrade.',
          hasSigningKeys,
          hasDHKeys
        });
        return;
      }
      
      // Validate keys are CryptoKey objects
      const signingKeyValid = keys.signingPrivateKey?.type === 'private';
      const dhKeyValid = keys.dhPrivateKey?.type === 'private';
      
      if (!signingKeyValid || !dhKeyValid) {
        resolve({
          valid: false,
          reason: 'Invalid key types. Please re-register.',
          signingKeyValid,
          dhKeyValid
        });
        return;
      }
      
      resolve({ valid: true });
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get next sequence number for a conversation
 */
export async function getNextSequenceNumber(recipientId) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    const seqKey = `seq_${recipientId}`;
    const request = store.get(seqKey);
    
    request.onsuccess = () => {
      const currentSeq = request.result?.sequenceNumber || 0;
      const nextSeq = currentSeq + 1;
      
      // Store updated sequence number
      store.put({ keyId: seqKey, sequenceNumber: nextSeq });
      resolve(nextSeq);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Validate and update sequence number for received message
 * Returns true if valid, false if replay detected
 */
export async function validateSequenceNumber(senderId, receivedSeq) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    const seqKey = `recv_seq_${senderId}`;
    const request = store.get(seqKey);
    
    request.onsuccess = () => {
      const lastSeq = request.result?.sequenceNumber || 0;
      
      // Check if received sequence is greater than last seen
      if (receivedSeq <= lastSeq) {
        console.warn(`Replay attack detected! Received seq ${receivedSeq}, expected > ${lastSeq}`);
        resolve(false);
      } else {
        // Update last seen sequence number
        store.put({ keyId: seqKey, sequenceNumber: receivedSeq });
        resolve(true);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
