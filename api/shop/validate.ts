/**
 * api/shop/validate.ts — POST /api/shop/validate (Phase 5).
 *
 * Validates a shop purchase request server-side:
 *   1. HMAC + nonce check
 *   2. Read user's current battleStars from game_players
 *   3. Reject if battleStars < priceCharged
 *   4. Log every attempt (success OR rejection) to game_shop_validation_log
 *
 * Body: { clevaiUserId, itemId, priceCharged }
 * Returns: 200 { ok: true } on validation success
 *          400/401/500 with reason on rejection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db.js';
import { verifyHmacRequest } from '../_lib/auth.js';
import { checkAndInsertNonce } from '../_lib/nonce.js';
import { withSentry } from '../_lib/sentry.js';

interface ShopPayload {
  clevaiUserId: number;
  itemId: string;
  priceCharged: number;
}

async function logAttempt(
  clevaiUserId: number,
  itemId: string,
  priceCharged: number,
  starsBefore: number,
  starsAfter: number,
  nonce: number,
  hmacVerified: boolean,
  rejected: boolean,
  rejectionReason: string | null,
): Promise<void> {
  try {
    await query(
      `INSERT INTO game_shop_validation_log
       (clevai_user_id, item_id, price_charged, battle_stars_before, battle_stars_after,
        client_nonce, hmac_verified, rejected, rejection_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clevaiUserId, itemId, priceCharged, starsBefore, starsAfter,
        nonce, hmacVerified ? 1 : 0, rejected ? 1 : 0, rejectionReason,
      ],
    );
  } catch (e) {
    console.error('[shop/validate] audit log INSERT failed:', e);
  }
}

async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const verified = await verifyHmacRequest<ShopPayload>(req.headers, rawBody);
  if ('error' in verified) {
    res.status(verified.status).json({ ok: false, reason: verified.error });
    return;
  }
  const { nonce, body } = verified;

  if (!body.clevaiUserId || !body.itemId || typeof body.priceCharged !== 'number') {
    res.status(400).json({ ok: false, reason: 'missing_fields' });
    return;
  }

  const fresh = await checkAndInsertNonce(body.clevaiUserId, nonce, '/api/shop/validate');
  if (!fresh) {
    await logAttempt(body.clevaiUserId, body.itemId, body.priceCharged, 0, 0, nonce, true, true, 'replay_attempted');
    res.status(401).json({ ok: false, reason: 'replay_attempted' });
    return;
  }

  try {
    const result = await query<{ battle_stars: number }>(
      `SELECT battle_stars FROM game_players WHERE clevai_user_id = ?`,
      [body.clevaiUserId],
    );
    if (result.rows.length === 0) {
      await logAttempt(body.clevaiUserId, body.itemId, body.priceCharged, 0, 0, nonce, true, true, 'no_player_record');
      res.status(404).json({ ok: false, reason: 'no_player_record' });
      return;
    }
    const starsBefore = Number(result.rows[0]!.battle_stars);
    if (starsBefore < body.priceCharged) {
      await logAttempt(body.clevaiUserId, body.itemId, body.priceCharged, starsBefore, starsBefore, nonce, true, true, 'insufficient_stars');
      res.status(403).json({ ok: false, reason: 'insufficient_stars' });
      return;
    }
    const starsAfter = starsBefore - body.priceCharged;
    await logAttempt(body.clevaiUserId, body.itemId, body.priceCharged, starsBefore, starsAfter, nonce, true, false, null);
    res.status(200).json({ ok: true, serverNonce: nonce, starsAfter });
  } catch (e) {
    console.error('[shop/validate] error:', e);
    res.status(500).json({ ok: false, reason: 'internal' });
  }
}

export default withSentry(handler);
