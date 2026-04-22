import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { metrics, readMetricsQueue, clearMetricsQueue, METRICS_QUEUE_STORAGE_KEY } from './metrics';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('metrics — 5 typed emitters (AP 6.2)', () => {
  it('gameSessionStart persists entry with name + dims', () => {
    metrics.gameSessionStart({ grade: 'G5', day_of_week: 2 });
    const queue = readMetricsQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.name).toBe('game_session_start');
    expect(queue[0]!.dims).toEqual({ grade: 'G5', day_of_week: 2 });
    expect(typeof queue[0]!.ts).toBe('number');
  });

  it('combatStarted persists', () => {
    metrics.combatStarted({ monster_id: 1, grade: 'G5' });
    expect(readMetricsQueue()[0]!.name).toBe('combat_started');
  });

  it('combatCompleted persists', () => {
    metrics.combatCompleted({ monster_id: 1, won: true, duration_ms: 12345 });
    const entry = readMetricsQueue()[0]!;
    expect(entry.name).toBe('combat_completed');
    expect(entry.dims).toEqual({ monster_id: 1, won: true, duration_ms: 12345 });
  });

  it('quizAnswered persists', () => {
    metrics.quizAnswered({ quiz_type_id: 3, is_correct: true, time_spent: 5.2 });
    expect(readMetricsQueue()[0]!.name).toBe('quiz_answered');
  });

  it('sessionEnd persists', () => {
    metrics.sessionEnd({ duration_ms: 90000, quizzes_attempted: 7 });
    expect(readMetricsQueue()[0]!.name).toBe('session_end');
  });

  it('multiple events queue in JSONL order', () => {
    metrics.combatStarted({ monster_id: 1, grade: 'G5' });
    metrics.quizAnswered({ quiz_type_id: 3, is_correct: false, time_spent: 8 });
    metrics.combatCompleted({ monster_id: 1, won: false, duration_ms: 30000 });
    const queue = readMetricsQueue();
    expect(queue.map((e) => e.name)).toEqual([
      'combat_started',
      'quiz_answered',
      'combat_completed',
    ]);
  });

  it('clearMetricsQueue removes stored entries', () => {
    metrics.gameSessionStart({ grade: 'G5', day_of_week: 1 });
    expect(readMetricsQueue()).toHaveLength(1);
    clearMetricsQueue();
    expect(readMetricsQueue()).toHaveLength(0);
    expect(localStorage.getItem(METRICS_QUEUE_STORAGE_KEY)).toBeNull();
  });
});

describe('metrics — Zod validation rejects malformed dims', () => {
  it('gameSessionStart throws on invalid day_of_week (>6)', () => {
    expect(() => metrics.gameSessionStart({ grade: 'G5', day_of_week: 9 })).toThrow();
  });

  it('combatStarted throws on non-positive monster_id', () => {
    expect(() => metrics.combatStarted({ monster_id: 0, grade: 'G5' })).toThrow();
  });

  it('combatCompleted throws on negative duration', () => {
    expect(() => metrics.combatCompleted({ monster_id: 1, won: true, duration_ms: -1 })).toThrow();
  });

  it('quizAnswered throws on negative time_spent', () => {
    expect(() =>
      metrics.quizAnswered({ quiz_type_id: 3, is_correct: true, time_spent: -0.1 })
    ).toThrow();
  });

  it('sessionEnd throws on non-integer quizzes_attempted', () => {
    expect(() => metrics.sessionEnd({ duration_ms: 1000, quizzes_attempted: 1.5 })).toThrow();
  });
});
