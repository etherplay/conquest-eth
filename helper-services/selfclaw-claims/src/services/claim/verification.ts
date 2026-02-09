/**
 * Ed25519 Signature Verification Service
 *
 * Uses Web Crypto API for Ed25519 signature verification
 */

/**
 * Convert a base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert a hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Build the message that should be signed for a claim request
 *
 * @param timestamp - Current timestamp in milliseconds
 * @param walletAddress - Wallet address to receive tokens
 * @returns The message string to sign
 */
export function buildClaimMessage(
  timestamp: number,
  walletAddress: string,
): string {
  return `claim:${timestamp}:${walletAddress.toLowerCase()}`;
}

/**
 * Verify an Ed25519 signature using Web Crypto API
 *
 * @param publicKey - Public key in SPKI DER format (base64)
 * @param signature - Signature (hex-encoded)
 * @param message - The original message that was signed
 * @returns true if signature is valid, false otherwise
 */
export async function verifySignature(
  publicKey: string,
  signature: string,
  message: string,
): Promise<boolean> {
  try {
    const publicKeyBuffer = base64ToArrayBuffer(publicKey);
    const signatureBuffer = hexToArrayBuffer(signature);
    const messageBuffer = new TextEncoder().encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      signatureBuffer,
      messageBuffer,
    );
  } catch {
    return false;
  }
}

/**
 * Validate timestamp is within acceptable range
 *
 * @param timestamp - Timestamp from request (milliseconds)
 * @param toleranceMs - Allowed tolerance in milliseconds (default: 5000)
 * @returns true if timestamp is valid, false otherwise
 */
export function validateTimestamp(
  timestamp: number,
  toleranceMs: number = 5000,
): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= toleranceMs;
}

/**
 * Validate a wallet address format
 *
 * @param address - Wallet address to validate
 * @returns true if address is valid Ethereum format
 */
export function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
