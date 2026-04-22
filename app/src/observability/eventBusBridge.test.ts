import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { eventBus } from '@bus/EventBus';
import { wireEventBusObservability } from './eventBusBridge';
import { readMetricsQueue, clearMetricsQueue } from './metrics';
import { initSentry, __resetSentryForTests } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

beforeEach(() => {
  eventBus.clear();
  clearMetricsQueue();
  __resetSentryForTests();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('eventBusBridge — metrics wiring', () => {
  it('ENTER_COMBAT emits combat_started metric', () => {
    const off = wireEventBusObservability();
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    const q = readMetricsQueue();
    expect(q).toHaveLength(1);
    expect(q[0]!.name).toBe('combat_started');
    expect(q[0]!.dims).toMatchObject({ monster_id: 1, grade: 'G5' });
    off();
  });

  it('EXIT_COMBAT emits combat_completed with duration_ms', async () => {
    const off = wireEventBusObservability();
    eventBus.emit('ENTER_COMBAT', { monster_id: 4 });
    await new Promise((r) => setTimeout(r, 5));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 42, monster_id: 4 });
    const completed = readMetricsQueue().find((e) => e.name === 'combat_completed');
    expect(completed).toBeDefined();
    expect(completed!.dims).toMatchObject({ monster_id: 4, won: true });
    expect((completed!.dims as { duration_ms: number }).duration_ms).toBeGreaterThanOrEqual(0);
    off();
  });

  it('EXIT_COMBAT with null monster_id is skipped (no metric)', () => {
    const off = wireEventBusObservability();
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: null });
    expect(readMetricsQueue().filter((e) => e.name === 'combat_completed')).toHaveLength(0);
    off();
  });

  it('QUIZ_RESULT emits quiz_answered with resolved quiz_type_id', () => {
    const off = wireEventBusObservability();
    // lo_id 100001 = multiple_choice_math_g5.json → quiz_type_id 3
    eventBus.emit('QUIZ_RESULT', {
      correct: true,
      timeSpent: 4.5,
      attempts: 1,
      lo_id: 100001,
    });
    const entry = readMetricsQueue().find((e) => e.name === 'quiz_answered');
    expect(entry).toBeDefined();
    expect(entry!.dims).toMatchObject({
      quiz_type_id: 3,
      is_correct: true,
      time_spent: 4.5,
    });
    off();
  });

  it('QUIZ_RESULT without lo_id falls back to quiz_type_id=0', () => {
    const off = wireEventBusObservability();
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 1, attempts: 1 });
    const entry = readMetricsQueue().find((e) => e.name === 'quiz_answered');
    expect(entry!.dims).toMatchObject({ quiz_type_id: 0, is_correct: false });
    off();
  });

  it('cleanup unsubscribes all listeners (no leak)', () => {
    const before = eventBus.getListenerCount();
    const off = wireEventBusObservability();
    expect(eventBus.getListenerCount()).toBe(before + 3);
    off();
    expect(eventBus.getListenerCount()).toBe(before);
  });
});

describe('eventBusBridge — Sentry error reporter wiring', () => {
  it('listener error during emit → captureException called when Sentry init', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.io/1');
    initSentry();
    const off = wireEventBusObservability();
    eventBus.on('ENTER_COMBAT', () => {
      throw new Error('boom');
    });
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { eventType: 'ENTER_COMBAT' },
    });
    off();
  });

  it('cleanup removes error reporter (no Sentry call after off)', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.io/1');
    initSentry();
    const off = wireEventBusObservability();
    off();
    eventBus.on('ENTER_COMBAT', () => {
      throw new Error('after cleanup');
    });
    eventBus.emit('ENTER_COMBAT', { monster_id: 1 });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
