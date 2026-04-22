import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmacStorage } from './HmacStorage';
import { useSessionKey } from './SessionKeyStore';
import { generateSessionKey } from './hmac';

beforeEach(() => {
  localStorage.clear();
  useSessionKey.getState().clearKey();
});

describe('HmacStorage — ephemeral mode (no session key)', () => {
  it('setItem writes plain passthrough', async () => {
    const storage = createHmacStorage(localStorage);
    await storage.setItem('test', 'hello');
    expect(localStorage.getItem('test')).toBe('hello');
  });

  it('getItem reads plain passthrough', async () => {
    localStorage.setItem('test', 'raw-value');
    const storage = createHmacStorage(localStorage);
    expect(await storage.getItem('test')).toBe('raw-value');
  });
});

describe('HmacStorage — signed mode (session key set)', () => {
  it('setItem wraps value with hmac envelope', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    const storage = createHmacStorage(localStorage);
    await storage.setItem('test', '{"a":1}');
    const raw = localStorage.getItem('test')!;
    const env = JSON.parse(raw);
    expect(env).toHaveProperty('data', '{"a":1}');
    expect(env.hmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it('getItem returns unwrapped data if hmac valid', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    const storage = createHmacStorage(localStorage);
    await storage.setItem('test', 'original');
    expect(await storage.getItem('test')).toBe('original');
  });

  it('getItem returns null + clears item if hmac invalid (tamper detected)', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    const storage = createHmacStorage(localStorage);
    await storage.setItem('test', 'original');
    // Tamper: modify data field, keep old hmac
    const raw = JSON.parse(localStorage.getItem('test')!);
    raw.data = 'modified';
    localStorage.setItem('test', JSON.stringify(raw));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await storage.getItem('test')).toBeNull();
    expect(localStorage.getItem('test')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('tamper'));
    warnSpy.mockRestore();
  });

  it('getItem treats legacy v0 (no hmac) as valid + auto-resigns on next write', async () => {
    const key = await generateSessionKey();
    useSessionKey.getState().setKey(key);
    localStorage.setItem('test', 'legacy-plain-string');
    const storage = createHmacStorage(localStorage);
    expect(await storage.getItem('test')).toBe('legacy-plain-string');
  });
});

describe('HmacStorage — removeItem', () => {
  it('removes underlying storage key', async () => {
    localStorage.setItem('test', 'x');
    const storage = createHmacStorage(localStorage);
    await storage.removeItem('test');
    expect(localStorage.getItem('test')).toBeNull();
  });
});
