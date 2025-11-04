import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('VITE_ENCRYPTION_KEY not configured - client-side encryption is deprecated');
}

/**
 * @deprecated Client-side encryption is insecure and has been moved to server-side.
 * Use the 'manage-cpf' edge function instead for encrypting sensitive data.
 * This function is kept for backward compatibility only.
 */
export const encryptData = (data: string): string => {
  console.warn('⚠️ DEPRECATED: encryptData() - Client-side encryption is insecure. Use edge function instead.');
  if (!ENCRYPTION_KEY) {
    throw new Error('VITE_ENCRYPTION_KEY not configured');
  }
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

/**
 * @deprecated Client-side decryption is insecure and has been moved to server-side.
 * Use the 'manage-cpf' edge function to get masked data instead.
 * This function is kept for backward compatibility only.
 */
export const decryptData = (encryptedData: string): string => {
  console.warn('⚠️ DEPRECATED: decryptData() - Client-side decryption is insecure. Use edge function instead.');
  try {
    if (!ENCRYPTION_KEY) {
      return '';
    }
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    return '';
  }
};

/**
 * Hash function for creating non-reversible hashes (still valid for lookups)
 * This is safe to use as hashing is one-way and cannot be reversed.
 */
export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};
