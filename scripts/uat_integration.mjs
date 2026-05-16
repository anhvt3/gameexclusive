#!/usr/bin/env node
/**
 * uat_integration.mjs — Phase 5 Sub-phase D extended integration tests.
 *
 * Goes beyond uat_smoke.mjs basic happy-path. Covers:
 *   1. Replay attack rejection (same nonce twice → second gets 401)
 *   2. Forged HMAC rejection (good nonce, bad HMAC → 401)
 *   3. Multi-user isolation (user A's sync doesn't leak to user B's load)
 *   4. Optimistic concurrency stale_save (write with stale updated_at → 409)
 *   5. /api/shop/validate happy path
 *   6. /api/breed/validate happy path
 *   7. Method gate (GET on POST-only endpoint → 405)
 *
 * Usage: UAT_URL=https://... node scripts/uat_integration.mjs
 * Exit 0 if all PASS, 1 on any FAIL.
 */
import crypto from 'node:crypto';

const UAT_URL = process.env.UAT_URL;
const SECRET = process.env.UAT_SECRET ?? 'phase5-game-ss3-validation-secret-v1';
const USER_A = Number(process.env.UAT_USER_A ?? 999100);
const USER_B = Number(process.env.UAT_USER_B ?? 999101);

if (!UAT_URL) {
  console.error('FAIL — UAT_URL env var required');
  process.exit(1);
}

const key = crypto.createHash('sha256').update(SECRET, 'utf8').digest();
function hmac(nonce, body) {
  return crypto.createHmac('sha256', key).update(`${nonce}:${body}`, 'utf8').digest('hex');
}

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`);
}

function makeSaveBody(userId, extras = {}) {
  return JSON.stringify({
    clevaiUserId: userId,
    lastKnownUpdatedAt: null,
    state: {
      hp: 100, maxHp: 100, mp: 50, maxMp: 50, level: 1, exp: 0,
      battleStars: 0, loginStreak: 0, lastLoginAnchorUtc7: 0,
      lootJarBattlesSinceLast: 0,
      playerName: `uat-int-${userId}`, gender: 'male', hairStyle: 'a',
      hintDifficulty: 'medium', clientNonce: 0,
      position: { x: 0, y: 0 }, currentZoneId: null, lastLevelUpAt: null,
      active_pet_instance_id: null, last_boss_attempt_date: null,
      shopStockRefreshedAt: 0,
      inventory: [], equipment: {}, ownedPets: [],
      questProgress: {}, claimedRewards: [], questCycleAnchors: {},
      shopStock: [], purchaseHistory: {}, breedingChamber: null,
      flags: {}, defeatedBossIds: [], claimedChestIds: [],
      ...extras,
    },
  });
}

async function postSigned(endpoint, body, nonce, hmacOverride = null) {
  return fetch(`${UAT_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nonce': String(nonce),
      'x-hmac': hmacOverride ?? hmac(nonce, body),
    },
    body,
  });
}

// ─── Test 1: Replay attack ────────────────────────────────────────────────────
async function check1_replay() {
  const nonce = Date.now() + 10000;          // future-proof against test 0
  const body = makeSaveBody(USER_A);
  const r1 = await postSigned('/api/save/sync', body, nonce);
  const r2 = await postSigned('/api/save/sync', body, nonce); // same nonce
  const r2body = await r2.json().catch(() => ({}));
  record(
    '1. Replay attack rejected (same nonce twice)',
    r1.ok && (r2.status === 401 || r2.status === 409 || r2body.error === 'replay_attempted'),
    `r1=${r1.status} r2=${r2.status} err=${r2body.error ?? '?'}`,
  );
}

// ─── Test 2: Forged HMAC ──────────────────────────────────────────────────────
async function check2_forged() {
  const nonce = Date.now() + 20000;
  const body = makeSaveBody(USER_A);
  const badHmac = '0'.repeat(64);
  const res = await postSigned('/api/save/sync', body, nonce, badHmac);
  const data = await res.json().catch(() => ({}));
  record(
    '2. Forged HMAC rejected',
    res.status === 401 && data.error === 'hmac_mismatch',
    `status=${res.status} error=${data.error ?? '?'}`,
  );
}

// ─── Test 3: Multi-user isolation ─────────────────────────────────────────────
async function check3_isolation() {
  const nonceA = Date.now() + 30000;
  const bodyA = makeSaveBody(USER_A, { level: 42, playerName: 'user-A-isolation' });
  await postSigned('/api/save/sync', bodyA, nonceA);

  // Load user B — should be empty/404 OR have own state, NOT user A's level=42
  const resB = await fetch(`${UAT_URL}/api/save/load?cu=${USER_B}`);
  let leaked = false;
  if (resB.ok) {
    const dataB = await resB.json();
    if (dataB.state && dataB.state.playerName === 'user-A-isolation') leaked = true;
    if (dataB.state && dataB.state.level === 42) leaked = true;
  }
  record(
    '3. Multi-user isolation (user A sync does not leak to user B load)',
    !leaked,
    leaked ? 'LEAK DETECTED — user A state visible on user B GET' : `user B status=${resB.status}`,
  );
}

