import { describe, it, expect, beforeAll } from 'vitest';

// Must be set before importing the module so getKey() can read it
const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

// Import after env is set
const { encrypt, decrypt } = await import('../crypto');

describe('encrypt / decrypt', () => {
  it('round-trips a simple string', async () => {
    const original = 'my-secret-api-key';
    expect(await decrypt(await encrypt(original))).toBe(original);
  });

  it('round-trips a JSON credentials blob', async () => {
    const creds = JSON.stringify({ apiKey: 'abc123', username: 'user' });
    expect(await decrypt(await encrypt(creds))).toBe(creds);
  });

  it('round-trips an empty string', async () => {
    expect(await decrypt(await encrypt(''))).toBe('');
  });

  it('round-trips unicode content', async () => {
    const text = 'Árvíztűrő tükörfúrógép 🔑';
    expect(await decrypt(await encrypt(text))).toBe(text);
  });

  it('produces ciphertext in iv:ciphertextWithAuthTag hex format', async () => {
    const encrypted = await encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]{24}$/i);   // 12-byte IV = 24 hex chars
    expect(parts[1]).toMatch(/^[0-9a-f]{32,}$/i); // ciphertext + 16-byte GCM auth tag
  });

  it('produces different ciphertext each call (random IV)', async () => {
    const a = await encrypt('same string');
    const b = await encrypt('same string');
    expect(a).not.toBe(b);
  });

  it('backward compat: returns plaintext if not in encrypted format', async () => {
    expect(await decrypt('old-plaintext-key')).toBe('old-plaintext-key');
  });

  it('backward compat: returns plaintext for URL-like strings', async () => {
    expect(await decrypt('https://api.example.com/key')).toBe('https://api.example.com/key');
  });

  it('throws if ENCRYPTION_KEY is missing', async () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    await expect(encrypt('test')).rejects.toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = saved;
  });

  it('throws if ENCRYPTION_KEY is wrong length', async () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';
    await expect(encrypt('test')).rejects.toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = saved;
  });
});
