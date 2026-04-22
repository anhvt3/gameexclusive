import { describe, it, expect } from 'vitest';
import { generateSessionKey, signHex, verifyHex, deriveKeyFromString } from './hmac';

describe('hmac — Web Crypto SHA-256', () => {
  it('sign + verify roundtrip', async () => {
    const key = await generateSessionKey();
    const data = '{"hp":100,"level":5}';
    const sig = await signHex(data, key);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyHex(data, sig, key)).toBe(true);
  });

  it('tamper detection — modified data fails verify', async () => {
    const key = await generateSessionKey();
    const data = '{"hp":100}';
    const sig = await signHex(data, key);
    const tampered = '{"hp":9999}';
    expect(await verifyHex(tampered, sig, key)).toBe(false);
  });

  it('different key fails verify', async () => {
    const key1 = await generateSessionKey();
    const key2 = await generateSessionKey();
    const data = 'secret';
    const sig = await signHex(data, key1);
    expect(await verifyHex(data, sig, key2)).toBe(false);
  });

  it('deriveKeyFromString produces stable key (same input → same sig)', async () => {
    const key1 = await deriveKeyFromString('my-session-token-xyz');
    const key2 = await deriveKeyFromString('my-session-token-xyz');
    const data = 'hello';
    const sig1 = await signHex(data, key1);
    const sig2 = await signHex(data, key2);
    expect(sig1).toBe(sig2);
  });

  it('deriveKeyFromString different input → different sig', async () => {
    const key1 = await deriveKeyFromString('token-a');
    const key2 = await deriveKeyFromString('token-b');
    const data = 'hello';
    const sig1 = await signHex(data, key1);
    const sig2 = await signHex(data, key2);
    expect(sig1).not.toBe(sig2);
  });

  it('malformed hex signature → verify returns false (not throws)', async () => {
    const key = await generateSessionKey();
    expect(await verifyHex('data', 'not-hex', key)).toBe(false);
    expect(await verifyHex('data', '', key)).toBe(false);
  });
});
