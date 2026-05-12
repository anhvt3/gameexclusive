import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateAction } from './ServerValidator';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('validateAction', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    vi.restoreAllMocks();
  });

  it('bumps clientNonce regardless of response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
    await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(useSaveState.getState().clientNonce).toBe(1);
  });

  it('returns ok:true on 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, serverNonce: 1 }),
    } as never);
    const result = await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(result.ok).toBe(true);
  });

  it('returns ok:false with http_<status> reason on non-200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as never);
    const result = await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('http_401');
  });

  it('soft-fails on network error with warn', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('fetch_failed_soft_allow');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('signs request with x-nonce + x-hmac headers', async () => {
    let captured: { headers?: Record<string, string> } = {};
    global.fetch = vi
      .fn()
      .mockImplementation((_url, opts: { headers?: Record<string, string> }) => {
        captured = opts;
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) } as never);
      });
    await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(captured.headers?.['x-nonce']).toBe('1');
    expect(captured.headers?.['x-hmac']).toBeTruthy();
    expect(captured.headers?.['x-hmac']!.length).toBeGreaterThan(20);
  });

  it('breed endpoint works same as shop', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
    const result = await validateAction('/api/breed/validate', {
      parentA: 'a',
      parentB: 'b',
      cost: 50,
    });
    expect(result.ok).toBe(true);
  });
});
