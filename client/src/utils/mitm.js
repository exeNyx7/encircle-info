// MITM Attack Demonstration Module
// Educational purpose only - demonstrates vulnerability when public keys are not authenticated

/**
 * MITM Attack Simulator
 * 
 * This module simulates a Man-in-the-Middle attack to demonstrate:
 * 1. How an attacker can intercept key exchange
 * 2. How to detect MITM through fingerprint verification
 * 3. The importance of out-of-band key authentication
 * 
 * ⚠️ WARNING: Only enable in development/testing environments
 */

import {
  generateIdentityKeyPair,
  exportPublicKey,
  importECDHPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  calculateKeyFingerprint
} from './crypto';

// MITM state
let mitmEnabled = false;
let attackerKeyPair = null;
let interceptedSessions = new Map();

/**
 * Enable MITM attack mode (development only)
 */
export async function enableMITMMode() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MITM mode cannot be enabled in production');
  }
  
  console.warn('🚨 MITM ATTACK MODE ENABLED - FOR EDUCATIONAL PURPOSES ONLY');
  
  // Generate attacker's keypair
  attackerKeyPair = await generateIdentityKeyPair();
  mitmEnabled = true;
  
  return {
    enabled: true,
    attackerPublicKey: await exportPublicKey(attackerKeyPair.publicKey),
    attackerFingerprint: await calculateKeyFingerprint(
      await exportPublicKey(attackerKeyPair.publicKey)
    )
  };
}

/**
 * Disable MITM mode
 */
export function disableMITMMode() {
  mitmEnabled = false;
  attackerKeyPair = null;
  interceptedSessions.clear();
  console.log('✅ MITM mode disabled');
}

/**
 * Check if MITM is active
 */
export function isMITMActive() {
  return mitmEnabled;
}

/**
 * Intercept public key request (server-side simulation)
 * Returns attacker's public key instead of real recipient's key
 */
export async function interceptPublicKey(realPublicKey, recipientId) {
  if (!mitmEnabled || !attackerKeyPair) {
    return realPublicKey;
  }
  
  console.warn(`🔴 MITM: Intercepting public key for user ${recipientId}`);
  console.warn('🔴 MITM: Returning attacker\'s public key instead of real key');
  
  // Store the real public key for later relay
  interceptedSessions.set(recipientId, {
    realPublicKey,
    attackerKeyPair
  });
  
  // Return attacker's public key
  return await exportPublicKey(attackerKeyPair.publicKey);
}

/**
 * Intercept and decrypt message (MITM relay)
 * Decrypts with attacker's key, then re-encrypts with recipient's real key
 */
export async function interceptMessage(encryptedMessage, senderId, recipientId) {
  if (!mitmEnabled) {
    return encryptedMessage;
  }
  
  const session = interceptedSessions.get(recipientId);
  if (!session) {
    return encryptedMessage;
  }
  
  console.warn(`🔴 MITM: Intercepting message from ${senderId} to ${recipientId}`);
  
  try {
    // Step 1: Decrypt message using attacker's key
    const senderEphemeralPub = await importECDHPublicKey(encryptedMessage.ephemeralPublicKey);
    const attackerPrivKey = attackerKeyPair.privateKey;
    
    const context = encryptedMessage.context || '';
    const sessionKeyToAttacker = await deriveSharedKey(
      attackerPrivKey,
      senderEphemeralPub,
      context
    );
    
    const plaintext = await decryptMessage(
      sessionKeyToAttacker,
      encryptedMessage.ciphertext,
      encryptedMessage.iv
    );
    
    console.warn(`🔴 MITM: Decrypted message: "${plaintext}"`);
    console.warn('🔴 MITM: Attacker can read, modify, or block message');
    
    // Step 2: Re-encrypt with recipient's real public key
    const recipientPubKey = await importECDHPublicKey(session.realPublicKey);
    const sessionKeyToRecipient = await deriveSharedKey(
      attackerPrivKey,
      recipientPubKey,
      context
    );
    
    const reEncrypted = await encryptMessage(sessionKeyToRecipient, plaintext);
    
    console.warn('🔴 MITM: Re-encrypted and relaying to real recipient');
    
    return {
      ...encryptedMessage,
      ciphertext: reEncrypted.ciphertext,
      iv: reEncrypted.iv,
      mitmIntercepted: true // Flag for demo UI
    };
  } catch (err) {
    console.error('MITM interception failed:', err);
    return encryptedMessage;
  }
}

