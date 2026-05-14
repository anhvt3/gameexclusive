-- ============================================================================
-- Phase 5 — Game SS3 Backend Tables — Vercel Postgres UAT version
-- ============================================================================
-- Project: Game_SS3_exclusive (Clevai internal Edu-RPG, ~10K students)
-- Author:  Claude (claude/phase5-vercel-mysql-6e685e)
-- Date:    2026-05-13
-- Target:  Vercel Postgres (Neon-powered, native Vercel integration)
-- Spec:    docs/superpowers/specs/2026-05-13-phase-5-vercel-mysql-design.md
-- Paired:  2026-05-13-create-game-tables-mysql.sql (canonical for staging/prod)
--
-- ⚠️  PARITY POLICY:
--   • This Postgres file is the UAT environment ONLY (sub-phase A-E).
--   • Sub-phase F migrates SAME logical schema to MySQL (staging then prod).
--   • Any column added/changed here MUST also be added to MySQL file +
--     drift-detection test (Masterdata/scripts/check_schema_parity.py).
--
-- ⚠️  SYNTAX TRANSLATION (MySQL → Postgres):
--   • BIGINT UNSIGNED          → BIGINT (Postgres signed 64-bit; sufficient
--                                 for 10^18 IDs; CHECK >= 0 added on PKs)
--   • SMALLINT UNSIGNED        → SMALLINT (signed 16-bit; CHECK >= 0 for HP,
--                                 level etc. but optional since defaults > 0)
--   • TINYINT UNSIGNED         → SMALLINT (Postgres no 8-bit int type)
--   • TINYINT(1)               → BOOLEAN
--   • AUTO_INCREMENT           → GENERATED ALWAYS AS IDENTITY (Postgres 10+)
--   • JSON                     → JSONB (Postgres native, indexed, faster)
--   • ENUM(...)                → TEXT + CHECK constraint (CHECK is portable;
--                                 Postgres ENUMs require DROP TYPE for value
--                                 changes — too brittle for game design)
--   • TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--                              → TIMESTAMPTZ DEFAULT NOW()
--   • ON UPDATE CURRENT_TIMESTAMP
--                              → TRIGGER (no inline equivalent in Postgres;
--                                 see updated_at trigger setup at bottom)
--   • INDEX idx_name (col)     → separate CREATE INDEX statement (Postgres
--                                 forbids inline INDEX in CREATE TABLE)
--   • COMMENT 'xxx' on column  → COMMENT ON COLUMN tbl.col IS 'xxx' (separate)
--   • ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--                              → Postgres defaults (UTF-8) — omitted
--   • CHAR(64)                 → CHAR(64) — same
--   • VARCHAR(N)               → VARCHAR(N) — same
--   • Composite PK (a, b)      → PRIMARY KEY (a, b) — same syntax
--   • START TRANSACTION        → BEGIN (Postgres preferred)
--   • CREATE USER ... GRANT    → see §B (different identifier syntax)
--
-- Execution:
--   This file is run via Vercel Postgres dashboard SQL runner OR via
--   node-pg connection from a one-shot migration script. Em does NOT use
--   db_guard.py for Postgres (db_guard is MySQL-only). Anh authorizes
--   each run via keyword "APPROVE DB EXEC UAT".
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Table 1/5: game_players
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_players (
  player_id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clevai_user_id               BIGINT NOT NULL UNIQUE CHECK (clevai_user_id > 0),
  schema_version               SMALLINT NOT NULL DEFAULT 10,

  -- Scalar fields (analytics-queryable)
  hp                           SMALLINT NOT NULL DEFAULT 100 CHECK (hp >= 0),
  max_hp                       SMALLINT NOT NULL DEFAULT 100 CHECK (max_hp >= 0),
  mp                           SMALLINT NOT NULL DEFAULT 50  CHECK (mp >= 0),
  max_mp                       SMALLINT NOT NULL DEFAULT 50  CHECK (max_mp >= 0),
  level                        SMALLINT NOT NULL DEFAULT 1   CHECK (level >= 1),
  exp                          INTEGER NOT NULL DEFAULT 0    CHECK (exp >= 0),
  battle_stars                 INTEGER NOT NULL DEFAULT 0    CHECK (battle_stars >= 0),
  login_streak                 SMALLINT NOT NULL DEFAULT 0   CHECK (login_streak >= 0),
  last_login_anchor_utc7       BIGINT NOT NULL DEFAULT 0,
  loot_jar_battles_since_last  SMALLINT NOT NULL DEFAULT 0   CHECK (loot_jar_battles_since_last >= 0),
  player_name                  VARCHAR(64) DEFAULT NULL,
  gender                       TEXT NOT NULL DEFAULT 'male'  CHECK (gender IN ('male','female')),
  hair_style                   TEXT NOT NULL DEFAULT 'a'     CHECK (hair_style IN ('a','b','c','d')),
  hint_difficulty              TEXT NOT NULL DEFAULT 'medium' CHECK (hint_difficulty IN ('easy','medium','hard')),
  client_nonce                 INTEGER NOT NULL DEFAULT 0    CHECK (client_nonce >= 0),
  position_x                   SMALLINT NOT NULL DEFAULT 0,
  position_y                   SMALLINT NOT NULL DEFAULT 0,
  current_zone_id              VARCHAR(32) DEFAULT NULL,
  last_level_up_at             BIGINT DEFAULT NULL,
  active_pet_instance_id       VARCHAR(64) DEFAULT NULL,
  last_boss_attempt_date       VARCHAR(10) DEFAULT NULL,
  shop_stock_refreshed_at      BIGINT NOT NULL DEFAULT 0,

  -- JSON fields (JSONB for Postgres native indexing + faster queries)
  inventory_json               JSONB NOT NULL,
  equipment_json               JSONB NOT NULL,
  owned_pets_json              JSONB NOT NULL,
  quest_progress_json          JSONB NOT NULL,
  claimed_rewards_json         JSONB NOT NULL,
  quest_cycle_anchors_json     JSONB NOT NULL,
  shop_stock_json              JSONB DEFAULT NULL,
  purchase_history_json        JSONB NOT NULL,
  breeding_chamber_json        JSONB DEFAULT NULL,
  flags_json                   JSONB NOT NULL,
  defeated_boss_ids_json       JSONB NOT NULL,
  claimed_chest_ids_json       JSONB NOT NULL,

  -- Audit + integrity
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  save_hmac                    CHAR(64) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_players_clevai_user_id ON game_players(clevai_user_id);
CREATE INDEX IF NOT EXISTS idx_game_players_level          ON game_players(level);
CREATE INDEX IF NOT EXISTS idx_game_players_updated_at     ON game_players(updated_at);

COMMENT ON TABLE  game_players                              IS 'Phase 5: Per-student game save state. SaveState v10 (Phase 4 LiveOps).';
COMMENT ON COLUMN game_players.clevai_user_id               IS 'FK reference to Clevai auth user (no DB constraint — cross-schema)';
COMMENT ON COLUMN game_players.schema_version               IS 'SaveState schema version; bumped each Phase migration';
COMMENT ON COLUMN game_players.last_login_anchor_utc7       IS 'epoch ms of last UTC+7 midnight when login claimed';
COMMENT ON COLUMN game_players.client_nonce                 IS 'Monotonic counter for replay protection (Phase 3 seam)';
COMMENT ON COLUMN game_players.last_boss_attempt_date       IS 'YYYY-MM-DD UTC+7 anchor for daily boss';
COMMENT ON COLUMN game_players.updated_at                   IS 'Used for optimistic concurrency in /api/save/sync; auto-updated via trigger';
COMMENT ON COLUMN game_players.save_hmac                    IS 'HMAC-SHA-256 of full save blob (anti-tamper)';

-- ----------------------------------------------------------------------------
-- updated_at auto-update trigger (Postgres equivalent of MySQL's
-- `ON UPDATE CURRENT_TIMESTAMP` inline column attribute)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_game_players ON game_players;
CREATE TRIGGER set_updated_at_on_game_players
  BEFORE UPDATE ON game_players
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();


-- ----------------------------------------------------------------------------
-- Table 2/5: game_telemetry_events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_telemetry_events (
  event_id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clevai_user_id          BIGINT NOT NULL CHECK (clevai_user_id > 0),
  event_type              TEXT NOT NULL CHECK (event_type IN (
                            'shop_purchase','breeding_start','breeding_rush','breeding_hatch'
                          )),
  event_ts                BIGINT NOT NULL,
  server_received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json            JSONB NOT NULL,
  client_nonce            INTEGER NOT NULL CHECK (client_nonce >= 0),
  forwarded_to_amplitude  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_game_telemetry_user_ts        ON game_telemetry_events(clevai_user_id, event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_game_telemetry_event_type_ts  ON game_telemetry_events(event_type, event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_game_telemetry_forwarded      ON game_telemetry_events(forwarded_to_amplitude, server_received_at);

COMMENT ON TABLE  game_telemetry_events                       IS 'Phase 5: Append-only telemetry log. Amplitude is replica.';
COMMENT ON COLUMN game_telemetry_events.event_ts              IS 'Client epoch ms (from Telemetry SDK ts field)';
COMMENT ON COLUMN game_telemetry_events.payload_json          IS 'Zod-validated event payload (discriminated union)';
COMMENT ON COLUMN game_telemetry_events.forwarded_to_amplitude IS 'FALSE=pending forward, TRUE=acknowledged by Amplitude';


-- ----------------------------------------------------------------------------
-- Table 3/5: game_breeding_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_breeding_sessions (
  session_id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clevai_user_id                   BIGINT NOT NULL CHECK (clevai_user_id > 0),
  parent_a_instance_id             VARCHAR(64) NOT NULL,
  parent_b_instance_id             VARCHAR(64) NOT NULL,
  started_at                       BIGINT NOT NULL,
  hatch_at                         BIGINT NOT NULL,
  rushed_at                        BIGINT DEFAULT NULL,
  cost_battle_stars                SMALLINT NOT NULL CHECK (cost_battle_stars >= 0),
  rush_cost_paid                   SMALLINT DEFAULT NULL,
  offspring_codename               VARCHAR(32) NOT NULL,
  offspring_rarity                 TEXT NOT NULL CHECK (offspring_rarity IN ('common','rare','epic','legendary')),
  offspring_level                  SMALLINT NOT NULL CHECK (offspring_level >= 1),
  hatched_offspring_instance_id    VARCHAR(64) DEFAULT NULL,
  hatched_at                       BIGINT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_breeding_user_started ON game_breeding_sessions(clevai_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_breeding_active      ON game_breeding_sessions(clevai_user_id, hatched_at);

COMMENT ON TABLE  game_breeding_sessions                       IS 'Phase 5: Server-authoritative breeding sessions (anti-cheat).';
COMMENT ON COLUMN game_breeding_sessions.started_at            IS 'epoch ms when breeding started';
COMMENT ON COLUMN game_breeding_sessions.hatch_at              IS 'epoch ms when egg ready (server-computed)';
COMMENT ON COLUMN game_breeding_sessions.rushed_at             IS 'epoch ms when user rushed (NULL = not rushed)';
COMMENT ON COLUMN game_breeding_sessions.hatched_offspring_instance_id IS 'Set when /api/breed/validate action=hatch fires';


-- ----------------------------------------------------------------------------
-- Table 4/5: game_shop_validation_log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_shop_validation_log (
  log_id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clevai_user_id          BIGINT NOT NULL CHECK (clevai_user_id > 0),
  item_id                 VARCHAR(64) NOT NULL,
  price_charged           SMALLINT NOT NULL CHECK (price_charged >= 0),
  battle_stars_before     INTEGER NOT NULL CHECK (battle_stars_before >= 0),
  battle_stars_after      INTEGER NOT NULL CHECK (battle_stars_after >= 0),
  validated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_nonce            INTEGER NOT NULL CHECK (client_nonce >= 0),
  hmac_verified           BOOLEAN NOT NULL,
  rejected                BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason        VARCHAR(64) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_shop_log_user_time  ON game_shop_validation_log(clevai_user_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_shop_log_rejected   ON game_shop_validation_log(rejected, validated_at DESC);

COMMENT ON TABLE  game_shop_validation_log                  IS 'Phase 5: Forensic-grade purchase audit log.';
COMMENT ON COLUMN game_shop_validation_log.hmac_verified    IS 'TRUE = HMAC matched, FALSE = forged request';
COMMENT ON COLUMN game_shop_validation_log.rejection_reason IS 'NULL when rejected=FALSE; else reason code';


-- ----------------------------------------------------------------------------
-- Table 5/5: game_nonces
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_nonces (
  clevai_user_id          BIGINT NOT NULL CHECK (clevai_user_id > 0),
  client_nonce            INTEGER NOT NULL CHECK (client_nonce >= 0),
  used_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint                VARCHAR(32) NOT NULL,

  PRIMARY KEY (clevai_user_id, client_nonce)
);

CREATE INDEX IF NOT EXISTS idx_game_nonces_used_at ON game_nonces(used_at);

COMMENT ON TABLE  game_nonces           IS 'Phase 5: Replay protection. TTL 7 days via cron.';
COMMENT ON COLUMN game_nonces.endpoint  IS '"/api/shop/validate" | "/api/breed/validate" | "/api/save/sync" | "/api/telemetry"';


COMMIT;

-- ============================================================================
-- §A — Verification queries (em self-verify after migration; SELECT-only)
-- ============================================================================

-- A.1 Confirm 5 tables exist:
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name LIKE 'game_%'
-- ORDER BY table_name;
-- EXPECT 5 rows: game_breeding_sessions, game_nonces, game_players,
--                game_shop_validation_log, game_telemetry_events.

-- A.2 Confirm indexes on game_players:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'game_players' ORDER BY indexname;
-- EXPECT: game_players_clevai_user_id_key (UNIQUE constraint),
--         game_players_pkey, idx_game_players_clevai_user_id,
--         idx_game_players_level, idx_game_players_updated_at.

-- A.3 Confirm JSONB columns:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'game_players'
--   AND data_type = 'jsonb'
-- ORDER BY ordinal_position;
-- EXPECT 12 JSONB columns (inventory, equipment, owned_pets, quest_progress,
--   claimed_rewards, quest_cycle_anchors, shop_stock, purchase_history,
--   breeding_chamber, flags, defeated_boss_ids, claimed_chest_ids).

-- A.4 Sanity insert + rollback (does NOT persist):
-- BEGIN;
-- INSERT INTO game_players (
--   clevai_user_id, inventory_json, equipment_json, owned_pets_json,
--   quest_progress_json, claimed_rewards_json, quest_cycle_anchors_json,
--   purchase_history_json, flags_json, defeated_boss_ids_json, claimed_chest_ids_json
-- ) VALUES (
--   999999999, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb,
--   '{"dailyEpochUtc7":0,"weeklyEpochUtc7":0}'::jsonb,
--   '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb
-- );
-- SELECT clevai_user_id, level, battle_stars, gender, hp, max_hp, created_at, updated_at
--   FROM game_players WHERE clevai_user_id = 999999999;
-- -- EXPECT: 1 row with defaults (level=1, battle_stars=0, gender='male', hp=100, etc.)
-- ROLLBACK;
-- -- Re-run SELECT — should now return 0 rows.

-- A.5 updated_at trigger sanity test (does NOT persist):
-- BEGIN;
-- INSERT INTO game_players (clevai_user_id, inventory_json, equipment_json,
--   owned_pets_json, quest_progress_json, claimed_rewards_json,
--   quest_cycle_anchors_json, purchase_history_json, flags_json,
--   defeated_boss_ids_json, claimed_chest_ids_json) VALUES (
--   888888888, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb,
--   '{"dailyEpochUtc7":0,"weeklyEpochUtc7":0}'::jsonb,
--   '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb);
-- SELECT created_at, updated_at FROM game_players WHERE clevai_user_id = 888888888;
-- -- Both timestamps should equal NOW().
-- -- Wait 1 second, UPDATE:
-- UPDATE game_players SET level = 2 WHERE clevai_user_id = 888888888;
-- SELECT created_at, updated_at FROM game_players WHERE clevai_user_id = 888888888;
-- -- EXPECT: updated_at > created_at (trigger fired)
-- ROLLBACK;


-- ============================================================================
-- §B — Service user (Vercel Postgres native auth)
-- ============================================================================
-- Vercel Postgres exposes connection strings via env vars:
--   POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING,
--   POSTGRES_USER, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE
-- No manual CREATE USER needed — Vercel provisions a single user with
-- full DB privileges. Phase 5 backend uses this user directly during UAT.
--
-- For Sub-phase F (cutover to Clevai MySQL), service user creation
-- happens via the MySQL canonical script (see paired file §B).


-- ============================================================================
-- §C — Rollback script (emergency only; requires "APPROVE DB ROLLBACK")
-- ============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS set_updated_at_on_game_players ON game_players;
-- DROP FUNCTION IF EXISTS trigger_set_updated_at();
-- DROP TABLE IF EXISTS game_nonces;
-- DROP TABLE IF EXISTS game_shop_validation_log;
-- DROP TABLE IF EXISTS game_breeding_sessions;
-- DROP TABLE IF EXISTS game_telemetry_events;
-- DROP TABLE IF EXISTS game_players;
-- COMMIT;


-- ============================================================================
-- End of Postgres UAT migration. Sub-phase F migrates to MySQL.
-- ============================================================================
