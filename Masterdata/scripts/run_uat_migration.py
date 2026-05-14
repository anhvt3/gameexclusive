#!/usr/bin/env python3
"""
run_uat_migration.py — Phase 5 Sub-phase A.4: Execute Postgres migration on
Vercel Postgres UAT DB.

Reads POSTGRES_URL_NON_POOLING from env (non-pooler avoids pgbouncer
prepared-statement issues during DDL). Runs the entire SQL file inside a
single transaction; rolls back if any statement fails.

After successful migration, runs §A verification queries and prints results.

⚠️ Per IRON RULES (CLAUDE.md): only run with anh's explicit "APPROVE DB EXEC UAT"
keyword. This script does NOT auto-execute on import.

Usage:
  $env:POSTGRES_URL_NON_POOLING = "postgres://...non-pooler...neon.tech/neondb?sslmode=require"
  python Masterdata/scripts/run_uat_migration.py path/to/postgres.sql

Exit codes:
  0  = migration + verification PASS
  1  = SQL execution failed (transaction rolled back)
  2  = verification query mismatch (manual investigation needed)
  3  = missing env var or arg
"""

from __future__ import annotations

import os
import sys
import re
from pathlib import Path

# Reconfigure stdout/stderr to UTF-8 for emoji output on Windows cp1252.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import psycopg


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def redact_url(url: str) -> str:
    """Mask password in URL for safe printing."""
    return re.sub(r'(://[^:]+:)([^@]+)(@)', r'\1***REDACTED***\3', url)


def err(msg: str) -> None:
    print(f'❌ {msg}', file=sys.stderr)


def ok(msg: str) -> None:
    print(f'✅ {msg}')


def info(msg: str) -> None:
    print(f'ℹ️  {msg}')


# ----------------------------------------------------------------------------
# Migration runner
# ----------------------------------------------------------------------------

def run_migration(conn: psycopg.Connection, sql_file: Path) -> int:
    """Run the SQL file inside a transaction. Returns 0 on success, 1 on error."""
    sql_text = sql_file.read_text(encoding='utf-8')
    info(f'Reading {sql_file.name}: {len(sql_text)} chars')

    # Strip our outer BEGIN/COMMIT — psycopg manages transaction automatically
    # so the file's own BEGIN/COMMIT would be redundant (or cause errors when
    # executed inside an active transaction).
    sql_text = re.sub(r'^\s*BEGIN\s*;?\s*$', '', sql_text, count=1, flags=re.MULTILINE | re.IGNORECASE)
    sql_text = re.sub(r'^\s*COMMIT\s*;?\s*$', '', sql_text, count=1, flags=re.MULTILINE | re.IGNORECASE)

    try:
        with conn.cursor() as cur:
            info('Executing migration SQL (transaction started)...')
            cur.execute(sql_text)
            conn.commit()
            ok('Migration committed.')
            return 0
    except Exception as e:
        conn.rollback()
        err(f'Migration failed; transaction rolled back. Error: {e}')
        return 1


# ----------------------------------------------------------------------------
# §A verification queries
# ----------------------------------------------------------------------------

VERIFICATION_QUERIES = [
    (
        'A.1: 5 game_* tables exist',
        """
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'game_%'
        ORDER BY table_name;
        """,
    ),
    (
        'A.2: Indexes on game_players',
        """
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'game_players'
        ORDER BY indexname;
        """,
    ),
    (
        'A.3: JSONB columns in game_players (expect 12)',
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'game_players'
          AND data_type = 'jsonb'
        ORDER BY ordinal_position;
        """,
    ),
    (
        'A.4: Trigger exists (set_updated_at_on_game_players)',
        """
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND event_object_table = 'game_players';
        """,
    ),
    (
        'A.5: Function exists (trigger_set_updated_at)',
        """
        SELECT routine_name, routine_type, data_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'trigger_set_updated_at';
        """,
    ),
    (
        'A.6: Row counts (all should be 0)',
        """
        SELECT
          (SELECT COUNT(*) FROM game_players)              AS players,
          (SELECT COUNT(*) FROM game_telemetry_events)     AS telemetry,
          (SELECT COUNT(*) FROM game_breeding_sessions)    AS breeding,
          (SELECT COUNT(*) FROM game_shop_validation_log)  AS shop_log,
          (SELECT COUNT(*) FROM game_nonces)               AS nonces;
        """,
    ),
]


def run_verifications(conn: psycopg.Connection) -> int:
    """Run §A queries and print results. Returns 0 if all queries succeed."""
    all_ok = True
    for label, query in VERIFICATION_QUERIES:
        print(f'\n--- {label} ---')
        try:
            with conn.cursor() as cur:
                cur.execute(query)
                cols = [d.name for d in cur.description] if cur.description else []
                rows = cur.fetchall()
                if not rows:
                    print('  (no rows)')
                    continue
                # Print column headers
                widths = [max(len(c), max((len(str(r[i])) for r in rows), default=0)) for i, c in enumerate(cols)]
                print('  ' + ' | '.join(c.ljust(w) for c, w in zip(cols, widths)))
                print('  ' + '-+-'.join('-' * w for w in widths))
                for row in rows:
                    print('  ' + ' | '.join(str(v).ljust(w) for v, w in zip(row, widths)))
        except Exception as e:
            err(f'Query failed: {e}')
            all_ok = False
    return 0 if all_ok else 2


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

def main() -> int:
    if len(sys.argv) < 2:
        err('Usage: python run_uat_migration.py <path-to-postgres.sql>')
        return 3
    sql_path = Path(sys.argv[1])
    if not sql_path.exists():
        err(f'SQL file not found: {sql_path}')
        return 3

    url = os.environ.get('POSTGRES_URL_NON_POOLING')
    if not url:
        err('POSTGRES_URL_NON_POOLING env var not set.')
        err('Set it before running:')
        err('  $env:POSTGRES_URL_NON_POOLING = "postgres://...neon.tech/neondb?sslmode=require"')
        return 3

    info(f'Connecting to: {redact_url(url)}')
    try:
        with psycopg.connect(url, autocommit=False) as conn:
            ok('Connected.')
            rc = run_migration(conn, sql_path)
            if rc != 0:
                return rc

            print('\n' + '=' * 70)
            print('§A VERIFICATION QUERIES')
            print('=' * 70)
            return run_verifications(conn)
    except Exception as e:
        err(f'Connection failed: {e}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
