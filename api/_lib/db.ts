/**
 * api/_lib/db.ts — Driver abstraction layer (Phase 5).
 *
 * Switches between Postgres (UAT) and MySQL (staging/prod) via DB_DIALECT
 * env var. Both drivers expose the SAME query() interface, normalizing:
 *   - Parameter placeholders: `$1, $2` (pg) vs `?, ?` (mysql2)
 *   - JSON return shape: JSONB returns parsed objects (pg) vs strings (mysql2)
 *   - Upsert syntax: caller uses `formatUpsert()` helper for portable SQL
 *
 * Cold-start singleton: pool created once per Lambda instance. Vercel
 * Serverless reuses warm instances → pool reused → minimal connection churn.
 */

import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import type { Pool as MysqlPool } from 'mysql2/promise';

export type Dialect = 'postgres' | 'mysql';

export const DIALECT: Dialect = (process.env.DB_DIALECT === 'mysql' ? 'mysql' : 'postgres');

// Cached pool singleton across Lambda invocations
let cachedPgPool: PgPool | null = null;
let cachedMysqlPool: MysqlPool | null = null;

async function getPgPool(): Promise<PgPool> {
  if (cachedPgPool) return cachedPgPool;
  const { Pool } = await import('pg');
  const connString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!connString) {
    throw new Error('Phase 5 db.ts: POSTGRES_URL_NON_POOLING / POSTGRES_URL env var not set');
  }
  cachedPgPool = new Pool({
    connectionString: connString,
    max: 1,                        // Serverless: 1 connection per cold start
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  return cachedPgPool;
}

async function getMysqlPool(): Promise<MysqlPool> {
  if (cachedMysqlPool) return cachedMysqlPool;
  const mysql = await import('mysql2/promise');
  const config = {
    host: process.env.CLEVAI_DB_HOST,
    port: Number(process.env.CLEVAI_DB_PORT ?? 3306),
    user: process.env.CLEVAI_DB_USER,
    password: process.env.CLEVAI_DB_PASS,
    database: process.env.CLEVAI_DB_NAME,
    connectionLimit: 1,
    connectTimeout: 10_000,
  };
  if (!config.host || !config.user) {
    throw new Error('Phase 5 db.ts: CLEVAI_DB_* env vars not set');
  }
  cachedMysqlPool = mysql.createPool(config);
  return cachedMysqlPool;
}

/**
 * Execute a query with dialect-aware parameter placeholders.
 *
 * Input SQL uses `?` placeholders (mysql2 convention). For Postgres mode,
 * we convert `?` → `$1, $2, ...` automatically. Caller passes params as
 * positional array.
 *
 * Returns `{ rows, rowCount }` normalized across drivers.
 */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

function convertPlaceholders(sql: string): string {
  // ? → $1, $2, ... (Postgres style)
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (DIALECT === 'postgres') {
    const pool = await getPgPool();
    const result = await pool.query(convertPlaceholders(sql), params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } else {
    const pool = await getMysqlPool();
    // mysql2 expects ExecuteValues[]; cast unknown[] is safe since the
    // driver serializes anything stringifiable.
    const [rows] = await pool.execute(sql, params as unknown as (string | number | null)[]);
    // mysql2 returns row arrays for SELECT but ResultSetHeader for
    // INSERT/UPDATE/DELETE. Normalize both into the QueryResult shape so
    // callers (cron cleanup, etc.) get a consistent rowCount.
    if (Array.isArray(rows)) {
      return { rows: rows as T[], rowCount: rows.length };
    }
    const header = rows as unknown as { affectedRows?: number };
    return { rows: [] as T[], rowCount: header.affectedRows ?? 0 };
  }
}

/**
 * Format an UPSERT statement for the active dialect.
 *
 * @param table - target table
 * @param insertCols - columns in INSERT
 * @param updateCols - columns to update on conflict (excluding PK)
 * @param conflictCol - the unique column to detect conflict on
 *
 * Postgres: `INSERT ... ON CONFLICT (col) DO UPDATE SET ...`
 * MySQL:    `INSERT ... ON DUPLICATE KEY UPDATE ...`
 */
export function formatUpsert(
  table: string,
  insertCols: string[],
  updateCols: string[],
  _conflictCol: string,
): string {
  const placeholders = insertCols.map(() => '?').join(', ');
  const colsList = insertCols.join(', ');
  if (DIALECT === 'postgres') {
    const updates = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    return `INSERT INTO ${table} (${colsList}) VALUES (${placeholders}) ON CONFLICT (${_conflictCol}) DO UPDATE SET ${updates}`;
  } else {
    const updates = updateCols.map((c) => `${c} = VALUES(${c})`).join(', ');
    return `INSERT INTO ${table} (${colsList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  }
}

/**
 * Parse JSON column value. Postgres JSONB → already parsed object.
 * MySQL JSON → string that needs JSON.parse().
 */
export function parseJsonColumn<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return value as T; }
  }
  return value as T;
}

/**
 * Serialize a value for JSON column INSERT. Both pg + mysql2 accept
 * `JSON.stringify(obj)` as a string and store correctly.
 */
export function serializeJsonForInsert(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Health check: SELECT 1.
 */
export async function ping(): Promise<{ ok: boolean; dialect: Dialect; error?: string }> {
  try {
    await query('SELECT 1');
    return { ok: true, dialect: DIALECT };
  } catch (e) {
    return { ok: false, dialect: DIALECT, error: String(e) };
  }
}
