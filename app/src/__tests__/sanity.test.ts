import { describe, it, expect } from 'vitest';
import { eventBus } from '@bus/EventBus';

describe('harness sanity', () => {
  it('1 + 1 === 2', () => {
    expect(1 + 1).toBe(2);
  });

  it('EventBus emits and listens', () => {
    let received: unknown = null;
    const off = eventBus.on('QUIZ_RESULT', (payload) => {
      received = payload;
    });

    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1000, attempts: 1 });

    expect(received).toEqual({ correct: true, timeSpent: 1000, attempts: 1 });
    off();
    eventBus.clear();
  });

  it('EventBus off() prevents further delivery', () => {
    let count = 0;
    const off = eventBus.on('ENTER_COMBAT', () => count++);
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    off();
    eventBus.emit('ENTER_COMBAT', { monster_id: 2 });

    expect(count).toBe(1);
    eventBus.clear();
  });

  it('EventBus swallows listener error and does not propagate', () => {
    const off = eventBus.on('OPEN_QUIZ', () => {
      throw new Error('boom');
    });
    // Should NOT throw — AP 7.1 rule R1
    expect(() => eventBus.emit('OPEN_QUIZ', { lo_id: 1, monster_id: null })).not.toThrow();
    off();
    eventBus.clear();
  });
});
