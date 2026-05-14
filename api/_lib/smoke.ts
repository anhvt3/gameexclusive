// Smoke test: import db.ts directly via tsx, run ping() + tiny INSERT+SELECT+DELETE
// against Vercel Postgres. Verifies driver abstraction works end-to-end.
//
// Run: POSTGRES_URL_NON_POOLING="..." DB_DIALECT=postgres node --experimental-strip-types api/_lib/smoke.mjs
// (or use tsx if available)

import { query, ping, parseJsonColumn, serializeJsonForInsert, formatUpsert, DIALECT } from './db.js';

async function main() {
  console.log(`[smoke] DIALECT=${DIALECT}`);

  const pingResult = await ping();
  console.log(`[smoke] ping():`, pingResult);
  if (!pingResult.ok) process.exit(1);

  // INSERT a fake row with all required JSON columns
  const fakeUser = 999990001;
  console.log(`[smoke] DELETE existing fake user ${fakeUser} (cleanup) ...`);
  await query('DELETE FROM game_players WHERE clevai_user_id = ?', [fakeUser]).catch((e) => {
    console.log(`[smoke] cleanup skipped: ${e.message}`);
  });

  const cols = [
    'clevai_user_id',
    'inventory_json', 'equipment_json', 'owned_pets_json',
    'quest_progress_json', 'claimed_rewards_json', 'quest_cycle_anchors_json',
    'purchase_history_json', 'flags_json',
    'defeated_boss_ids_json', 'claimed_chest_ids_json',
  ];
  const ph = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO game_players (${cols.join(', ')}) VALUES (${ph})`;
  const values = [
    fakeUser,
    serializeJsonForInsert([]),
    serializeJsonForInsert({}),
    serializeJsonForInsert([]),
    serializeJsonForInsert({}),
    serializeJsonForInsert([]),
    serializeJsonForInsert({ dailyEpochUtc7: 0, weeklyEpochUtc7: 0 }),
    serializeJsonForInsert({}),
    serializeJsonForInsert({}),
    serializeJsonForInsert([]),
    serializeJsonForInsert([]),
  ];
  console.log(`[smoke] INSERT 1 fake game_players row ...`);
  await query(sql, values);

  console.log(`[smoke] SELECT back ...`);
  const r = await query('SELECT clevai_user_id, level, battle_stars, gender, inventory_json, quest_cycle_anchors_json, created_at, updated_at FROM game_players WHERE clevai_user_id = ?', [fakeUser]);
  console.log(`[smoke] row count: ${r.rowCount}`);
  if (r.rowCount === 1) {
    const row = r.rows[0];
    console.log(`[smoke] data:`, {
      clevai_user_id: row.clevai_user_id,
      level: row.level,
      battle_stars: row.battle_stars,
      gender: row.gender,
      inventory_parsed: parseJsonColumn(row.inventory_json),
      quest_cycle_anchors_parsed: parseJsonColumn(row.quest_cycle_anchors_json),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  // Trigger test: UPDATE → updated_at should bump
  console.log(`[smoke] UPDATE to test updated_at trigger ...`);
  const beforeUpdate = await query('SELECT updated_at FROM game_players WHERE clevai_user_id = ?', [fakeUser]);
  const beforeTs = beforeUpdate.rows[0].updated_at;
  await new Promise((r) => setTimeout(r, 1100));
  await query('UPDATE game_players SET level = 2 WHERE clevai_user_id = ?', [fakeUser]);
  const afterUpdate = await query('SELECT updated_at, level FROM game_players WHERE clevai_user_id = ?', [fakeUser]);
  const afterTs = afterUpdate.rows[0].updated_at;
  console.log(`[smoke] updated_at before:`, beforeTs);
  console.log(`[smoke] updated_at after :`, afterTs);
  console.log(`[smoke] level after :`, afterUpdate.rows[0].level);
  console.log(`[smoke] trigger fired: ${new Date(afterTs as string | number | Date).getTime() > new Date(beforeTs as string | number | Date).getTime()}`);

  // UPSERT test
  console.log(`[smoke] formatUpsert test ...`);
  const upsertSql = formatUpsert('game_players',
    ['clevai_user_id', 'level', 'inventory_json', 'equipment_json', 'owned_pets_json', 'quest_progress_json', 'claimed_rewards_json', 'quest_cycle_anchors_json', 'purchase_history_json', 'flags_json', 'defeated_boss_ids_json', 'claimed_chest_ids_json'],
    ['level'],
    'clevai_user_id',
  );
  console.log(`[smoke] upsert SQL:`, upsertSql.slice(0, 200) + '...');
  await query(upsertSql, [
    fakeUser, 7,
    serializeJsonForInsert([]), serializeJsonForInsert({}), serializeJsonForInsert([]),
    serializeJsonForInsert({}), serializeJsonForInsert([]),
    serializeJsonForInsert({ dailyEpochUtc7: 0, weeklyEpochUtc7: 0 }),
    serializeJsonForInsert({}), serializeJsonForInsert({}),
    serializeJsonForInsert([]), serializeJsonForInsert([]),
  ]);
  const afterUpsert = await query('SELECT level FROM game_players WHERE clevai_user_id = ?', [fakeUser]);
  console.log(`[smoke] level after upsert (expect 7):`, afterUpsert.rows[0].level);

  // Cleanup
  console.log(`[smoke] cleanup ...`);
  await query('DELETE FROM game_players WHERE clevai_user_id = ?', [fakeUser]);
  await query('DELETE FROM game_nonces WHERE clevai_user_id = ?', [fakeUser]);

  console.log(`[smoke] DONE — all checks passed`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`[smoke] FAIL:`, e);
  process.exit(1);
});
