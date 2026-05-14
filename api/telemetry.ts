/**
 * api/telemetry.ts — POST /api/telemetry (Phase 5).
 *
 * Insert telemetry event into game_telemetry_events (source of truth) +
 * forward to Amplitude SDK (replica). Soft-fail on Amplitude error.
 *
 * Body: TelemetryEvent (discriminated union from app/src/observability/Telemetry.ts)
 *   { event: 'shop_purchase' | 'breeding_start' | 'breeding_rush' | 'breeding_hatch',
 *     ts: number, ...event-specific fields }
 *
 * The clevaiUserId comes from request body OR auth context (Phase 5 stub: body).
 *
 * Returns: 200 { ok: true } always (telemetry is best-effort, never fails the caller's
 *               action). 400 only on malformed body.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, serializeJsonForInsert } from './_lib/db.js';
import { verifyHmacRequest } from './_lib/auth.js';
import { forwardEvent } from './_lib/amplitude.js';

interface TelemetryBody {
  clevaiUserId: number;
  event: 'shop_purchase' | 'breeding_start' | 'breeding_rush' | 'breeding_hatch';
  ts: number;
  [key: string]: unknown;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const verified = await verifyHmacRequest<TelemetryBody>(req.headers, rawBody);
  if ('error' in verified) {
    // Phase 5: even on auth error, return 200 to keep client telemetry best-effort.
    // The error logged server-side for debugging, but client never knows.
    console.warn('[telemetry] auth failed:', verified.error);
    res.status(200).json({ ok: true, forwarded: false });
    return;
  }
  const { nonce, body } = verified;

  if (!body.clevaiUserId || !body.event || typeof body.ts !== 'number') {
    res.status(400).json({ ok: false, reason: 'missing_fields' });
    return;
  }

  // Strip top-level metadata from payload for the JSON column
  const payloadCopy: Record<string, unknown> = { ...body };
  delete payloadCopy.clevaiUserId;
  delete payloadCopy.event;
  delete payloadCopy.ts;

  // 1. Insert into local table (source of truth)
  let inserted = false;
  try {
    await query(
      `INSERT INTO game_telemetry_events
       (clevai_user_id, event_type, event_ts, payload_json, client_nonce, forwarded_to_amplitude)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.clevaiUserId,
        body.event,
        body.ts,
        serializeJsonForInsert(payloadCopy),
        nonce,
        0,                                                   // forwarded=false initially
      ],
    );
    inserted = true;
  } catch (e) {
    console.error('[telemetry] DB insert failed:', e);
  }

  // 2. Forward to Amplitude (soft-fail; not critical-path)
  let forwarded = false;
  try {
    forwarded = await forwardEvent({
      user_id: String(body.clevaiUserId),
      event_type: body.event,
      event_properties: payloadCopy,
      time: body.ts,
    });
    if (forwarded && inserted) {
      // Best-effort flip of forwarded flag (don't fail response on error)
      await query(
        `UPDATE game_telemetry_events
         SET forwarded_to_amplitude = 1
         WHERE clevai_user_id = ? AND client_nonce = ?`,
        [body.clevaiUserId, nonce],
      ).catch(() => undefined);
    }
  } catch (e) {
    console.warn('[telemetry] Amplitude forward failed:', e);
  }

  res.status(200).json({ ok: true, inserted, forwarded });
}
