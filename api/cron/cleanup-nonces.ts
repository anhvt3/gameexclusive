/**
 * api/cron/cleanup-nonces.ts — Vercel Cron, daily 03:00 UTC.
 *
 * Per schema comment: "TTL 7 days via cron".
 *
 * Replay-protection nonces are only useful for the duration of network
 * latency + clock skew. 7 days is way beyond that — keeps the table from
 * growing unbounded as users play.
 *
 * Auth: Vercel signs cron invocations with the `Authorization: Bearer
 * <CRON_SECRET>` header. We verify against `CRON_SECRET` env var. Without
 * the secret, the endpoint refuses all callers (so manual probes return 401).
 *
 * Returns: 200 { deleted: number, dialect: string } on success.
 *          401 { error: 'unauthorized' } on bad/missing secret.
 *          500 { error: '...' } on DB failure (Vercel Cron will retry).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, DIALECT } from '../_lib/db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Vercel Cron auth: Authorization: Bearer <CRON_SECRET>
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Fail-closed: if CRON_SECRET isn't configured, refuse everyone.
    // (Prevents accidental DDoS from random probes wiping nonces.)
    res.status(401).json({ error: 'cron_secret_not_configured' });
    return;
  }
  const auth = req.headers.authorization ?? '';
  if (auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    // 7-day TTL. Both pg and mysql2 understand the literal — db.ts query()
    // handles parameter placeholder differences via ? → $1 rewrite for pg.
    const sql =
      DIALECT === 'postgres'
        ? `DELETE FROM game_nonces WHERE used_at < NOW() - INTERVAL '7 days'`
        : `DELETE FROM game_nonces WHERE used_at < NOW() - INTERVAL 7 DAY`;
    const result = await query(sql, []);
    // pg: result.rowCount; mysql2: result.rows.affectedRows — db.ts normalizes
    // rowCount as the canonical "rows affected" for DELETE/UPDATE.
    const deleted = result.rowCount ?? 0;
    console.log(`[cron] cleanup-nonces dialect=${DIALECT} deleted=${deleted}`);
    res.status(200).json({ ok: true, deleted, dialect: DIALECT });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron] cleanup-nonces failed: ${message}`);
    res.status(500).json({ error: 'cleanup_failed', message });
  }
}
