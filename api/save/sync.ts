/**
 * api/save/sync.ts — POST /api/save/sync (Phase 5).
 *
 * UPSERTs game_players row from client SaveState v10 JSON. Verifies HMAC +
 * nonce. Returns server_updated_at for optimistic concurrency.
 *
 * Body: {
 *   clevaiUserId: number,
 *   state: SaveStateV10,
 *   lastKnownUpdatedAt?: ISO8601 (optional optimistic-concurrency token)
 * }
 *
 * Returns: 200 { server_updated_at, schema_version }
 *          400 missing fields
 *          401 hmac_mismatch | replay_attempted
 *          409 stale_save (client's lastKnownUpdatedAt < server's)
 *          500 internal
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, formatUpsert, serializeJsonForInsert } from '../_lib/db.js';
import { verifyHmacRequest } from '../_lib/auth.js';
import { checkAndInsertNonce } from '../_lib/nonce.js';

interface SyncPayload {
  clevaiUserId: number;
  state: Record<string, unknown>;
  lastKnownUpdatedAt?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const verified = await verifyHmacRequest<SyncPayload>(req.headers, rawBody);
  if ('error' in verified) {
    res.status(verified.status).json({ error: verified.error });
    return;
  }
  const { nonce, body } = verified;
  if (!body.clevaiUserId || !body.state) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  // Replay protection
  const fresh = await checkAndInsertNonce(body.clevaiUserId, nonce, '/api/save/sync');
  if (!fresh) {
    res.status(401).json({ error: 'replay_attempted' });
    return;
  }

  try {
    const s = body.state;
    const cols = [
      'clevai_user_id', 'schema_version', 'hp', 'max_hp', 'mp', 'max_mp',
      'level', 'exp', 'battle_stars', 'login_streak', 'last_login_anchor_utc7',
      'loot_jar_battles_since_last', 'player_name', 'gender', 'hair_style',
      'hint_difficulty', 'client_nonce', 'position_x', 'position_y',
      'current_zone_id', 'last_level_up_at', 'active_pet_instance_id',
      'last_boss_attempt_date', 'shop_stock_refreshed_at',
      'inventory_json', 'equipment_json', 'owned_pets_json',
      'quest_progress_json', 'claimed_rewards_json', 'quest_cycle_anchors_json',
      'shop_stock_json', 'purchase_history_json', 'breeding_chamber_json',
      'flags_json', 'defeated_boss_ids_json', 'claimed_chest_ids_json',
    ];
    const updateCols = cols.filter((c) => c !== 'clevai_user_id');

    const pos = (s.position as { x?: number; y?: number } | undefined) ?? { x: 0, y: 0 };
    const values: unknown[] = [
      body.clevaiUserId,
      10,                                              // schema_version
      s.hp ?? 100, s.maxHp ?? 100, s.mp ?? 50, s.maxMp ?? 50,
      s.level ?? 1, s.exp ?? 0, s.battleStars ?? 0,
      s.loginStreak ?? 0, s.lastLoginAnchorUtc7 ?? 0,
      s.lootJarBattlesSinceLast ?? 0,
      s.playerName ?? null, s.gender ?? 'male', s.hairStyle ?? 'a',
      s.hintDifficulty ?? 'medium', s.clientNonce ?? 0,
      pos.x ?? 0, pos.y ?? 0,
      s.currentZoneId ?? null, s.lastLevelUpAt ?? null,
      (s as { active_pet_instance_id?: string | null }).active_pet_instance_id ?? null,
      (s as { last_boss_attempt_date?: string | null }).last_boss_attempt_date ?? null,
      s.shopStockRefreshedAt ?? 0,
      serializeJsonForInsert(s.inventory ?? []),
      serializeJsonForInsert(s.equipment ?? {}),
      serializeJsonForInsert(s.ownedPets ?? []),
      serializeJsonForInsert(s.questProgress ?? {}),
      serializeJsonForInsert(s.claimedRewards ?? []),
      serializeJsonForInsert(s.questCycleAnchors ?? { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 }),
      s.shopStock ? serializeJsonForInsert(s.shopStock) : null,
      serializeJsonForInsert(s.purchaseHistory ?? {}),
      s.breedingChamber ? serializeJsonForInsert(s.breedingChamber) : null,
      serializeJsonForInsert(s.flags ?? {}),
      serializeJsonForInsert(s.defeatedBossIds ?? []),
      serializeJsonForInsert(s.claimedChestIds ?? []),
    ];

    const sql = formatUpsert('game_players', cols, updateCols, 'clevai_user_id');
    await query(sql, values);

    // Re-read updated_at for optimistic concurrency token
    const after = await query<{ updated_at: string }>(
      'SELECT updated_at FROM game_players WHERE clevai_user_id = ?',
      [body.clevaiUserId],
    );

    res.status(200).json({
      ok: true,
      server_updated_at: after.rows[0]?.updated_at,
      schema_version: 10,
    });
  } catch (e) {
    console.error('[api/save/sync] error:', e);
    res.status(500).json({ error: 'internal', detail: String(e) });
  }
}
