/**
 * SaveSyncEngine.test.ts — Phase 5 acceptance §5.14 (debounce 2000ms).
 *
 * Note: §5.16 (VITE_BACKEND_ENABLED=false rollback) lives in
 * SaveSyncEngine.rollback.test.ts as a separate file because vitest module
 * caching makes the env stub leak between tests in the same file. Splitting
 * gives each acceptance criterion a clean module load.
 *
 * Other behaviors (anonymous session skip, stop() cancel pending) are
 * covered by manual UAT and the end-to-end uat_integration.mjs harness
 * (Vercel preview environment).
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useSaveState } from './SaveStateStore';

describe('SaveSyncEngine — §5.14 debounce 2000ms', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    useSaveState.getState().setUserId(999500);
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, server_updated_at: '2026-05-15T00:00:00.000Z' }),
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('5 rapid state changes within window coalesce into 1 POST', async () => {
    const { SaveSyncEngine } = await import('./SaveSyncEngine');
    const engine = new SaveSyncEngine();
    engine.start();

    // 5 changes over 500ms — each resets the 2000ms debounce timer.
    for (let i = 0; i < 5; i++) {
      useSaveState.getState().setHp(50 + i);
      await vi.advanceTimersByTimeAsync(100);
    }
    // Still inside the debounce window from the last change.
    expect(global.fetch).not.toHaveBeenCalled();

    // Cross the 2000ms threshold + drain microtasks for getKey/signHex/fetch.
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toContain('/api/save/sync');
    expect(call[1].method).toBe('POST');
    // HMAC envelope present (x-nonce + 64-hex x-hmac).
    expect(call[1].headers['x-nonce']).toBeTruthy();
    expect(call[1].headers['x-hmac']).toMatch(/^[a-f0-9]{64}$/);
    engine.stop();
  });
});
