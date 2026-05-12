// app/src/server/validationRoutes.ts
// Vite dev-server middleware for Phase 3 HMAC-validated shop/breed endpoints.
// Server-side only — NEVER import this from client bundles.

import type { Connect } from 'vite';
import type { ServerResponse } from 'node:http';
import { deriveKeyFromString, verifyHex } from '../persistence/hmac';

const PHASE3_DEV_SECRET = 'phase3-game-ss3-validation-secret-v1';

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey === null) {
    cachedKey = await deriveKeyFromString(PHASE3_DEV_SECRET);
  }
  return cachedKey;
}

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function respond(res: ServerResponse, status: number, body: object): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function handle(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
  endpoint: string
): Promise<void> {
  if (req.url !== endpoint || req.method !== 'POST') return next();

  const nonceRaw = req.headers['x-nonce'];
  const hmacRaw = req.headers['x-hmac'];
  const nonce = Number(Array.isArray(nonceRaw) ? nonceRaw[0] : nonceRaw);
  const hmac = String(Array.isArray(hmacRaw) ? hmacRaw[0] : hmacRaw);
  const body = await readBody(req);

  if (!Number.isFinite(nonce) || nonce < 1) {
    return respond(res, 400, { ok: false, reason: 'bad_nonce' });
  }

  const key = await getKey();
  const verified = await verifyHex(`${nonce}:${body}`, hmac, key);
  if (!verified) {
    return respond(res, 401, { ok: false, reason: 'hmac_mismatch' });
  }

  // Phase 3 dev: schema-lite + always-ok. Phase 4+ can cross-check server state.
  respond(res, 200, { ok: true, serverNonce: nonce });
}

export function shopValidateRoute(): Connect.NextHandleFunction {
  return (req, res, next) => {
    void handle(req, res, next, '/api/shop/validate');
  };
}

export function breedValidateRoute(): Connect.NextHandleFunction {
  return (req, res, next) => {
    void handle(req, res, next, '/api/breed/validate');
  };
}
