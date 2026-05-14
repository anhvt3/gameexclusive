// app/src/server/telemetryRoute.ts
// Vite dev-server middleware for Phase 4 telemetry mock endpoint.
// Server-side only — NEVER import this from client bundles.

import type { Connect } from 'vite';
import type { ServerResponse } from 'node:http';

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function respond(res: ServerResponse, status: number, body: object): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function telemetryRoute(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url !== '/api/telemetry' || req.method !== 'POST') return next();
    const body = await readBody(req);
    console.log('[mock /api/telemetry]', body.slice(0, 200));
    respond(res as ServerResponse, 200, { ok: true });
  };
}
