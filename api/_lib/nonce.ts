/**
 * api/_lib/nonce.ts — Replay protection (Phase 5).
 *
 * Atomically inserts (clevai_user_id, client_nonce, endpoint) into
 * game_nonces. Returns true if inserted (new nonce), false if duplicate
 * (replay detected). Uses INSERT...ON CONFLICT/IGNORE for atomicity.
 *
 * Cron job purges rows older than 7 days nightly (see
 * Masterdata/scripts/game_nonces_cleanup.py — to be added in sub-phase E.0).
 */

import { query, DIALECT } from './db.js';

export async function checkAndInsertNonce(
  clevaiUserId: number,
  clientNonce: number,
  endpoint: string,
): Promise<boolean> {
  if (!Number.isInteger(clevaiUserId) || clevaiUserId <= 0) {
    throw new Error(`nonce: invalid clevaiUserId ${clevaiUserId}`);
  }
  if (!Number.isInteger(clientNonce) || clientNonce < 0) {
    throw new Error(`nonce: invalid clientNonce ${clientNonce}`);
  }

  if (DIALECT === 'postgres') {
    // ON CONFLICT DO NOTHING → returns 0 rows if duplicate, 1 if new
    const sql = `
      INSERT INTO game_nonces (clevai_user_id, client_nonce, endpoint)
      VALUES (?, ?, ?)
      ON CONFLICT (clevai_user_id, client_nonce) DO NOTHING
    `;
    const result = await query(sql, [clevaiUserId, clientNonce, endpoint]);
    return result.rowCount > 0;
  } else {
    // MySQL INSERT IGNORE → affectedRows = 0 if duplicate, 1 if new
    const sql = `
      INSERT IGNORE INTO game_nonces (clevai_user_id, client_nonce, endpoint)
      VALUES (?, ?, ?)
    `;
    const result = await query(sql, [clevaiUserId, clientNonce, endpoint]);
    return result.rowCount > 0;
  }
}
