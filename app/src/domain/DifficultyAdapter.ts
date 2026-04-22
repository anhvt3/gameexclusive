/**
 * DifficultyAdapter — AP v1.1 CL2 / ISP v1.1 Step 20.
 *
 * Pure, framework-free adaptive-difficulty picker. Given a candidate LO
 * pool and a history of past quiz answers, decide which LO to serve
 * next so the student is challenged but not stuck:
 *
 *   sliding window of the most-recent N answers for the same quiz_type
 *     → window accuracy
 *   accuracy > 0.85  → bump target difficulty +1
 *   accuracy < 0.50  → bump target difficulty -1
 *   otherwise        → keep current difficulty
 *   empty history    → defaultDifficulty (typically 3)
 *
 * Anti-repeat: LOs answered within `cooldownMs` (default 24h) are
 * excluded from the candidate set even if their difficulty matches.
 *
 * Caller (CombatScene / overlay launcher) is responsible for assembling
 * inputs — joining QuizAnsweredEvent records with LearningObject data —
 * so this module stays pure and testable without IDB or Vite globs.
 */

export interface LOCandidate {
  id: number;
  difficulty: number;
}

export interface QuizHistoryEntry {
  lo_id: number;
  correct: boolean;
  ts: number;
  difficulty: number;
}

export interface SelectNextLOParams {
  /** Candidate LOs already filtered by quiz_type_id + grade. */
  pool: LOCandidate[];
  /** Past answers for the same quiz_type_id; order-independent. */
  historyForType: QuizHistoryEntry[];
  /** Current wall clock (defaults to Date.now()). */
  nowMs?: number;
  /** Sliding-window size (default 20 per AP CL2). */
  windowSize?: number;
  /** Difficulty used when no history is available (default 3). */
  defaultDifficulty?: number;
  /** Cooldown for anti-repeat (default 24h = 86_400_000 ms). */
  cooldownMs?: number;
  /**
   * Deterministic picker for tests. Receives the filtered pool and
   * returns an index; defaults to the first element.
   */
  pickIndex?: (filtered: LOCandidate[]) => number;
}

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const BUMP_UP_THRESHOLD = 0.85;
const BUMP_DOWN_THRESHOLD = 0.5;

function clampDifficulty(value: number): number {
  if (value < MIN_DIFFICULTY) return MIN_DIFFICULTY;
  if (value > MAX_DIFFICULTY) return MAX_DIFFICULTY;
  return value;
}

export interface TargetDifficultyResult {
  target: number;
  windowSize: number;
  accuracy: number | null;
  currentDifficulty: number;
}

export function computeTargetDifficulty(
  historyForType: QuizHistoryEntry[],
  defaultDifficulty: number,
  windowSize: number
): TargetDifficultyResult {
  if (historyForType.length === 0) {
    return {
      target: clampDifficulty(defaultDifficulty),
      windowSize: 0,
      accuracy: null,
      currentDifficulty: clampDifficulty(defaultDifficulty),
    };
  }

  const sorted = [...historyForType].sort((a, b) => a.ts - b.ts);
  const window = sorted.slice(-windowSize);
  const correct = window.filter((e) => e.correct).length;
  const accuracy = correct / window.length;
  const currentDifficulty = window[window.length - 1]!.difficulty;

  let target = currentDifficulty;
  if (accuracy > BUMP_UP_THRESHOLD) target = currentDifficulty + 1;
  else if (accuracy < BUMP_DOWN_THRESHOLD) target = currentDifficulty - 1;

  return {
    target: clampDifficulty(target),
    windowSize: window.length,
    accuracy,
    currentDifficulty,
  };
}

export function selectNextLO(params: SelectNextLOParams): LOCandidate | null {
  const {
    pool,
    historyForType,
    nowMs = Date.now(),
    windowSize = 20,
    defaultDifficulty = 3,
    cooldownMs = 24 * 60 * 60 * 1000,
    pickIndex = () => 0,
  } = params;

  const { target } = computeTargetDifficulty(historyForType, defaultDifficulty, windowSize);

  const recentCutoff = nowMs - cooldownMs;
  const excluded = new Set(historyForType.filter((e) => e.ts >= recentCutoff).map((e) => e.lo_id));

  const filtered = pool.filter((lo) => lo.difficulty === target && !excluded.has(lo.id));
  if (filtered.length === 0) return null;
  const idx = pickIndex(filtered);
  return filtered[idx] ?? null;
}
