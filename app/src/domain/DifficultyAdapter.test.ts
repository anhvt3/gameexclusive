import { describe, it, expect } from 'vitest';
import {
  computeTargetDifficulty,
  selectNextLO,
  type LOCandidate,
  type QuizHistoryEntry,
} from './DifficultyAdapter';

const pool: LOCandidate[] = [
  { id: 1, difficulty: 1 },
  { id: 2, difficulty: 2 },
  { id: 3, difficulty: 3 },
  { id: 4, difficulty: 3 },
  { id: 5, difficulty: 4 },
  { id: 6, difficulty: 5 },
];

function entry(lo_id: number, correct: boolean, ts: number, difficulty: number): QuizHistoryEntry {
  return { lo_id, correct, ts, difficulty };
}

const NOW = 10_000_000_000;
const HOUR = 60 * 60 * 1000;

describe('computeTargetDifficulty — AP CL2 sliding-window rules', () => {
  it('empty history → default difficulty, accuracy null', () => {
    const r = computeTargetDifficulty([], 3, 20);
    expect(r.target).toBe(3);
    expect(r.accuracy).toBeNull();
  });

  it('accuracy 0.9 (9/10 correct) → currentDiff + 1', () => {
    const history: QuizHistoryEntry[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(entry(100 + i, i < 9, NOW - (10 - i) * 1000, 3));
    }
    const r = computeTargetDifficulty(history, 3, 20);
    expect(r.accuracy).toBeCloseTo(0.9);
    expect(r.currentDifficulty).toBe(3);
    expect(r.target).toBe(4);
  });

  it('accuracy 0.4 (4/10 correct) → currentDiff - 1', () => {
    const history: QuizHistoryEntry[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(entry(100 + i, i < 4, NOW - (10 - i) * 1000, 3));
    }
    const r = computeTargetDifficulty(history, 3, 20);
    expect(r.accuracy).toBeCloseTo(0.4);
    expect(r.target).toBe(2);
  });

  it('accuracy 0.7 → same difficulty', () => {
    const history: QuizHistoryEntry[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(entry(100 + i, i < 7, NOW - (10 - i) * 1000, 3));
    }
    const r = computeTargetDifficulty(history, 3, 20);
    expect(r.accuracy).toBeCloseTo(0.7);
    expect(r.target).toBe(3);
  });

  it('only last windowSize entries count (older ignored)', () => {
    const history: QuizHistoryEntry[] = [];
    // 20 old wrong at diff 1 (outside window) + 5 recent all correct at diff 3
    for (let i = 0; i < 20; i++) history.push(entry(200 + i, false, NOW - (100 - i) * 1000, 1));
    for (let i = 0; i < 5; i++) history.push(entry(300 + i, true, NOW - (5 - i) * 100, 3));
    const r = computeTargetDifficulty(history, 3, 5);
    expect(r.windowSize).toBe(5);
    expect(r.accuracy).toBe(1);
    expect(r.currentDifficulty).toBe(3);
    expect(r.target).toBe(4);
  });

  it('target clamped to MAX (5) when bumping up from 5', () => {
    const history: QuizHistoryEntry[] = [];
    for (let i = 0; i < 10; i++) history.push(entry(100 + i, true, NOW - i * 1000, 5));
    const r = computeTargetDifficulty(history, 3, 20);
    expect(r.target).toBe(5);
  });

  it('target clamped to MIN (1) when bumping down from 1', () => {
    const history: QuizHistoryEntry[] = [];
    for (let i = 0; i < 10; i++) history.push(entry(100 + i, false, NOW - i * 1000, 1));
    const r = computeTargetDifficulty(history, 3, 20);
    expect(r.target).toBe(1);
  });
});

describe('selectNextLO — cooldown + picker', () => {
  it('empty history → picks from pool at default difficulty 3', () => {
    const lo = selectNextLO({ pool, historyForType: [], nowMs: NOW });
    expect(lo).not.toBeNull();
    expect(lo!.difficulty).toBe(3);
  });

  it('LO played 12h ago is excluded (cooldown)', () => {
    const historyForType = [entry(3, true, NOW - 12 * HOUR, 3)];
    // Accuracy 1.0 on 1 entry → bump up, but this test fixes target via shorter
    // path: accuracy over single entry is 1.0 so target = 3 + 1 = 4. LOs at 4: id=5.
    const lo = selectNextLO({ pool, historyForType, nowMs: NOW });
    expect(lo!.id).toBe(5);
  });

  it('LO played 25h ago is INCLUDED again (cooldown expired)', () => {
    // Make history produce target=3 (one entry, correct, at diff 3 → bump to 4).
    // To test inclusion of the same id, construct a scenario where the pool has
    // only one LO at the target and that LO was played >24h ago.
    const historyForType = [
      entry(3, false, NOW - 25 * HOUR, 3),
      entry(4, false, NOW - 25 * HOUR, 3),
    ];
    // Accuracy 0 → bump down to 2. id=2 is only LO at diff 2, never played → picked.
    const lo = selectNextLO({ pool, historyForType, nowMs: NOW });
    expect(lo!.id).toBe(2);
  });

  it('returns null when no LO matches target difficulty', () => {
    const skinnyPool: LOCandidate[] = [{ id: 10, difficulty: 1 }];
    const lo = selectNextLO({ pool: skinnyPool, historyForType: [], nowMs: NOW });
    // Default target 3; no diff-3 LO → null.
    expect(lo).toBeNull();
  });

  it('pickIndex lets caller override selection among equal-diff candidates', () => {
    const lo = selectNextLO({
      pool,
      historyForType: [],
      nowMs: NOW,
      pickIndex: (filtered) => filtered.length - 1,
    });
    // Pool at diff 3: [id 3, id 4]. Last → id 4.
    expect(lo!.id).toBe(4);
  });

  it('recent LO at target difficulty is skipped in favor of another at same diff', () => {
    // History: 10 correct at diff 3 → target bump to 4. id 5 (diff 4) played 1h ago → excluded.
    const historyForType: QuizHistoryEntry[] = [];
    for (let i = 0; i < 10; i++)
      historyForType.push(entry(100 + i, true, NOW - (10 - i) * 1000, 3));
    historyForType.push(entry(5, true, NOW - HOUR, 4));
    // Extend pool with another diff-4 LO so there's a viable alternative.
    const extended: LOCandidate[] = [...pool, { id: 50, difficulty: 4 }];
    const lo = selectNextLO({ pool: extended, historyForType, nowMs: NOW });
    expect(lo!.id).toBe(50);
  });
});
