/**
 * ServerValidator — Phase 3 server validation seam (AP §11.12, Q9 default).
 *
 * Wraps a domain action payload in HMAC + nonce envelope, posts to the
 * Vite-middleware endpoint, returns the validation verdict.
 *
 * Soft-fail policy: if `fetch` throws (Vite plugin not loaded, production
 * stub 404, network down), the action still completes with `console.warn` +
 * `reason: 'fetch_failed_soft_allow'`. Phase 3 internal deploy treats
 * validation as advisory.
 *
 * Key derivation: a fixed dev secret is shared between client (browser) and
 * Vite middleware (Node). Both derive the same CryptoKey via
 * `deriveKeyFromString`. Production deploy may override via env var.
 */

import { deriveKeyFromString, signHex } from '@/persistence/hmac';
import { useSaveState } from '@/persistence/SaveStateStore';

// Phase 5: env-driven secret (matches PHASE5_VALIDATION_SECRET on backend).
// Falls back to Phase 3 literal so existing tests + dev workflow still work.
const PHASE3_DEV_SECRET = (import.meta.env.VITE_PHASE5_VALIDATION_SECRET as string | undefined)
  ?? 'phase3-game-ss3-validation-secret-v1';

// Phase 5: API base URL for production vs preview vs dev environments.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey === null) {
    cachedKey = await deriveKeyFromString(PHASE3_DEV_SECRET);
  }
  return cachedKey;
}

export interface ValidationResponse {
  ok: boolean;
  reason?: string;
  serverNonce?: number;
}

export type ValidationEndpoint = '/api/shop/validate' | '/api/breed/validate';

/**
 * Post a signed action payload to the validation endpoint.
 *
 * - clientNonce is bumped BEFORE fetch (prevents replay on network error).
 * - HMAC signs `<nonce>:<body>` with the dev shared key.
 * - Soft-fails on any fetch error: returns ok:true + reason:'fetch_failed_soft_allow'.
 */
export async function validateAction<T>(
  endpoint: ValidationEndpoint,
  payload: T
): Promise<ValidationResponse> {
  const nonce = useSaveState.getState().clientNonce + 1;
  const body = JSON.stringify(payload);
  const key = await getKey();
  const hmac = await signHex(`${nonce}:${body}`, key);

  // Bump nonce BEFORE fetch — even network errors don't allow replay.
  useSaveState.getState().bumpClientNonce();

  try {
    // Phase 5: concatenate API_BASE so production builds hit Vercel functions
    // at absolute URL (e.g. https://game.clevai.edu.vn/api/shop/validate).
    // Dev/test with empty API_BASE → relative URL (mock middleware on Vite).
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-nonce': String(nonce),
        'x-hmac': hmac,
      },
      body,
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }

    return (await res.json()) as ValidationResponse;
  } catch (err) {
    console.warn('[ServerValidator] fetch failed, soft-allowing action:', err);
    return { ok: true, reason: 'fetch_failed_soft_allow' };
  }
}

/**
 * Exported for Vite middleware (server-side verify). Re-imports same helpers
 * to guarantee identical key derivation on both sides.
 */
export async function getValidationKey(): Promise<CryptoKey> {
  return getKey();
}
