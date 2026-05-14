#!/usr/bin/env node
/**
 * uat_smoke.mjs — Phase 5 D.4
 *
 * Black-box smoke test of the deployed Vercel UAT URL. Verifies:
 *   1. /api/health → 200 + { ok: true, dialect: 'pg' } (or 'mysql' in F)
 *   2. /api/save/sync → 401 without HMAC (auth gate works)
 *   3. /api/save/sync → 200 with valid HMAC + nonce, returns server_updated_at
 *   4. /api/save/load → returns persisted state
 *   5. /api/telemetry → 200 with valid HMAC + nonce
 *
 * Usage:
 *   UAT_URL=https://gameexclusive-xxx.vercel.app \
 *   UAT_SECRET=phase5-game-ss3-validation-secret-v1 \
 *     node scripts/uat_smoke.mjs
 *
 * Exit 0 on all-pass, 1 on any failure.
 */
import crypto from 'node:crypto';

const UAT_URL = process.env.UAT_URL;
const SECRET = process.env.UAT_SECRET ?? 'phase5-game-ss3-validation-secret-v1';
const TEST_USER_ID = Number(process.env.UAT_USER_ID ?? 999001);

if (!UAT_URL) {
  console.error('FAIL — UAT_URL env var required');
  process.exit(1);
}

function hmac(nonce, body) {
  // Mirrors app/src/persistence/hmac.ts deriveKeyFromString + signHex:
  //   key = sha256(secret); mac = hmac_sha256(key, `${nonce}:${body}`)
  const key = crypto.createHash('sha256').update(SECRET, 'utf8').digest();
  return crypto.createHmac('sha256', key).update(`${nonce}:${body}`, 'utf8').digest('hex');
}

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`);
}

async function check1_health() {
  try {
    const res = await fetch(`${UAT_URL}/api/health`);
    const body = await res.json();
    record('1. /api/health 200 + db ping', res.ok && body.ok === true, `dialect=${body.dialect ?? '?'}`);
  } catch (e) {
    record('1. /api/health 200 + db ping', false, String(e));
  }
}

async function check2_authGate() {
  try {
    const res = await fetch(`${UAT_URL}/api/save/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clevaiUserId: TEST_USER_ID, state: {} }),
    });
    // Server returns 400 (missing_auth_headers) when no x-hmac/x-nonce —
    // 401 only fires after a malformed/forged HMAC. Both are correct auth-gate
    // rejections, so accept either.
    record('2. /api/save/sync rejects unauthenticated', res.status === 400 || res.status === 401, `got ${res.status}`);
  } catch (e) {
    record('2. /api/save/sync 401 without HMAC', false, String(e));
  }
}

async function check3_saveSync() {
  const nonce = Date.now();
  const body = JSON.stringify({
    clevaiUserId: TEST_USER_ID,
    lastKnownUpdatedAt: null,
    state: {
      hp: 100, maxHp: 100, mp: 50, maxMp: 50, level: 1, exp: 0,
      battleStars: 0, loginStreak: 0, lastLoginAnchorUtc7: 0,
      lootJarBattlesSinceLast: 0,
      playerName: 'uat-smoke', gender: 'male', hairStyle: 'a',
      hintDifficulty: 'medium', clientNonce: nonce,
      position: { x: 0, y: 0 }, currentZoneId: null, lastLevelUpAt: null,
      active_pet_instance_id: null, last_boss_attempt_date: null,
      shopStockRefreshedAt: 0,
      inventory: [], equipment: {}, ownedPets: [],
      questProgress: {}, claimedRewards: [], questCycleAnchors: {},
      shopStock: [], purchaseHistory: {}, breedingChamber: null,
      flags: {}, defeatedBossIds: [], claimedChestIds: [],
    },
  });
  try {
    const res = await fetch(`${UAT_URL}/api/save/sync`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-nonce': String(nonce),
        'x-hmac': hmac(nonce, body),
      },
      body,
    });
    const data = await res.json().catch(() => ({}));
    record(
      '3. /api/save/sync 200 with HMAC',
      res.ok && !!data.server_updated_at,
      `status=${res.status} server_updated_at=${data.server_updated_at ?? 'missing'}`
    );
  } catch (e) {
    record('3. /api/save/sync 200 with HMAC', false, String(e));
  }
}

async function check4_saveLoad() {
  try {
    const res = await fetch(`${UAT_URL}/api/save/load?cu=${TEST_USER_ID}`);
    const data = await res.json();
    record(
      '4. /api/save/load returns persisted state',
      res.ok && data.state && data.state.playerName === 'uat-smoke',
      `level=${data.state?.level ?? '?'}`
    );
  } catch (e) {
    record('4. /api/save/load returns persisted state', false, String(e));
  }
}

async function check5_telemetry() {
  const nonce = Date.now() + 1;
  const body = JSON.stringify({
    clevaiUserId: TEST_USER_ID,
    event: 'shop_purchase',
    ts: Date.now(),
    itemId: 'uat-smoke-item',
    priceCharged: 30,
    battleStarsAfter: 70,
  });
  try {
    const res = await fetch(`${UAT_URL}/api/telemetry`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-nonce': String(nonce),
        'x-hmac': hmac(nonce, body),
      },
      body,
    });
    record('5. /api/telemetry 200 with HMAC', res.ok, `status=${res.status}`);
  } catch (e) {
    record('5. /api/telemetry 200 with HMAC', false, String(e));
  }
}

async function main() {
  console.log(`[uat-smoke] target = ${UAT_URL}`);
  console.log(`[uat-smoke] test user id = ${TEST_USER_ID}`);
  console.log('');
  await check1_health();
  await check2_authGate();
  await check3_saveSync();
  await check4_saveLoad();
  await check5_telemetry();
  console.log('');
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log(`[uat-smoke] ALL ${results.length} CHECKS PASSED ✓`);
    process.exit(0);
  }
  console.error(`[uat-smoke] ${failed.length}/${results.length} CHECKS FAILED`);
  process.exit(1);
}

main();
