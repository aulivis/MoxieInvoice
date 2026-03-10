/**
 * AES-256-GCM encryption using the Web Crypto API (globalThis.crypto.subtle).
 * No Node.js streams — compatible with all Next.js runtimes (Node.js + Edge).
 *
 * ENCRYPTION_KEY: 64-character hex string (32 bytes).
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format: "<iv_24hex>:<ciphertextWithAuthTag_hex>"
 * Backward compat: values not matching the pattern are returned as-is (plaintext legacy data).
 */

const IV_BYTES = 12; // 96 bits — NIST recommended for AES-GCM

// 24 hex = 12-byte IV, followed by ≥32 hex (ciphertext + 16-byte GCM auth tag embedded)
const ENCRYPTED_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32,}$/i;

function getKeyHex(): string {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function importKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    hexToBytes(getKeyHex()) as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return `${bytesToHex(iv)}:${bytesToHex(ciphertext)}`;
}

export async function decrypt(ciphertext: string): Promise<string> {
  // Backward compat: return unencrypted (legacy plaintext) values unchanged
  if (!ENCRYPTED_PATTERN.test(ciphertext)) return ciphertext;
  const key = await importKey();
  const [ivHex, dataHex] = ciphertext.split(':');
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(ivHex) as BufferSource },
    key,
    hexToBytes(dataHex) as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}
