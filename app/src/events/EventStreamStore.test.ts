import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  appendEvent,
  readAllEvents,
  readEventsByType,
  clearEventStream,
  GameStreamEventSchema,
  type QuizAnsweredEvent,
} from './EventStreamStore';

beforeEach(async () => {
  await clearEventStream();
});

describe('EventStreamStore — append + read', () => {
  it('appendEvent quiz_answered persists with auto idempotencyKey + ts', async () => {
    const res = await appendEvent({
      type: 'quiz_answered',
      lo_id: 100001,
      quiz_type_id: 3,
      correct: true,
      time_spent: 4.2,
      attempts: 1,
    });
    expect(res.status).toBe('appended');
    const all = await readAllEvents();
    expect(all).toHaveLength(1);
    expect(all[0]!.type).toBe('quiz_answered');
    expect(typeof all[0]!.idempotencyKey).toBe('string');
    expect(all[0]!.ts).toBeGreaterThan(0);
  });

  it('appendEvent combat_started persists', async () => {
    await appendEvent({ type: 'combat_started', monster_id: 1 });
    const list = await readEventsByType('combat_started');
    expect(list).toHaveLength(1);
    expect(list[0]!.monster_id).toBe(1);
  });

  it('appendEvent combat_completed persists with won/duration', async () => {
    await appendEvent({
      type: 'combat_completed',
      monster_id: 4,
      won: true,
      duration_ms: 12000,
    });
    const list = await readEventsByType('combat_completed');
    expect(list[0]).toMatchObject({ monster_id: 4, won: true, duration_ms: 12000 });
  });

  it('duplicate idempotencyKey returns {status: duplicate} (no dup row)', async () => {
    const key = 'fixed-key-123';
    const first = await appendEvent({
      type: 'quiz_answered',
      idempotencyKey: key,
      lo_id: 100001,
      quiz_type_id: 3,
      correct: true,
      time_spent: 1,
      attempts: 1,
    });
    expect(first.status).toBe('appended');
    const second = await appendEvent({
      type: 'quiz_answered',
      idempotencyKey: key,
      lo_id: 100001,
      quiz_type_id: 3,
      correct: false, // different payload, same key → treated as dup
      time_spent: 5,
      attempts: 2,
    });
    expect(second.status).toBe('duplicate');
    const all = await readAllEvents();
    expect(all).toHaveLength(1);
  });

  it('readAllEvents returns events sorted ascending by ts', async () => {
    await appendEvent({ type: 'combat_started', monster_id: 1, ts: 1000 });
    await appendEvent({
      type: 'quiz_answered',
      lo_id: 100001,
      quiz_type_id: 3,
      correct: true,
      time_spent: 1,
      attempts: 1,
      ts: 500,
    });
    await appendEvent({
      type: 'combat_completed',
      monster_id: 1,
      won: true,
      duration_ms: 1000,
      ts: 2000,
    });
    const all = await readAllEvents();
    expect(all.map((e) => e.ts)).toEqual([500, 1000, 2000]);
  });

  it('readEventsByType filters via by-type index', async () => {
    await appendEvent({ type: 'combat_started', monster_id: 1 });
    await appendEvent({ type: 'combat_started', monster_id: 4 });
    await appendEvent({
      type: 'quiz_answered',
      lo_id: 100001,
      quiz_type_id: 3,
      correct: true,
      time_spent: 1,
      attempts: 1,
    });
    const starts = await readEventsByType('combat_started');
    const quizzes = await readEventsByType('quiz_answered');
    expect(starts).toHaveLength(2);
    expect(quizzes).toHaveLength(1);
  });

  it('clearEventStream empties the store', async () => {
    await appendEvent({ type: 'combat_started', monster_id: 1 });
    expect((await readAllEvents()).length).toBeGreaterThan(0);
    await clearEventStream();
    expect(await readAllEvents()).toEqual([]);
  });
});

describe('EventStreamStore — Zod validation rejects malformed', () => {
  it('throws when quiz_answered lo_id not positive', async () => {
    await expect(
      appendEvent({
        type: 'quiz_answered',
        lo_id: 0,
        quiz_type_id: 3,
        correct: true,
        time_spent: 1,
        attempts: 1,
      })
    ).rejects.toThrow();
  });

  it('throws when combat_completed duration negative', async () => {
    await expect(
      appendEvent({
        type: 'combat_completed',
        monster_id: 1,
        won: true,
        duration_ms: -10,
      })
    ).rejects.toThrow();
  });

  it('discriminated union rejects unknown type', () => {
    const bad = {
      type: 'mystery_event',
      idempotencyKey: 'x',
      ts: 1,
    };
    expect(() => GameStreamEventSchema.parse(bad)).toThrow();
  });

  it('quiz_answered requires attempts >= 1', async () => {
    const bad: Partial<QuizAnsweredEvent> & { type: 'quiz_answered' } = {
      type: 'quiz_answered',
      lo_id: 100001,
      quiz_type_id: 3,
      correct: true,
      time_spent: 1,
      attempts: 0,
    };
    await expect(appendEvent(bad as never)).rejects.toThrow();
  });
});
