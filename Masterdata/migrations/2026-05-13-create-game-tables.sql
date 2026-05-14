-- ============================================================================
-- Phase 5 — Game SS3 Backend Tables — Migration Bootstrap
-- ============================================================================
-- Project: Game_SS3_exclusive (Clevai internal Edu-RPG, ~10K students)
-- Author:  Claude (claude/phase5-vercel-mysql-6e685e)
-- Date:    2026-05-13
-- Target:  Clevai MySQL Production (database: clevai_prod)
-- Spec:    docs/superpowers/specs/2026-05-13-phase-5-vercel-mysql-design.md
--
-- ⚠️  IRON RULES per CLAUDE.md:
--   • R1: Google Sheets touched? NO ✅
--   • R2: DELETE/DROP/TRUNCATE? NO (CREATE only) ✅
--   • R3: Scope = `game_*` namespace ONLY ✅
--   • R4: NEVER auto-execute on prod. Anh's DBA runs. ✅
--   • R5: Audit trail → Masterdata/.write_log.md after execution ✅
--   • R6: Plan-Approve-Write gate — anh must approve "APPROVE SQL" before staging dry-run ✅
--   • R7: Post-write report after execution ✅
--   • R8: Self-verify SELECT queries included at bottom of this file ✅
--
-- Execution order:
--   1. Run on STAGING first (`mysql.clevai.vn` staging_s2_bp_log_v2 OR clevai_staging)
--   2. Anh reviews + verifies via SELECT queries at bottom
--   3. Anh's DBA runs on PRODUCTION (clevai_prod)
--   4. Anh's DBA creates service user `game_backend_writer` per §B at bottom
--   5. Service user credentials → Vercel env vars (CLEVAI_DB_USER / CLEVAI_DB_PASS)
-- ============================================================================

START TRANSACTION;

