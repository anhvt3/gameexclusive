import { z } from 'zod';

/**
 * Phase 4 — Telemetry typed events (Zod-validated, Phase 3 scope only).
 *
 * Transport: dual — console.log structured JSON + POST /api/telemetry.
 * Console for dev debugging; POST is mock endpoint ready for Phase 5
 * backend swap (Mixpanel/Amplitude/Segment) by changing TELEMETRY_ENDPOINT.
 */

export const ShopPurchaseEventSchema = z.object({
  event: z.literal('shop_purchase'),
  ts: z.number(),
  itemId: z.string(),
  priceCharged: z.number(),
  battleStarsAfter: z.number(),
});

export const BreedingStartEventSchema = z.object({
  event: z.literal('breeding_start'),
  ts: z.number(),
  parentA: z.string(),
  parentB: z.string(),
  offspringRarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  costPaid: z.number(),
  hatchAt: z.number(),
});

export const BreedingRushEventSchema = z.object({
  event: z.literal('breeding_rush'),
  ts: z.number(),
  offspringRarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  costPaid: z.number(),
  timeRemainingMs: z.number(),
});

export const BreedingHatchEventSchema = z.object({
  event: z.literal('breeding_hatch'),
  ts: z.number(),
  offspringInstanceId: z.string(),
  offspringRarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  wasRushed: z.boolean(),
});

export const TelemetryEventSchema = z.discriminatedUnion('event', [
  ShopPurchaseEventSchema,
  BreedingStartEventSchema,
  BreedingRushEventSchema,
  BreedingHatchEventSchema,
]);

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

const TELEMETRY_ENDPOINT = '/api/telemetry';

/**
 * Track a single event. Always logs to console; also POSTs to mock
 * endpoint. Soft-fail on network error (never throws).
 */
export async function track(event: TelemetryEvent): Promise<void> {
  const parsed = TelemetryEventSchema.safeParse(event);
  if (!parsed.success) {
    console.warn('[Telemetry] Invalid event schema:', parsed.error);
    return;
  }
  console.log(`[Telemetry] ${event.event}`, parsed.data);
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    console.warn('[Telemetry] POST failed (soft-fail):', err);
  }
}

export async function trackShopPurchase(
  p: Omit<z.infer<typeof ShopPurchaseEventSchema>, 'event' | 'ts'>
): Promise<void> {
  return track({ event: 'shop_purchase', ts: Date.now(), ...p });
}

export async function trackBreedingStart(
  p: Omit<z.infer<typeof BreedingStartEventSchema>, 'event' | 'ts'>
): Promise<void> {
  return track({ event: 'breeding_start', ts: Date.now(), ...p });
}

export async function trackBreedingRush(
  p: Omit<z.infer<typeof BreedingRushEventSchema>, 'event' | 'ts'>
): Promise<void> {
  return track({ event: 'breeding_rush', ts: Date.now(), ...p });
}

export async function trackBreedingHatch(
  p: Omit<z.infer<typeof BreedingHatchEventSchema>, 'event' | 'ts'>
): Promise<void> {
  return track({ event: 'breeding_hatch', ts: Date.now(), ...p });
}
