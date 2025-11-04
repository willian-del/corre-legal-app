import CryptoJS from 'crypto-js';

/**
 * Hash function for creating non-reversible hashes (safe for lookups)
 * This is safe to use client-side as hashing is one-way and cannot be reversed.
 */
export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};
