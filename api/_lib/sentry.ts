/**
 * api/_lib/sentry.ts — Server-side Sentry init (Phase 5 spec §4.2).
 *
 * Captures errors from Vercel Functions and tags them with the prod Git SHA
 * so frontend + backend errors line up under the same release in the Sentry
 * dashboard. Acceptance criterion §5.13.
 *
 * Soft-fail: when SENTRY_DSN is unset (local dev, CI before secrets added),
 * captureException becomes a noop, init never runs — function endpoints
 * keep working with no Sentry coverage. No hard dependency on Sentry being
 * configured.
 *
 * Usage:
 *   import { withSentry, captureException } from './_lib/sentry.js';
 *
 *   // Wrap a Vercel handler so unhandled throws get reported:
 *   export default withSentry(async (req, res) => { ... });
 *
 *   // Manual reporting:
 *   try { ... } catch (err) { captureException(err, { tag: 'save_sync' }); }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

let initialized = false;
let sentryMod: typeof import('@sentry/node') | null = null;

async function ensureInit(): Promise<typeof import('@sentry/node') | null> {
  if (initialized) return sentryMod;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    initialized = true; // mark so we don't keep retrying lazy import
    return null;
  }
  try {
    const mod = await import('@sentry/node');
    mod.init({
      dsn,
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SENTRY_RELEASE ?? 'dev',
      environment: process.env.VERCEL_ENV ?? 'preview',
      // Phase 5: keep tracesSampleRate low — these endpoints are hot path
      // and Vercel cold-start cost compounds with Sentry instrumentation.
      tracesSampleRate: 0.05,
    });
    initialized = true;
    sentryMod = mod;
    return mod;
  } catch (err) {
    console.warn('[sentry] init failed (soft-fail):', err);
    initialized = true;
    return null;
  }
}

/**
 * Manually report an exception. Safe to call even when Sentry isn't
 * configured — becomes a console.error fallback.
 */
export async function captureException(
  err: unknown,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const mod = await ensureInit();
  if (!mod) {
    // Always log to stderr so Vercel function logs still capture the error.
    console.error('[sentry-fallback]', err, extra);
    return;
  }
  mod.captureException(err, { extra });
}

/**
 * Wrap a Vercel handler so unhandled throws are reported to Sentry then
 * re-thrown (preserves Vercel's own error handling — 500 response).
 */
export function withSentry<
  Handler extends (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
>(handler: Handler): Handler {
  const wrapped = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    await ensureInit();
    try {
      await handler(req, res);
    } catch (err) {
      await captureException(err, {
        method: req.method,
        url: req.url,
        headers_x_nonce: req.headers['x-nonce'] ?? null,
      });
      throw err;
    }
  };
  return wrapped as Handler;
}
