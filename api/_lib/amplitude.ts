/**
 * api/_lib/amplitude.ts — Server-side Amplitude SDK (Phase 5).
 *
 * Per Q5-5 decision: API key stays server-side. Frontend POSTs to
 * /api/telemetry which forwards to Amplitude here. Local game_telemetry_events
 * table is source of truth; Amplitude is replica.
 *
 * Soft-fail policy: if Amplitude SDK throws or quota exceeded, we log to
 * console + return false. Caller's caller (api/telemetry.ts) leaves
 * `forwarded_to_amplitude=FALSE` so Phase 6 batch-retry can recover.
 */

// @amplitude/analytics-node returns the client instance via createInstance().
// Type the cache loosely to avoid coupling to the SDK's internal type names
// (which differ between SDK minor versions).
type AmplitudeNodeClient = {
  init(apiKey: string, options?: Record<string, unknown>): { promise: Promise<unknown> };
  track(event: Record<string, unknown>): { promise: Promise<{ code: number }> };
};

let cachedClient: AmplitudeNodeClient | null = null;

async function getClient(): Promise<AmplitudeNodeClient | null> {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.warn('[amplitude] AMPLITUDE_API_KEY not set — telemetry forwarding disabled');
    return null;
  }
  const amp = await import('@amplitude/analytics-node');
  cachedClient = amp.createInstance() as unknown as AmplitudeNodeClient;
  await cachedClient.init(apiKey, {
    // Server-side SDK options
    flushQueueSize: 1,        // Small queue — flush every event (low volume)
    flushIntervalMillis: 1000,
  }).promise;
  return cachedClient;
}

export interface AmplitudeEvent {
  user_id: string;
  event_type: 'shop_purchase' | 'breeding_start' | 'breeding_rush' | 'breeding_hatch';
  event_properties: Record<string, unknown>;
  time?: number;
}

/**
 * Forward an event to Amplitude. Returns true on success, false on soft-fail.
 */
export async function forwardEvent(event: AmplitudeEvent): Promise<boolean> {
  try {
    const client = await getClient();
    if (!client) return false;
    const result = await client.track({
      user_id: event.user_id,
      event_type: event.event_type,
      event_properties: event.event_properties,
      time: event.time ?? Date.now(),
    }).promise;
    return result.code === 200;
  } catch (e) {
    console.warn('[amplitude] forward failed (soft-fail):', e);
    return false;
  }
}
