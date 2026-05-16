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

// Phase 5: env-driven base + Phase 4 fallback path
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const TELEMETRY_ENDPOINT = `${API_BASE}/api/telemetry`;
const BACKEND_ENABLED = import.meta.env.VITE_BACKEND_ENABLED !== 'false';

// HMAC sign — mirrors api/_lib/auth.ts (server-side verify).
// Em uses existing Phase 3 helpers (deriveKeyFromString, signHex from
// app/src/persistence/hmac.ts) so the secret flow stays consistent.
import { deriveKeyFromString, signHex } from '@/persistence/hmac';
import { useSaveState } from '@/persistence/SaveStateStore';

const SECRET =
  (import.meta.env.VITE_PHASE5_VALIDATION_SECRET as string | undefined) ??
  'phase5-game-ss3-validation-secret-v1';

let cachedKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cachedKey === null) cachedKey = await deriveKeyFromString(SECRET);
  return cachedKey;
}

/**
 * Track a single event. Always logs to console; POSTs to /api/telemetry
 * (Phase 5 Vercel function) with HMAC + nonce. Soft-fail on network error.
 *
 * When VITE_BACKEND_ENABLED=false (Phase 4 fallback), only console.log;
 * skip POST entirely.
 */
export async function track(event: TelemetryEvent): Promise<void> {
  const parsed = TelemetryEventSchema.safeParse(event);
  if (!parsed.success) {
    console.warn('[Telemetry] Invalid event schema:', parsed.error);
    return;
  }
  console.log(`[Telemetry] ${event.event}`, parsed.data);

  if (!BACKEND_ENABLED) return;

  // Add clevaiUserId from SaveState; if not set (anonymous session), skip POST
  const clevaiUserId = useSaveState.getState().clevaiUserId;
  if (clevaiUserId === null || clevaiUserId === undefined) {
    return; // anonymous session — telemetry needs user attribution
  }

  const nonce = useSaveState.getState().clientNonce + 1;
  const bodyObj = { clevaiUserId, ...parsed.data };
  const rawBody = JSON.stringify(bodyObj);
  try {
    const key = await getKey();
    const hmac = await signHex(`${nonce}:${rawBody}`, key);
    useSaveState.getState().bumpClientNonce();
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-nonce': String(nonce),
        'x-hmac': hmac,
      },
      body: rawBody,
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
