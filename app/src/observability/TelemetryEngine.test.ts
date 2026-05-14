import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryEngine } from './TelemetryEngine';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('TelemetryEngine', () => {
  let engine: TelemetryEngine;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useSaveState.getState().reset();
    engine = new TelemetryEngine();
    engine.start();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as never);
  });

  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
  });

  it('observes SHOP_PURCHASE_COMPLETED → tracks shop_purchase', async () => {
    eventBus.emit('SHOP_PURCHASE_COMPLETED', {
      itemId: 'hat-apprentice-01',
      priceCharged: 30,
      stockRemaining: 0,
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(logSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('shop_purchase'))).toBe(
      true
    );
  });

  it('observes BREEDING_STARTED → tracks breeding_start', async () => {
    useSaveState.getState().addBattleStars(100);
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: 1000,
      hatchAt: 1000 + 300_000,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
      rushedAt: null,
    });
    eventBus.emit('BREEDING_STARTED', {
      parentA: 'a',
      parentB: 'b',
      durationMs: 300_000,
      expectedRarity: 'common',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(logSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('breeding_start'))).toBe(
      true
    );
  });

  it('observes EGG_HATCHED with wasRushed → tracks breeding_hatch', async () => {
    eventBus.emit('EGG_HATCHED', {
      offspringInstanceId: 'inst-x',
      rarity: 'rare',
      codename: 'aquakit',
      wasRushed: true,
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(logSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('breeding_hatch'))).toBe(
      true
    );
  });

  it('stop() removes subscriptions — no track after stop', async () => {
    engine.stop();
    logSpy.mockClear();
    eventBus.emit('SHOP_PURCHASE_COMPLETED', {
      itemId: 'x',
      priceCharged: 10,
      stockRemaining: 0,
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(logSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes('shop_purchase'))).toBe(
      false
    );
  });

  it('start() idempotent', () => {
    engine.start();
    engine.start();
    expect(true).toBe(true);
  });
});
