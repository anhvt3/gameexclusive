/**
 * api/_lib/auth.ts — HMAC verify (Node-side, Phase 5).
 *
 * Mirrors Phase 3 client-side `ServerValidator.ts` HMAC sign flow.
 * Derives a CryptoKey from PHASE5_VALIDATION_SECRET env var, verifies
 * incoming `x-nonce` + `x-hmac` headers.
 *
 * Uses Node's globalThis.crypto (Web Crypto API) — Node 20+.
 */

const SECRET_ENV = 'PHASE5_VALIDATION_SECRET';

// Node 20+ exposes Web Crypto globally; types come from globalThis.crypto
type AuthKey = Awaited<ReturnType<typeof globalThis.crypto.subtle.importKey>>;

let cachedKey: AuthKey | null = null;

async function deriveKey(): Promise<AuthKey> {
  if (cachedKey) return cachedKey;
  const secret = process.env[SECRET_ENV];
  if (!secret) {
    throw new Error(`Phase 5 auth.ts: ${SECRET_ENV} env var not set`);
  }
  const enc = new TextEncoder();
  cachedKey = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return cachedKey;
}

/** Compute HMAC-SHA-256 hex of `data` using the derived key. */
export async function signHex(data: string): Promise<string> {
  const key = await deriveKey();
  const enc = new TextEncoder();
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify hex HMAC against expected data. Constant-time compare. */
export async function verifyHex(data: string, hmacHex: string): Promise<boolean> {
  const expected = await signHex(data);
  if (expected.length !== hmacHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ hmacHex.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Higher-level: verify a Vercel Function request's HMAC envelope.
 *
 * Expected headers:
 *   x-nonce  — positive integer string (monotonic per-user counter)
 *   x-hmac   — hex HMAC of `${nonce}:${rawBody}`
 *
 * @returns parsed payload + verified nonce, OR null on failure
 */
export interface VerifiedRequest<T> {
  nonce: number;
  body: T;
  rawBody: string;
}

export async function verifyHmacRequest<T = unknown>(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
): Promise<VerifiedRequest<T> | { error: string; status: number }> {
  const nonceRaw = headers['x-nonce'];
  const hmacRaw = headers['x-hmac'];
  const nonceStr = Array.isArray(nonceRaw) ? nonceRaw[0] : nonceRaw;
  const hmac = Array.isArray(hmacRaw) ? hmacRaw[0] : hmacRaw;
  if (!nonceStr || !hmac) {
    return { error: 'missing_auth_headers', status: 400 };
  }
  const nonce = Number(nonceStr);
  if (!Number.isFinite(nonce) || nonce < 1) {
    return { error: 'bad_nonce', status: 400 };
  }
  const verified = await verifyHex(`${nonce}:${rawBody}`, hmac);
  if (!verified) {
    return { error: 'hmac_mismatch', status: 401 };
  }
  let body: T;
  try {
    body = JSON.parse(rawBody) as T;
  } catch {
    return { error: 'bad_body_json', status: 400 };
  }
  return { nonce, body, rawBody };
}