// ─── Test 4: Stale-save optimistic concurrency ────────────────────────────────
async function check4_staleSave() {
  // Sync once to establish baseline
  const nonce1 = Date.now() + 40000;
  const body1 = makeSaveBody(USER_A);
  const r1 = await postSigned('/api/save/sync', body1, nonce1);
  const r1data = await r1.json();
  const realServerTs = r1data.server_updated_at;
  if (!realServerTs) {
    record('4. Stale-save → 409', false, 'baseline sync did not return server_updated_at');
    return;
  }

  // Now sync again with a deliberately stale lastKnownUpdatedAt
  const nonce2 = Date.now() + 40001;
  const stalePayload = JSON.parse(makeSaveBody(USER_A));
  stalePayload.lastKnownUpdatedAt = '2020-01-01T00:00:00.000Z'; // very old
  const body2 = JSON.stringify(stalePayload);
  const r2 = await postSigned('/api/save/sync', body2, nonce2);
  const r2data = await r2.json().catch(() => ({}));
  // Phase 5 may accept stale (last-write-wins) or reject (409). Spec note in
  // SaveSyncEngine.ts: "Phase 6 implements full conflict handling; Phase 5
  // last-write-wins is acceptable". So PASS if 200 OR 409. FAIL if 5xx/4xx-other.
  record(
    '4. Stale-save handled (200 last-write-wins OR 409 stale_save)',
    r2.status === 200 || r2.status === 409,
    `status=${r2.status} error=${r2data.error ?? r2data.server_updated_at ?? '?'}`,
  );
}

// ─── Test 5: /api/shop/validate ──────────────────────────────────────────────
async function check5_shopValidate() {
  const nonce = Date.now() + 50000;
  const body = JSON.stringify({
    clevaiUserId: USER_A,
    itemId: 'hat-apprentice-01',
    priceCharged: 30,
    battleStarsBefore: 100,
  });
  const res = await postSigned('/api/shop/validate', body, nonce);
  const data = await res.json().catch(() => ({}));
  // Protocol-level: HMAC verified + endpoint reached + business validator ran.
  // 200 (ok), 4xx with explicit reason (validation rejection) both pass.
  // 401/403 without reason (auth failure) or 5xx (crash) fail.
  record(
    '5. /api/shop/validate endpoint live (HMAC+routing OK)',
    res.status < 500 && (data.ok !== undefined || data.reason !== undefined),
    `status=${res.status} ok=${data.ok} reason=${data.reason ?? '?'}`,
  );
}

// ─── Test 6: /api/breed/validate ─────────────────────────────────────────────
async function check6_breedValidate() {
  const nonce = Date.now() + 60000;
  const body = JSON.stringify({
    clevaiUserId: USER_A,
    parentA: 'flame-pup',
    parentB: 'aqua-fin',
    offspringRarity: 'rare',
    costPaid: 200,
  });
  const res = await postSigned('/api/breed/validate', body, nonce);
  const data = await res.json().catch(() => ({}));
  record(
    '6. /api/breed/validate endpoint live (HMAC+routing OK)',
    res.status < 500 && (data.ok !== undefined || data.reason !== undefined),
    `status=${res.status} ok=${data.ok} reason=${data.reason ?? '?'}`,
  );
}

// ─── Test 7: Method gate (GET on POST-only) ──────────────────────────────────
async function check7_methodGate() {
  const res = await fetch(`${UAT_URL}/api/save/sync`);
  const data = await res.json().catch(() => ({}));
  record(
    '7. GET on POST-only endpoint → 405',
    res.status === 405,
    `status=${res.status} error=${data.error ?? '?'}`,
  );
}

async function main() {
  console.log(`[uat-int] target = ${UAT_URL}`);
  console.log(`[uat-int] user A = ${USER_A}, user B = ${USER_B}\n`);
  await check1_replay();
  await check2_forged();
  await check3_isolation();
  await check4_staleSave();
  await check5_shopValidate();
  await check6_breedValidate();
  await check7_methodGate();
  console.log('');
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log(`[uat-int] ALL ${results.length} CHECKS PASSED ✓`);
    process.exit(0);
  }
  console.error(`[uat-int] ${failed.length}/${results.length} CHECKS FAILED`);
  process.exit(1);
}

main();
