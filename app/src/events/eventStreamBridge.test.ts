import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '@bus/EventBus';
import { wireEventStream } from './eventStreamBridge';
import { readAllEvents, readEventsByType, clearEventStream } from './EventStreamStore';

async function flush(): Promise<void> {
  // Let the internal append queue drain. Each event does one get + one put
  // on fake-indexeddb, so a handful of microtasks is enough.
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

beforeEach(async () => {
  eventBus.clear();
  await clearEventStream();
});

describe('eventStreamBridge — persists runtime events', () => {
  it('QUIZ_RESULT appends quiz_answered with resolved quiz_type_id', async () => {
    const off = wireEventStream();
    eventBus.emit('QUIZ_RESULT', {
      correct: true,
      timeSpent: 3.4,
      attempts: 1,
      lo_id: 100001, // multiple_choice_math_g5 → quiz_type_id 3
    });
    await flush();
    const events = await readEventsByType('quiz_answered');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'quiz_answered',
      lo_id: 100001,
      quiz_type_id: 3,
      correct: true,
      time_spent: 3.4,
      attempts: 1,
    });
    off();
  });

  it('QUIZ_RESULT without lo_id is skipped (not appended)', async () => {
    const off = wireEventStream();
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1 });
    await flush();
    expect(await readEventsByType('quiz_answered')).toHaveLength(0);
    off();
  });

  it('ENTER_COMBAT appends combat_started', async () => {
    const off = wireEventStream();
    eventBus.emit('ENTER_COMBAT', { monster_id: 7 });
    await flush();
    const events = await readEventsByType('combat_started');
    expect(events).toHaveLength(1);
    expect(events[0]!.monster_id).toBe(7);
    off();
  });

  it('EXIT_COMBAT appends combat_completed with duration_ms', async () => {
    const off = wireEventStream();
    eventBus.emit('ENTER_COMBAT', { monster_id: 4 });
    await flush();
    await new Promise((r) => setTimeout(r, 5));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 42, monster_id: 4 });
    await flush();
    const events = await readEventsByType('combat_completed');
    expect(events).toHaveLength(1);
    expect(events[0]!.won).toBe(true);
    expect(events[0]!.duration_ms).toBeGreaterThanOrEqual(0);
    off();
  });

  it('EXIT_COMBAT with null monster_id is skipped', async () => {
    const off = wireEventStream();
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: null });
    await flush();
    expect(await readEventsByType('combat_completed')).toHaveLength(0);
    off();
  });

  it('full combat round appends 3 events in order', async () => {
    const off = wireEventStream();
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    eventBus.emit('QUIZ_RESULT', {
      correct: true,
      timeSpent: 2,
      attempts: 1,
      lo_id: 100001,
    });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 40, monster_id: 1 });
    await flush();
    const all = await readAllEvents();
    expect(all.map((e) => e.type)).toEqual(['combat_started', 'quiz_answered', 'combat_completed']);
    off();
  });

  it('cleanup unsubscribes all listeners', () => {
    const before = eventBus.getListenerCount();
    const off = wireEventStream();
    expect(eventBus.getListenerCount()).toBe(before + 3);
    off();
    expect(eventBus.getListenerCount()).toBe(before);
  });
});
