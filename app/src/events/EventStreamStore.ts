/**
 * EventStreamStore — AP v1.1 §3.3 event layer / ISP v1.1 Step 19.
 *
 * Append-only event log persisted to IndexedDB via `idb`. Events carry
 * an `idempotencyKey` (auto-generated uuid when not supplied) so replays
 * and retries can't produce duplicates — matching AP error map E6
 * (ConflictError → treat-as-success).
 *
 * Three Phase 1 event types as a discriminated union:
 *   quiz_answered    — emitted on every QUIZ_RESULT
 *   combat_started   — emitted on every ENTER_COMBAT
 *   combat_completed — emitted on every EXIT_COMBAT
 *
 * Schemas are Zod-validated *before* append so malformed payloads fail
 * loud in dev instead of poisoning the queue.
 *
 * HMAC signing (AP §3.3) is CEO TODO #3 — tracked under EventQueue HMAC
 * integration; will wrap append() in a follow-up step.
 */

import { openDB, type IDBPDatabase } from 'idb';
import { z } from 'zod';

export const EVENT_DB_NAME = 'game_ss3_event_stream';
export const EVENT_STORE = 'events';
export const EVENT_DB_VERSION = 1;

const BaseFields = z.object({
  idempotencyKey: z.string().min(1),
  ts: z.number().int().nonnegative(),
});

export const QuizAnsweredEventSchema = BaseFields.extend({
  type: z.literal('quiz_answered'),
  lo_id: z.number().int().positive(),
  quiz_type_id: z.number().int().nonnegative(),
  correct: z.boolean(),
  time_spent: z.number().nonnegative(),
  attempts: z.number().int().positive(),
});

export const CombatStartedEventSchema = BaseFields.extend({
  type: z.literal('combat_started'),
  monster_id: z.number().int().positive(),
});

export const CombatCompletedEventSchema = BaseFields.extend({
  type: z.literal('combat_completed'),
  monster_id: z.number().int().positive(),
  won: z.boolean(),
  duration_ms: z.number().nonnegative(),
});

export const GameStreamEventSchema = z.discriminatedUnion('type', [
  QuizAnsweredEventSchema,
  CombatStartedEventSchema,
  CombatCompletedEventSchema,
]);

export type QuizAnsweredEvent = z.infer<typeof QuizAnsweredEventSchema>;
export type CombatStartedEvent = z.infer<typeof CombatStartedEventSchema>;
export type CombatCompletedEvent = z.infer<typeof CombatCompletedEventSchema>;
export type GameStreamEvent = z.infer<typeof GameStreamEventSchema>;

interface EventStreamSchema extends Record<string, unknown> {
  [EVENT_STORE]: {
    key: string;
    value: GameStreamEvent;
    indexes: { 'by-type': string; 'by-ts': number };
  };
}

export async function openEventDB(): Promise<IDBPDatabase<EventStreamSchema>> {
  return openDB<EventStreamSchema>(EVENT_DB_NAME, EVENT_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(EVENT_STORE)) {
        const store = db.createObjectStore(EVENT_STORE, { keyPath: 'idempotencyKey' });
        store.createIndex('by-type', 'type');
        store.createIndex('by-ts', 'ts');
      }
    },
  });
}

function genKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export type AppendInput =
  | (Omit<QuizAnsweredEvent, 'idempotencyKey' | 'ts'> &
      Partial<Pick<GameStreamEvent, 'idempotencyKey' | 'ts'>>)
  | (Omit<CombatStartedEvent, 'idempotencyKey' | 'ts'> &
      Partial<Pick<GameStreamEvent, 'idempotencyKey' | 'ts'>>)
  | (Omit<CombatCompletedEvent, 'idempotencyKey' | 'ts'> &
      Partial<Pick<GameStreamEvent, 'idempotencyKey' | 'ts'>>);

export type AppendResult =
  | { status: 'appended'; event: GameStreamEvent }
  | { status: 'duplicate'; key: string };

/**
 * Append an event. Missing idempotencyKey/ts are filled in. Duplicate
 * keys are silently treated as success (AP error map E6 ConflictError
 * policy).
 */
export async function appendEvent(input: AppendInput): Promise<AppendResult> {
  const event = GameStreamEventSchema.parse({
    ...input,
    idempotencyKey: input.idempotencyKey ?? genKey(),
    ts: input.ts ?? Date.now(),
  });
  const db = await openEventDB();
  try {
    const existing = await db.get(EVENT_STORE, event.idempotencyKey);
    if (existing) {
      return { status: 'duplicate', key: event.idempotencyKey };
    }
    await db.put(EVENT_STORE, event);
    return { status: 'appended', event };
  } finally {
    db.close();
  }
}

/** Read all events sorted by timestamp ascending. */
export async function readAllEvents(): Promise<GameStreamEvent[]> {
  const db = await openEventDB();
  try {
    const all = await db.getAllFromIndex(EVENT_STORE, 'by-ts');
    return all;
  } finally {
    db.close();
  }
}

/** Read events of a given type (uses by-type index). */
export async function readEventsByType<T extends GameStreamEvent['type']>(
  type: T
): Promise<Extract<GameStreamEvent, { type: T }>[]> {
  const db = await openEventDB();
  try {
    const all = await db.getAllFromIndex(EVENT_STORE, 'by-type', type);
    return all as Extract<GameStreamEvent, { type: T }>[];
  } finally {
    db.close();
  }
}

export async function clearEventStream(): Promise<void> {
  const db = await openEventDB();
  try {
    await db.clear(EVENT_STORE);
  } finally {
    db.close();
  }
}
