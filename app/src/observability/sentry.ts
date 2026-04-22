/**
 * Sentry integration — AP v1.1 Section 6.1 / ISP Step 18.5.
 *
 * Kept thin: initSentry() reads VITE_SENTRY_DSN and either wires the SDK
 * or no-ops (so dev without a DSN is silent). captureException() is safe
 * to call before init — it just drops.
 *
 * EventBus hook-up lives in eventBusBridge.ts so this file has no
 * dependency on the bus.
 */

import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string') {
    console.info('[sentry] VITE_SENTRY_DSN not set — observability disabled');
    return false;
  }
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE ?? 'dev',
  });
  initialized = true;
  return true;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

export function isSentryInitialized(): boolean {
  return initialized;
}

/** Test-only: reset init state between runs. */
export function __resetSentryForTests(): void {
  initialized = false;
}
