// Custom Key Exchange Protocol implementation
import {
  generateEphemeralKeyPair,
  exportPublicKey,
  importECDHPublicKey,
  deriveSharedKey,
  signData,
  verifySignature,
  importPublicKey
} from './crypto';
import { getIdentitySigningKey, getIdentityDHKey, storeSessionKey, getSessionKey } from './storage';
import { logSecurityEvent, EVENT_TYPES } from './securityLogger';

/**
 * Initiator: Start key exchange with recipient
 * Returns keyId and ephemeral public key to send to recipient
 */
export async function initiateKeyExchange(initiatorUserId, recipientUserId, recipientPublicKeyData) {
  // Parse recipient's public keys
  const recipientKeys = JSON.parse(recipientPublicKeyData);
  
  // Generate ephemeral ECDH keypair
  const ephemeralKeyPair = await generateEphemeralKeyPair();
  
  // Export ephemeral public key
  const ephemeralPubJwk = await exportPublicKey(ephemeralKeyPair.publicKey);
  
  // Import recipient's DH public key for ECDH
  const recipientECDHPubKey = await importECDHPublicKey(recipientKeys.dh);
  
  // Derive shared key using ECDH + HKDF
  const context = `${initiatorUserId}||${recipientUserId}||${Date.now()}`;
  const sessionKey = await deriveSharedKey(
    ephemeralKeyPair.privateKey,
    recipientECDHPubKey,
    context
  );
  
  // Generate keyId
  const keyId = generateKeyId();
  
  // Store session key locally
  await storeSessionKey(keyId, recipientUserId, sessionKey, ephemeralPubJwk);
  
  // Sign the header for authenticity using signing key
  const identitySigningKey = await getIdentitySigningKey();
  const headerData = JSON.stringify({
    ephemeralPublicKey: ephemeralPubJwk,
    keyId: keyId,
    timestamp: Date.now(),
    context: context
  });
  
  const signature = await signData(identitySigningKey, headerData);
  
  return {
    keyId,
    ephemeralPublicKey: ephemeralPubJwk,
    signature,
    headerData,
    sessionKey,
    context
  };
}

/**
 * Responder: Complete key exchange
 * Verifies initiator's signature and derives the same session key
 */
export async function completeKeyExchange(
  responderUserId,
  initiatorUserId,
  initiatorPublicKeyData,
  ephemeralPublicKeyJwk,
  headerData,
  signature
) {
  // Parse initiator's public keys
  const initiatorKeys = JSON.parse(initiatorPublicKeyData);
  
  // Validate required fields
  if (!initiatorKeys || !initiatorKeys.signing || !initiatorKeys.dh) {
    throw new Error('Invalid public key format - missing signing or dh keys');
  }
  
  // Verify signature using initiator's signing public key
  const initiatorSigningKey = await importPublicKey(initiatorKeys.signing, 'ECDSA');
  const isValid = await verifySignature(initiatorSigningKey, headerData, signature);
  
  if (!isValid) {
    // Log invalid signature detection
    await logSecurityEvent(
      EVENT_TYPES.INVALID_SIGNATURE,
      `Invalid signature detected from ${initiatorUserId} - potential MITM attack`,
      { initiatorUserId, responderUserId }
    );
    throw new Error('Invalid signature - potential MITM attack!');
    console.warn("MITM Demo: Ignoring invalid signature to show vulnerability");
  }
  
  // Parse header
  const header = JSON.parse(headerData);
  const { keyId, context } = header;
  
  // Import initiator's ephemeral public key
  const initiatorEphemeralPubKey = await importECDHPublicKey(ephemeralPublicKeyJwk);
  
  // Get responder's DH private key for key exchange
  const responderDHKey = await getIdentityDHKey();
  
  // Validate we have a valid private key
  if (!responderDHKey || typeof responderDHKey !== 'object' || !responderDHKey.type) {
    throw new Error('Invalid or missing DH private key - please re-register');
  }
  
  // Derive the same shared key
  const sessionKey = await deriveSharedKey(
    responderDHKey,
    initiatorEphemeralPubKey,
    context
  );
  
  // Store session key
  await storeSessionKey(keyId, initiatorUserId, sessionKey, ephemeralPublicKeyJwk);
  
  return {
    keyId,
    sessionKey
  };
}

/**
 * Retrieve session key for sending/receiving messages
 */
export async function getMessageKey(keyId) {
  return await getSessionKey(keyId);
}

/**
 * Generate unique key ID
 */
function generateKeyId() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
