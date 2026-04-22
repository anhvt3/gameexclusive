/**
 * hmac — Web Crypto HMAC SHA-256 primitives (ISP v1.1 Step 9.5 + AP v1.1 §3.2)
 *
 * Pure functions wrapping browser SubtleCrypto. Used by HmacStorage + EventQueueStore
 * to detect tampering of SaveState / event log in localStorage + IndexedDB.
 *
 * Key lifecycle:
 *   - On login: derive from JWT / session token via deriveKeyFromString
 *   - Not logged in: generate ephemeral via generateSessionKey
 *   - Never persist the CryptoKey itself (extractable=false)
 */

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length === 0 || hex.length % 2 !== 0) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a random ephemeral HMAC key — not persistable. */
export async function generateSessionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Derive a stable HMAC key from a string (e.g. JWT / session token). */
export async function deriveKeyFromString(input: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(input);
  // Pad/hash to 32 bytes via SHA-256 for HMAC key material
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** Sign data with key, return hex string (64 chars for SHA-256). */
export async function signHex(data: string, key: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const sig = await crypto.subtle.sign('HMAC', key, encoded);
  return bytesToHex(new Uint8Array(sig));
}

/** Verify data against hex signature with key. Returns false on malformed input (no throw). */
export async function verifyHex(data: string, hmacHex: string, key: CryptoKey): Promise<boolean> {
  const bytes = hexToBytes(hmacHex);
  if (!bytes) return false;
  const encoded = new TextEncoder().encode(data);
  try {
    return await crypto.subtle.verify('HMAC', key, bytes, encoded);
  } catch {
    return false;
  }
}
