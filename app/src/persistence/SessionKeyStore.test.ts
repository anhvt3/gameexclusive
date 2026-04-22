import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionKey } from './SessionKeyStore';
import { generateSessionKey } from './hmac';

beforeEach(() => {
  useSessionKey.getState().clearKey();
});

describe('SessionKeyStore', () => {
  it('starts with null key', () => {
    expect(useSessionKey.getState().key).toBeNull();
  });

  it('setKey stores the CryptoKey', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    expect(useSessionKey.getState().key).toBe(key);
  });

  it('clearKey resets to null', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    useSessionKey.getState().clearKey();
    expect(useSessionKey.getState().key).toBeNull();
  });

  it('key not persisted to localStorage (memory-only)', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    // Scan localStorage for anything that looks like the session key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const v = localStorage.getItem(k) ?? '';
        expect(v).not.toMatch(/CryptoKey/i);
      }
    }
  });
});
