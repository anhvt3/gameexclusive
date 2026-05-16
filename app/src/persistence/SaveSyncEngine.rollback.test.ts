/**
 * SaveSyncEngine.rollback.test.ts — Phase 5 acceptance §5.16.
 *
 * VITE_BACKEND_ENABLED=false rollback: engine.start() noops, state changes
 * never POST, Phase 4 local-only behavior preserved.
 *
 * Lives in its own file so the stubbed env can be applied before module
 * load with no chance of cross-contamination from BACKEND_ENABLED=true
 * tests (vitest module caching makes them interfere within one file).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SaveSyncEngine (BACKEND_ENABLED=false, Phase 4 rollback)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND_ENABLED', 'false');
    vi.resetModules();
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('§5.16 — start() noops, state changes never POST, info log emitted', async () => {
    const { SaveSyncEngine } = await import('./SaveSyncEngine');
    const { useSaveState } = await import('./SaveStateStore');

    useSaveState.getState().reset();
    useSaveState.getState().setUserId(999600);

    const engine = new SaveSyncEngine();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    engine.start();

    expect(infoSpy).toHaveBeenCalledWith(expect.stringMatching(/sync disabled/));

    // Plenty of state changes + plenty of time — nothing should fire.
    for (let i = 0; i < 10; i++) useSaveState.getState().setHp(40 + i);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTimersAsync();

    expect(global.fetch).not.toHaveBeenCalled();

    engine.stop();
    infoSpy.mockRestore();
  });
});
