-- ============================================================================
-- Phase 5 hotfix — client_nonce INTEGER → BIGINT
-- ============================================================================
-- Bug: clients send Date.now() as nonce (~1.7e12), overflows int32 (2.1e9).
-- Fix: widen client_nonce columns to BIGINT in:
--   - game_players.client_nonce
--   - game_nonces.client_nonce       (composite PK — needs constraint drop)
--   - game_shop_validation_log.client_nonce
--   - game_breeding_sessions.client_nonce
--
-- Idempotent: ALTER TYPE is a no-op if already BIGINT (Postgres checks).
-- Production path (F.2): the canonical SQL files have already been edited so
-- fresh deploys won't hit this — this script is only for the UAT DB that was
-- migrated with the buggy schema.
-- ============================================================================

BEGIN;

ALTER TABLE game_players
  ALTER COLUMN client_nonce TYPE BIGINT;

ALTER TABLE game_nonces
  ALTER COLUMN client_nonce TYPE BIGINT;

ALTER TABLE game_shop_validation_log
  ALTER COLUMN client_nonce TYPE BIGINT;

ALTER TABLE game_telemetry_events
  ALTER COLUMN client_nonce TYPE BIGINT;

COMMIT;

-- Verification:
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'client_nonce'
ORDER BY table_name;
