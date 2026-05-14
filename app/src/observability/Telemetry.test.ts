import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  track,
  trackShopPurchase,
  trackBreedingStart,
  trackBreedingRush,
  trackBreedingHatch,
  TelemetryEventSchema,
} from './Telemetry';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('TelemetryEventSchema', () => {
  it('parses shop_purchase shape', () => {
    const result = TelemetryEventSchema.safeParse({
      event: 'shop_purchase',
      ts: 12345,
      itemId: 'hat-apprentice-01',
      priceCharged: 30,
      battleStarsAfter: 70,
    });
    expect(result.success).toBe(true);
  });

  it('parses breeding_rush shape', () => {
    const result = TelemetryEventSchema.safeParse({
      event: 'breeding_rush',
      ts: 100,
      offspringRarity: 'rare',
      costPaid: 200,
      timeRemainingMs: 50_000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed shape', () => {
    const result = TelemetryEventSchema.safeParse({
      event: 'shop_purchase',
      ts: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid offspringRarity', () => {
    const result = TelemetryEventSchema.safeParse({
      event: 'breeding_rush',
      ts: 100,
      offspringRarity: 'mythical', // not in enum
      costPaid: 200,
      timeRemainingMs: 50_000,
    });
    expect(result.success).toBe(false);
  });
});

describe('track', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as never);
    // Phase 5 — Telemetry now requires clevaiUserId for POST attribution.
    useSaveState.getState().setUserId(1);
  });

  it('logs to console + POSTs to /api/telemetry', async () => {
    await track({
      event: 'shop_purchase',
      ts: 100,
      itemId: 'x',
      priceCharged: 10,
      battleStarsAfter: 90,
    });
    expect(logSpy).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/telemetry',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('soft-fails on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    await expect(
      track({
        event: 'shop_purchase',
        ts: 100,
        itemId: 'x',
        priceCharged: 10,
        battleStarsAfter: 90,
      })
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips invalid event with warn', async () => {
    await track({ event: 'invalid' } as never);
    expect(warnSpy).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('convenience wrappers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as never);
    useSaveState.getState().setUserId(1);
  });

  it('trackShopPurchase shapes the event correctly', async () => {
    await trackShopPurchase({ itemId: 'foo', priceCharged: 25, battleStarsAfter: 100 });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as { body: string };
    const body = JSON.parse(call.body);
    expect(body.event).toBe('shop_purchase');
    expect(body.itemId).toBe('foo');
    expect(typeof body.ts).toBe('number');
  });

  it('trackBreedingStart shapes correctly', async () => {
    await trackBreedingStart({
      parentA: 'a',
      parentB: 'b',
      offspringRarity: 'common',
      costPaid: 50,
      hatchAt: 12345,
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as { body: string };
    const body = JSON.parse(call.body);
    expect(body.event).toBe('breeding_start');
    expect(body.parentA).toBe('a');
  });

  it('trackBreedingRush shapes correctly', async () => {
    await trackBreedingRush({
      offspringRarity: 'rare',
      costPaid: 200,
      timeRemainingMs: 100_000,
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as { body: string };
    const body = JSON.parse(call.body);
    expect(body.event).toBe('breeding_rush');
    expect(body.offspringRarity).toBe('rare');
  });

  it('trackBreedingHatch shapes correctly', async () => {
    await trackBreedingHatch({
      offspringInstanceId: 'inst-x',
      offspringRarity: 'epic',
      wasRushed: true,
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as { body: string };
    const body = JSON.parse(call.body);
    expect(body.event).toBe('breeding_hatch');
    expect(body.wasRushed).toBe(true);
  });
});
