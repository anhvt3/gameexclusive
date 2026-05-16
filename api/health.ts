/**
 * api/health.ts — GET /api/health (Phase 5).
 *
 * Returns service status + DB connectivity. Used by:
 *   - Vercel deploy smoke test (D.4)
 *   - External monitoring (Pingdom/UptimeRobot, Phase 6+)
 *   - Manual debugging
 *
 * No auth required. Public endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ping, DIALECT } from './_lib/db.js';
import { withSentry } from './_lib/sentry.js';

async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';
  const db = await ping();
  const status = db.ok ? 200 : 503;
  res.status(status).json({
    ok: db.ok,
    version,
    dialect: DIALECT,
    db: db.ok ? 'connected' : 'disconnected',
    region: process.env.VERCEL_REGION ?? 'local',
    timestamp: Date.now(),
    ...(db.error ? { db_error: db.error } : {}),
  });
}

export default withSentry(handler);
