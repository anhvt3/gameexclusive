/**
 * api/save/load.ts — GET /api/save/load?cu=<clevaiUserId> (Phase 5).
 *
 * Returns SaveState v10 JSON shape for the given Clevai user. If no row
 * exists, returns 404 — client should treat as fresh save (Phase 4 defaults).
 *
 * Auth: Phase 5 UAT uses URL query stub (no HMAC for reads). Phase 6 wires
 * real Clevai SSO + JWT verify.
 *
 * Returns: 200 { state: SaveStateV10, server_updated_at: ISO8601 }
 *          404 { error: 'no_save_record' }
 *          400 { error: 'missing_clevai_user_id' }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, parseJsonColumn } from '../_lib/db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const cuRaw = req.query.cu;
  const cu = Number(Array.isArray(cuRaw) ? cuRaw[0] : cuRaw);
  if (!Number.isInteger(cu) || cu <= 0) {
    res.status(400).json({ error: 'missing_or_invalid_clevai_user_id' });
    return;
  }

  try {
    const result = await query<Record<string, unknown>>(
      `SELECT * FROM game_players WHERE clevai_user_id = ? LIMIT 1`,
      [cu],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'no_save_record' });
      return;
    }
    const row = result.rows[0]!;
    // Transform DB row → SaveStateV10 shape (snake_case → camelCase, parse JSON)
    const state = {
      hp: row.hp,
      maxHp: row.max_hp,
      mp: row.mp,
      maxMp: row.max_mp,
      level: row.level,
      exp: row.exp,
      battleStars: row.battle_stars,
      loginStreak: row.login_streak,
      lastLoginAnchorUtc7: Number(row.last_login_anchor_utc7),
      lootJarBattlesSinceLast: row.loot_jar_battles_since_last,
      playerName: row.player_name,
      gender: row.gender,
      hairStyle: row.hair_style,
      hintDifficulty: row.hint_difficulty,
      clientNonce: row.client_nonce,
      position: { x: row.position_x, y: row.position_y },
      currentZoneId: row.current_zone_id,
      lastLevelUpAt: row.last_level_up_at ? Number(row.last_level_up_at) : null,
      active_pet_instance_id: row.active_pet_instance_id,
      last_boss_attempt_date: row.last_boss_attempt_date,
      shopStockRefreshedAt: Number(row.shop_stock_refreshed_at),
      inventory: parseJsonColumn(row.inventory_json),
      equipment: parseJsonColumn(row.equipment_json),
      ownedPets: parseJsonColumn(row.owned_pets_json),
      questProgress: parseJsonColumn(row.quest_progress_json),
      claimedRewards: parseJsonColumn(row.claimed_rewards_json),
      questCycleAnchors: parseJsonColumn(row.quest_cycle_anchors_json),
      shopStock: parseJsonColumn(row.shop_stock_json) ?? [],
      purchaseHistory: parseJsonColumn(row.purchase_history_json),
      breedingChamber: parseJsonColumn(row.breeding_chamber_json),
      flags: parseJsonColumn(row.flags_json),
      defeatedBossIds: parseJsonColumn(row.defeated_boss_ids_json),
      claimedChestIds: parseJsonColumn(row.claimed_chest_ids_json),
    };
    res.status(200).json({
      state,
      server_updated_at: row.updated_at,
      schema_version: row.schema_version,
    });
  } catch (e) {
    console.error('[api/save/load] error:', e);
    res.status(500).json({ error: 'internal', detail: String(e) });
  }
}
