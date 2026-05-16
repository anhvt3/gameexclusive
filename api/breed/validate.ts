/**
 * api/breed/validate.ts — POST /api/breed/validate (Phase 5).
 *
 * Two actions:
 *   action='start' — INSERT new game_breeding_sessions row with hatch_at
 *                    computed server-side from offspring rarity + duration table.
 *   action='rush'  — UPDATE existing session: SET hatch_at=NOW, rushed_at=NOW
 *                    ONLY if rushed_at IS NULL (single rush per session).
 *
 * Body: { clevaiUserId, action: 'start' | 'rush', ...action-specific }
 * Returns: 200 { ok: true, ... } on success
 *          400/401/403/404/500 with reason on rejection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db.js';
import { verifyHmacRequest } from '../_lib/auth.js';
import { checkAndInsertNonce } from '../_lib/nonce.js';
import { withSentry } from '../_lib/sentry.js';

// Q2 duration table (mirror app/src/domain/BreedingDurations.ts)
const BREEDING_DURATIONS_MS: Record<string, number> = {
  common: 5 * 60_000,
  rare: 15 * 60_000,
  epic: 60 * 60_000,
  legendary: 120 * 60_000,
};

interface StartPayload {
  clevaiUserId: number;
  action: 'start';
  parentA: string;
  parentB: string;
  offspringCodename: string;
  offspringRarity: 'common' | 'rare' | 'epic' | 'legendary';
  offspringLevel: number;
  costBattleStars: number;
}

interface RushPayload {
  clevaiUserId: number;
  action: 'rush';
  sessionId: number;
  rushCost: number;
}

type BreedPayload = StartPayload | RushPayload;

async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const verified = await verifyHmacRequest<BreedPayload>(req.headers, rawBody);
  if ('error' in verified) {
    res.status(verified.status).json({ ok: false, reason: verified.error });
    return;
  }
  const { nonce, body } = verified;

  const fresh = await checkAndInsertNonce(body.clevaiUserId, nonce, '/api/breed/validate');
  if (!fresh) {
    res.status(401).json({ ok: false, reason: 'replay_attempted' });
    return;
  }

  try {
    if (body.action === 'start') {
      const duration = BREEDING_DURATIONS_MS[body.offspringRarity];
      if (!duration) {
        res.status(400).json({ ok: false, reason: 'invalid_rarity' });
        return;
      }
      const startedAt = Date.now();
      const hatchAt = startedAt + duration;
      const result = await query(
        `INSERT INTO game_breeding_sessions
         (clevai_user_id, parent_a_instance_id, parent_b_instance_id,
          started_at, hatch_at, cost_battle_stars,
          offspring_codename, offspring_rarity, offspring_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.clevaiUserId, body.parentA, body.parentB,
          startedAt, hatchAt, body.costBattleStars,
          body.offspringCodename, body.offspringRarity, body.offspringLevel,
        ],
      );
      res.status(200).json({ ok: true, startedAt, hatchAt, sessionId: result.rowCount });
      return;
    }

    if (body.action === 'rush') {
      const now = Date.now();
      // Atomic UPDATE: only succeed if rushed_at IS NULL (single rush)
      const result = await query(
        `UPDATE game_breeding_sessions
         SET hatch_at = ?, rushed_at = ?, rush_cost_paid = ?
         WHERE session_id = ?
           AND clevai_user_id = ?
           AND rushed_at IS NULL`,
        [now, now, body.rushCost, body.sessionId, body.clevaiUserId],
      );
      if (result.rowCount === 0) {
        res.status(403).json({ ok: false, reason: 'already_rushed_or_not_found' });
        return;
      }
      res.status(200).json({ ok: true, newHatchAt: now });
      return;
    }

    res.status(400).json({ ok: false, reason: 'unknown_action' });
  } catch (e) {
    console.error('[breed/validate] error:', e);
    res.status(500).json({ ok: false, reason: 'internal' });
  }
}

export default withSentry(handler);
