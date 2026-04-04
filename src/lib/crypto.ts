/**
 * Secure encryption utilities for sensitive data storage
 * Uses AES-GCM (Galois/Counter Mode) for authenticated encryption
 * Edge Runtime compatible - uses Web Crypto API
 */

/**
 * Derive a key from the environment secret using HKDF
 */
async function deriveKey(): Promise<CryptoKey> {
  const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || process.env.AUTH_SECRET;
  
  if (!ENCRYPTION_SECRET) {
    throw new Error('ENCRYPTION_SECRET or AUTH_SECRET environment variable is required for encryption');
  }
  
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = encoder.encode('edu-platform-encryption-salt');
  
  return await globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded string containing iv:ciphertext:tag format for compatibility
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await deriveKey();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    
    // WebCrypto AES-GCM appends the 16-byte auth tag to the ciphertext automatically
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(plaintext)
    );
    
    const combinedArray = new Uint8Array(encrypted);
    const ciphertextBytes = combinedArray.slice(0, combinedArray.length - 16);
    const tagBytes = combinedArray.slice(combinedArray.length - 16);
    
    // Combine iv:ciphertext:tag for storage (Node.js style backward compatibility)
    return `${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertextBytes.buffer)}:${bufferToBase64(tagBytes.buffer)}`;
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt an encrypted string
 * Expects base64-encoded string in format iv:ciphertext:tag
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await deriveKey();
    const parts = encryptedData.split(':');
    
    // Default to iv:ciphertext:tag (Legacy Node.js format & our new generation format)
    if (parts.length !== 3) {
       throw new Error('Invalid encrypted data format');
    }

    const ivBase64 = parts[0];
    const ctBytes = new Uint8Array(base64ToBuffer(parts[1]));
    const tagBytes = new Uint8Array(base64ToBuffer(parts[2]));
    
    // WebCrypto requires the tag concatenated to the ciphertext buffer
    const combined = new Uint8Array(ctBytes.length + tagBytes.length);
    combined.set(ctBytes, 0);
    combined.set(tagBytes, ctBytes.length);
    
    const iv = base64ToBuffer(ivBase64);
    
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      combined.buffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Check if a string appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  return typeof data === 'string' && data.split(':').length === 3;
}

/**
 * Safe encryption wrapper that handles null/undefined values
 */
export async function safeEncrypt(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  try {
    return await encrypt(value);
  } catch (error) {
    console.warn('[Crypto] Safe encryption failed, returning null');
    return null;
  }
}

/**
 * Safe decryption wrapper that handles encrypted or plaintext values
 */
export async function safeDecrypt(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  
  try {
    if (isEncrypted(value)) {
      return await decrypt(value);
    }
    return value;
  } catch (error) {
    console.warn('[Crypto] Safe decryption failed, returning plaintext');
    return value;
  }
}