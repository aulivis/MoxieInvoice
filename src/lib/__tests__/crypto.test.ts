import { describe, it, expect, beforeAll } from 'vitest';

// Must be set before importing the module so getKey() can read it
const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

// Import after env is set
const { encrypt, decrypt } = await import('../crypto');

describe('encrypt / decrypt', () => {
  it('round-trips a simple string', () => {
    const original = 'my-secret-api-key';
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it('round-trips a JSON credentials blob', () => {
    const creds = JSON.stringify({ apiKey: 'abc123', username: 'user' });
    expect(decrypt(encrypt(creds))).toBe(creds);
  });

  it('round-trips an empty string', () => {
    expect(decrypt(encrypt(''))).toBe('');
  });

  it('round-trips unicode content', () => {
    const text = 'Árvíztűrő tükörfúrógép 🔑';
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it('produces ciphertext in iv:authTag:data hex format', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/i); // 16-byte IV = 32 hex chars
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/i); // 16-byte auth tag = 32 hex chars
    expect(parts[2]).toMatch(/^[0-9a-f]+$/i);    // ciphertext
  });

  it('produces different ciphertext each call (random IV)', () => {
    const a = encrypt('same string');
    const b = encrypt('same string');
    expect(a).not.toBe(b);
  });

  it('backward compat: returns plaintext if not in encrypted format', () => {
    expect(decrypt('old-plaintext-key')).toBe('old-plaintext-key');
  });

  it('backward compat: returns plaintext for URL-like strings', () => {
    expect(decrypt('https://api.example.com/key')).toBe('https://api.example.com/key');
  });

  it('throws if ENCRYPTION_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = saved;
  });

  it('throws if ENCRYPTION_KEY is wrong length', () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = saved;
  });
});