/**
 * Detect potential MITM attack by comparing fingerprints
 */
export async function detectMITM(expectedFingerprint, actualPublicKey) {
  const actualFingerprint = await calculateKeyFingerprint(actualPublicKey);
  
  if (expectedFingerprint !== actualFingerprint) {
    return {
      detected: true,
      warning: '⚠️ KEY FINGERPRINT MISMATCH - POTENTIAL MITM ATTACK!',
      expected: expectedFingerprint,
      actual: actualFingerprint,
      recommendation: 'Verify fingerprint with recipient through another channel (phone, in-person)'
    };
  }
  
  return {
    detected: false,
    status: 'Key fingerprint verified - secure connection'
  };
}

/**
 * Get MITM attack logs for demonstration
 */
export function getMITMLog() {
  return {
    active: mitmEnabled,
    interceptedSessions: interceptedSessions.size,
    attackerFingerprint: attackerKeyPair ? 'Available' : 'None',
    warning: mitmEnabled ? 'MITM MODE ACTIVE - ALL KEYS COMPROMISED' : 'Normal operation'
  };
}

/**
 * Simulate out-of-band fingerprint verification
 * In real scenario, users would verify via phone call, QR code, etc.
 */
export function verifyFingerprintOutOfBand(userAFingerprint, userBFingerprint) {
  console.log('📞 Out-of-band verification simulation:');
  console.log(`User A fingerprint: ${userAFingerprint}`);
  console.log(`User B fingerprint: ${userBFingerprint}`);
  
  if (userAFingerprint === userBFingerprint) {
    console.log('✅ Fingerprints match - secure connection verified');
    return true;
  } else {
    console.error('❌ FINGERPRINTS DO NOT MATCH - MITM DETECTED!');
    return false;
  }
}

/**
 * Educational demonstration flow
 */
export async function demonstrateMITMAttack() {
  console.log('=== MITM ATTACK DEMONSTRATION ===');
  console.log('');
  console.log('Scenario: Alice wants to message Bob, but Eve is intercepting');
  console.log('');
  
  // Step 1: Enable MITM
  console.log('Step 1: Eve (attacker) positions herself between Alice and Bob');
  const mitm = await enableMITMMode();
  console.log(`Eve's fingerprint: ${mitm.attackerFingerprint.substring(0, 16)}...`);
  console.log('');
  
  // Step 2: Show interception
  console.log('Step 2: Alice requests Bob\'s public key from server');
  console.log('Normal: Server returns Bob\'s real public key');
  console.log('MITM: Server (controlled by Eve) returns Eve\'s public key');
  console.log('Alice thinks she\'s using Bob\'s key, but it\'s Eve\'s!');
  console.log('');
  
  // Step 3: Show decryption
  console.log('Step 3: Alice sends encrypted message');
  console.log('Normal: Only Bob can decrypt (has matching private key)');
  console.log('MITM: Eve decrypts, reads, optionally modifies, then re-encrypts to Bob');
  console.log('');
  
  // Step 4: Detection
  console.log('Step 4: How to detect MITM?');
  console.log('✅ Compare key fingerprints out-of-band (phone call, in-person)');
  console.log('✅ Use key pinning (alert on key change)');
  console.log('✅ Implement certificate authority or web-of-trust');
  console.log('');
  
  console.log('=== END DEMONSTRATION ===');
  disableMITMMode();
}
