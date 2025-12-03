import { useState, useCallback } from 'react';
import { initiateKeyExchange, completeKeyExchange, getMessageKey } from '../utils/keyExchange';
import { getUserPublicKey } from '../utils/api';

/**
 * Custom React Hook for Key Exchange Protocol
 * 
 * Flow:
 * 1. Initiator (Alice) generates ephemeral ECDH keypair
 * 2. Alice derives shared secret using her ephemeral private key and Bob's DH public key
 * 3. Alice signs the exchange parameters (ephemeral public key, keyId, context) with her ECDSA signing key
 * 4. Bob receives: ephemeralPublicKey, signature, headerData
 * 5. Bob verifies Alice's signature using her ECDSA public key (prevents MITM)
 * 6. Bob derives the same shared secret using his DH private key and Alice's ephemeral public key
 * 7. Both parties now have the same session key without it ever being transmitted
 * 
 * Security Features:
 * - Forward Secrecy: Ephemeral keys are generated per exchange and discarded
 * - Authentication: Digital signatures prevent impersonation
 * - MITM Prevention: Signature verification ensures the ephemeral key came from legitimate sender
 * - Context Binding: KDF includes user IDs and timestamp to prevent cross-session attacks
 */
export function useKeyExchange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [keyExchangeData, setKeyExchangeData] = useState(null);

  /**
   * Initiate key exchange as sender (Alice)
   * Generates ephemeral keypair, derives session key, and creates signed exchange data
   */
  const initiate = useCallback(async (senderUserId, recipientUserId) => {
    setLoading(true);
    setError(null);

    try {
      // Get recipient's public keys from server
      const recipientData = await getUserPublicKey(recipientUserId);

      if (!recipientData || !recipientData.publicKey) {
        throw new Error('Recipient public key not found');
      }

      // Perform key exchange
      const exchangeData = await initiateKeyExchange(
        senderUserId,
        recipientUserId,
        recipientData.publicKey
      );

      setKeyExchangeData(exchangeData);
      return exchangeData;

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Complete key exchange as recipient (Bob)
   * Verifies signature and derives the same session key
   */
  const complete = useCallback(async (
    recipientUserId,
    senderUserId,
    ephemeralPublicKey,
    headerData,
    signature
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Get sender's public keys from server
      const senderData = await getUserPublicKey(senderUserId);

      if (!senderData || !senderData.publicKey) {
        throw new Error('Sender public key not found');
      }

      // Verify signature and derive session key
      const exchangeResult = await completeKeyExchange(
        recipientUserId,
        senderUserId,
        senderData.publicKey,
        ephemeralPublicKey,
        headerData,
        signature
      );

      setKeyExchangeData(exchangeResult);
      return exchangeResult;

    } catch (err) {
      // Signature verification failure indicates potential MITM attack
      if (err.message.includes('Invalid signature')) {
        setError('⚠️ SECURITY ALERT: Signature verification failed - potential MITM attack detected!');
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Retrieve stored session key by keyId
   */
  const retrieveKey = useCallback(async (keyId) => {
    setLoading(true);
    setError(null);

    try {
      const sessionKey = await getMessageKey(keyId);
      
      if (!sessionKey) {
        throw new Error('Session key not found');
      }

      return sessionKey;

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setKeyExchangeData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    // State
    loading,
    error,
    keyExchangeData,
    
    // Methods
    initiate,      // Sender initiates key exchange
    complete,      // Recipient completes key exchange
    retrieveKey,   // Retrieve existing session key
    reset          // Clear state
  };
}

export default useKeyExchange;