-- ----------------------------------------------------------------------------
-- Table 1/5: game_players
-- Purpose:    Primary save record per Clevai student (1 row / student)
-- Strategy:   Hybrid scalar + JSON. Scalar columns for analytics-queryable
--             fields (level, last_login, total_purchases). JSON for nested
--             arrays (inventory, ownedPets, breedingChamber).
-- Volume:     ~10K rows steady state
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_players (
  player_id                    BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  clevai_user_id               BIGINT UNSIGNED NOT NULL UNIQUE
                               COMMENT 'FK reference to Clevai auth user (no DB constraint — cross-schema)',
  schema_version               TINYINT UNSIGNED NOT NULL DEFAULT 10
                               COMMENT 'SaveState schema version; bumped each Phase migration',

  -- Scalar fields (analytics-queryable)
  hp                           SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  max_hp                       SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  mp                           SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  max_mp                       SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  level                        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  exp                          INT UNSIGNED NOT NULL DEFAULT 0,
  battle_stars                 INT UNSIGNED NOT NULL DEFAULT 0,
  login_streak                 SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_login_anchor_utc7       BIGINT UNSIGNED NOT NULL DEFAULT 0
                               COMMENT 'epoch ms of last UTC+7 midnight when login claimed',
  loot_jar_battles_since_last  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  player_name                  VARCHAR(64) DEFAULT NULL,
  gender                       ENUM('male','female') NOT NULL DEFAULT 'male',
  hair_style                   ENUM('a','b','c','d') NOT NULL DEFAULT 'a',
  hint_difficulty              ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  client_nonce                 INT UNSIGNED NOT NULL DEFAULT 0
                               COMMENT 'Monotonic counter for replay protection (Phase 3 seam)',
  position_x                   SMALLINT NOT NULL DEFAULT 0,
  position_y                   SMALLINT NOT NULL DEFAULT 0,
  current_zone_id              VARCHAR(32) DEFAULT NULL,
  last_level_up_at             BIGINT UNSIGNED DEFAULT NULL,
  active_pet_instance_id       VARCHAR(64) DEFAULT NULL,
  last_boss_attempt_date       VARCHAR(10) DEFAULT NULL
                               COMMENT 'YYYY-MM-DD UTC+7 anchor for daily boss',
  shop_stock_refreshed_at      BIGINT UNSIGNED NOT NULL DEFAULT 0,

  -- JSON fields (denormalized; client-authoritative shapes)
  inventory_json               JSON NOT NULL
                               COMMENT 'InventoryItem[] — [{instanceId, itemId, acquiredAt}, ...]',
  equipment_json               JSON NOT NULL
                               COMMENT 'EquipmentMap — {slot: instanceId | null}',
  owned_pets_json              JSON NOT NULL
                               COMMENT 'PetInstance[] — [{instanceId, petCodename, rarity, level, xp, capturedAt}, ...]',
  quest_progress_json          JSON NOT NULL
                               COMMENT 'Record<questId, number>',
  claimed_rewards_json         JSON NOT NULL
                               COMMENT 'questId[] (Sprint D dedup list)',
  quest_cycle_anchors_json     JSON NOT NULL
                               COMMENT '{dailyEpochUtc7, weeklyEpochUtc7}',
  shop_stock_json              JSON DEFAULT NULL
                               COMMENT 'ShopItemSlot[] | NULL (refreshes daily UTC+7)',
  purchase_history_json        JSON NOT NULL
                               COMMENT 'Record<itemId, count>',
  breeding_chamber_json        JSON DEFAULT NULL
                               COMMENT 'BreedingSession v10 | NULL — {parentA, parentB, startedAt, hatchAt, rushedAt, ...}',
  flags_json                   JSON NOT NULL
                               COMMENT 'Record<flag, boolean>',
  defeated_boss_ids_json       JSON NOT NULL
                               COMMENT 'string[]',
  claimed_chest_ids_json       JSON NOT NULL
                               COMMENT 'string[]',

  -- Audit + integrity
  created_at                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
                               COMMENT 'Used for optimistic concurrency in /api/save/sync',
  save_hmac                    CHAR(64) DEFAULT NULL
                               COMMENT 'HMAC-SHA-256 of full save blob (anti-tamper)',

  INDEX idx_clevai_user_id (clevai_user_id),
  INDEX idx_level           (level),
  INDEX idx_updated_at      (updated_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 5: Per-student game save state. SaveState v10 (Phase 4 LiveOps).';


-- ----------------------------------------------------------------------------
-- Table 2/5: game_telemetry_events
-- Purpose:    Append-only event log (Amplitude replica)
-- Strategy:   Local table = source of truth. Amplitude = forwarded replica.
--             Forwarded flag enables retry of unsent events if Amplitude down.
-- Volume:     ~50 events/student/day × 10K = 500K rows/day. Phase 6+ may
--             partition by month if INSERT throughput becomes bottleneck.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_telemetry_events (
  event_id                BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  clevai_user_id          BIGINT UNSIGNED NOT NULL,
  event_type              ENUM(
                            'shop_purchase',
                            'breeding_start',
                            'breeding_rush',
                            'breeding_hatch'
                          ) NOT NULL,
  event_ts                BIGINT UNSIGNED NOT NULL
                          COMMENT 'Client epoch ms (from Telemetry SDK ts field)',
  server_received_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json            JSON NOT NULL
                          COMMENT 'Zod-validated event payload (discriminated union)',
  client_nonce            INT UNSIGNED NOT NULL,
  forwarded_to_amplitude  TINYINT(1) NOT NULL DEFAULT 0
                          COMMENT '0=pending forward, 1=acknowledged by Amplitude',

  INDEX idx_user_ts        (clevai_user_id, event_ts DESC),
  INDEX idx_event_type_ts  (event_type, event_ts DESC),
  INDEX idx_forwarded      (forwarded_to_amplitude, server_received_at)
                           COMMENT 'For batch retry job in Phase 6'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COMMENT='Phase 5: Append-only telemetry log. Amplitude is replica; this is source of truth.';


-- ----------------------------------------------------------------------------
-- Table 3/5: game_breeding_sessions
-- Purpose:    Server-side breeding state (anti-cheat)
-- Strategy:   Server tracks hatch_at; client cannot lie about wall clock.
--             Rush updates hatch_at = NOW() only if rushed_at IS NULL (single rush).
-- Volume:     1-3 sessions/student/day = ~20K rows/day, keep ~6 months for analytics
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_breeding_sessions (
  session_id                       BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  clevai_user_id                   BIGINT UNSIGNED NOT NULL,
  parent_a_instance_id             VARCHAR(64) NOT NULL,
  parent_b_instance_id             VARCHAR(64) NOT NULL,
  started_at                       BIGINT UNSIGNED NOT NULL
                                   COMMENT 'epoch ms when breeding started',
  hatch_at                         BIGINT UNSIGNED NOT NULL
                                   COMMENT 'epoch ms when egg ready (server-computed)',
  rushed_at                        BIGINT UNSIGNED DEFAULT NULL
                                   COMMENT 'epoch ms when user rushed (NULL = not rushed)',
  cost_battle_stars                SMALLINT UNSIGNED NOT NULL,
  rush_cost_paid                   SMALLINT UNSIGNED DEFAULT NULL,
  offspring_codename               VARCHAR(32) NOT NULL,
  offspring_rarity                 ENUM('common','rare','epic','legendary') NOT NULL,
  offspring_level                  SMALLINT UNSIGNED NOT NULL,
  hatched_offspring_instance_id    VARCHAR(64) DEFAULT NULL
                                   COMMENT 'Set when /api/breed/validate action=hatch fires',
  hatched_at                       BIGINT UNSIGNED DEFAULT NULL
                                   COMMENT 'epoch ms when egg actually hatched',

  INDEX idx_user_started  (clevai_user_id, started_at DESC),
  INDEX idx_active        (clevai_user_id, hatched_at)
                          COMMENT 'WHERE hatched_at IS NULL → active session lookup'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COMMENT='Phase 5: Server-authoritative breeding sessions (anti-cheat).';


-- ----------------------------------------------------------------------------
-- Table 4/5: game_shop_validation_log
-- Purpose:    Purchase audit trail (every validation attempt, success or fail)
-- Strategy:   INSERT-only. No UPDATE. Forensics-grade audit log.
-- Volume:     ~5 validations/student/day × 10K = 50K rows/day
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_shop_validation_log (
  log_id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  clevai_user_id          BIGINT UNSIGNED NOT NULL,
  item_id                 VARCHAR(64) NOT NULL,
  price_charged           SMALLINT UNSIGNED NOT NULL,
  battle_stars_before     INT UNSIGNED NOT NULL,
  battle_stars_after      INT UNSIGNED NOT NULL,
  validated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_nonce            INT UNSIGNED NOT NULL,
  hmac_verified           TINYINT(1) NOT NULL
                          COMMENT '1 = HMAC matched, 0 = forged request',
  rejected                TINYINT(1) NOT NULL DEFAULT 0
                          COMMENT '1 = purchase rejected, 0 = succeeded',
  rejection_reason        VARCHAR(64) DEFAULT NULL
                          COMMENT 'NULL when rejected=0; else "insufficient_stars" / "stock_exhausted" / "hmac_mismatch" / "replay_attempted" / etc.',

  INDEX idx_user_time     (clevai_user_id, validated_at DESC),
  INDEX idx_rejected      (rejected, validated_at DESC)
                          COMMENT 'For fraud detection queries'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COMMENT='Phase 5: Forensic-grade purchase audit log.';


-- ----------------------------------------------------------------------------
-- Table 5/5: game_nonces
-- Purpose:    Replay protection — reject duplicate (user_id, nonce) submissions
-- Strategy:   Composite PK. Cron job DELETE rows older than 7 days nightly.
-- Volume:     ~50 nonces/student/day × 10K × 7 days = ~3.5M rows steady state
--             (after TTL cron stabilizes; without cron grows unbounded).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_nonces (
  clevai_user_id          BIGINT UNSIGNED NOT NULL,
  client_nonce            INT UNSIGNED NOT NULL,
  used_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  endpoint                VARCHAR(32) NOT NULL
                          COMMENT '"/api/shop/validate" | "/api/breed/validate" | "/api/save/sync" | "/api/telemetry"',

  PRIMARY KEY (clevai_user_id, client_nonce),
  INDEX idx_used_at       (used_at)
                          COMMENT 'For nightly TTL cleanup cron (delete where used_at < NOW() - INTERVAL 7 DAY)'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COMMENT='Phase 5: Replay protection. TTL 7 days via cron.';


COMMIT;

-- ============================================================================
-- §A — Verification queries (anh self-verify after migration)
-- ============================================================================

-- A.1 Confirm 5 tables exist with correct collation:
-- SELECT TABLE_NAME, TABLE_COLLATION, TABLE_ROWS, ENGINE
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'clevai_prod'   -- (or 'clevai_staging' for staging dry-run)
--   AND TABLE_NAME LIKE 'game_%'
-- ORDER BY TABLE_NAME;
-- EXPECT 5 rows: game_breeding_sessions, game_nonces, game_players,
--                game_shop_validation_log, game_telemetry_events.
-- All InnoDB + utf8mb4.

-- A.2 Confirm indexes on game_players:
-- SHOW INDEX FROM clevai_prod.game_players;
-- EXPECT: PRIMARY, idx_clevai_user_id (UNIQUE), idx_level, idx_updated_at

-- A.3 Confirm JSON columns valid:
-- SELECT COLUMN_NAME, DATA_TYPE
-- FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA = 'clevai_prod'
--   AND TABLE_NAME = 'game_players'
--   AND DATA_TYPE = 'json';
-- EXPECT 12 JSON columns (inventory, equipment, owned_pets, quest_progress,
--   claimed_rewards, quest_cycle_anchors, shop_stock, purchase_history,
--   breeding_chamber, flags, defeated_boss_ids, claimed_chest_ids).

-- A.4 Sanity insert test (TRANSACTION + ROLLBACK — does NOT persist):
-- START TRANSACTION;
-- INSERT INTO clevai_prod.game_players (
--   clevai_user_id, inventory_json, equipment_json, owned_pets_json,
--   quest_progress_json, claimed_rewards_json, quest_cycle_anchors_json,
--   purchase_history_json, flags_json, defeated_boss_ids_json, claimed_chest_ids_json
-- ) VALUES (
--   999999999, '[]', '{}', '[]', '{}', '[]',
--   '{"dailyEpochUtc7":0,"weeklyEpochUtc7":0}',
--   '{}', '{}', '[]', '[]'
-- );
-- SELECT * FROM clevai_prod.game_players WHERE clevai_user_id = 999999999;
-- ROLLBACK;
-- EXPECT: 1 row returned with defaults populated, then rolled back (verify
-- no permanent row by re-running SELECT — should return 0 rows).


-- ============================================================================
-- §B — Service user creation (RUN SEPARATELY after table creation confirmed)
-- ============================================================================
-- ⚠️  Run AFTER tables exist. Replace '<long-random-password>' with actual
--     secret BEFORE running. Use `openssl rand -base64 32` to generate.
--     Store final password ONLY in Vercel env var CLEVAI_DB_PASS.
-- ============================================================================

-- CREATE USER 'game_backend_writer'@'%' IDENTIFIED BY '<long-random-password>';
--
-- -- Least-privilege GRANTs per Phase 5 spec §4.3:
-- GRANT SELECT, INSERT, UPDATE         ON clevai_prod.game_players              TO 'game_backend_writer'@'%';
-- GRANT SELECT, INSERT                 ON clevai_prod.game_telemetry_events     TO 'game_backend_writer'@'%';
-- GRANT SELECT, INSERT, UPDATE         ON clevai_prod.game_breeding_sessions    TO 'game_backend_writer'@'%';
-- GRANT INSERT                         ON clevai_prod.game_shop_validation_log  TO 'game_backend_writer'@'%';
-- GRANT SELECT, INSERT, DELETE         ON clevai_prod.game_nonces               TO 'game_backend_writer'@'%';
--
-- FLUSH PRIVILEGES;
--
-- -- Verify grants:
-- SHOW GRANTS FOR 'game_backend_writer'@'%';
-- -- EXPECT 6 GRANT lines (1 USAGE + 5 table-level).


-- ============================================================================
-- §C — Rollback script (emergency only; do NOT run unless Phase 5 aborted)
-- ============================================================================
-- ⚠️  WARNING: Destructive. Drops all 5 tables and the service user.
--     Requires R6 anh approval keyword "APPROVE ROLLBACK" before execution.
--     Use only if Phase 5 must be fully reverted post-deploy.
-- ============================================================================

-- DROP USER IF EXISTS 'game_backend_writer'@'%';
-- DROP TABLE IF EXISTS clevai_prod.game_nonces;
-- DROP TABLE IF EXISTS clevai_prod.game_shop_validation_log;
-- DROP TABLE IF EXISTS clevai_prod.game_breeding_sessions;
-- DROP TABLE IF EXISTS clevai_prod.game_telemetry_events;
-- DROP TABLE IF EXISTS clevai_prod.game_players;


-- ============================================================================
-- End of migration file.
-- ============================================================================
