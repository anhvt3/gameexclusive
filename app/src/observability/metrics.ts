/**
 * 5 Core Metrics — AP v1.1 Section 6.2 / ISP Step 18.5.
 *
 * Each event has a Zod schema for its dimensions. Emitters parse the
 * payload (throw on shape violation) and persist a JSONL entry to
 * localStorage + console. Phase 3 will flush the queue to Supham.
 *
 * Events (per AP Section 6.2):
 *   game_session_start { grade, day_of_week }
 *   combat_started     { monster_id, grade }
 *   combat_completed   { monster_id, won, duration_ms }
 *   quiz_answered      { quiz_type_id, is_correct, time_spent }
 *   session_end        { duration_ms, quizzes_attempted }
 */

import { z } from 'zod';

export const METRICS_QUEUE_STORAGE_KEY = 'game_ss3_metrics_queue_v1';

const GameSessionStartSchema = z.object({
  grade: z.string(),
  day_of_week: z.number().int().min(0).max(6),
});
const CombatStartedSchema = z.object({
  monster_id: z.number().int().positive(),
  grade: z.string(),
});
const CombatCompletedSchema = z.object({
  monster_id: z.number().int().positive(),
  won: z.boolean(),
  duration_ms: z.number().nonnegative(),
});
const QuizAnsweredSchema = z.object({
  quiz_type_id: z.number().int().nonnegative(),
  is_correct: z.boolean(),
  time_spent: z.number().nonnegative(),
});
const SessionEndSchema = z.object({
  duration_ms: z.number().nonnegative(),
  quizzes_attempted: z.number().int().nonnegative(),
});

export type GameSessionStart = z.infer<typeof GameSessionStartSchema>;
export type CombatStarted = z.infer<typeof CombatStartedSchema>;
export type CombatCompleted = z.infer<typeof CombatCompletedSchema>;
export type QuizAnswered = z.infer<typeof QuizAnsweredSchema>;
export type SessionEnd = z.infer<typeof SessionEndSchema>;

export type MetricName =
  | 'game_session_start'
  | 'combat_started'
  | 'combat_completed'
  | 'quiz_answered'
  | 'session_end';

export interface MetricEntry {
  name: MetricName;
  dims: Record<string, unknown>;
  ts: number;
}

function persist(name: MetricName, dims: Record<string, unknown>): void {
  const entry: MetricEntry = { name, dims, ts: Date.now() };
  try {
    const existing = localStorage.getItem(METRICS_QUEUE_STORAGE_KEY) ?? '';
    localStorage.setItem(METRICS_QUEUE_STORAGE_KEY, existing + JSON.stringify(entry) + '\n');
  } catch {
    // localStorage full / disabled — swallow; Sentry will surface via other path
  }
  console.info('[metrics]', name, dims);
}

export const metrics = {
  gameSessionStart(dims: GameSessionStart): void {
    persist('game_session_start', GameSessionStartSchema.parse(dims));
  },
  combatStarted(dims: CombatStarted): void {
    persist('combat_started', CombatStartedSchema.parse(dims));
  },
  combatCompleted(dims: CombatCompleted): void {
    persist('combat_completed', CombatCompletedSchema.parse(dims));
  },
  quizAnswered(dims: QuizAnswered): void {
    persist('quiz_answered', QuizAnsweredSchema.parse(dims));
  },
  sessionEnd(dims: SessionEnd): void {
    persist('session_end', SessionEndSchema.parse(dims));
  },
};

/** Read queued metric entries (for tests + Phase 3 flush). */
export function readMetricsQueue(): MetricEntry[] {
  const raw = localStorage.getItem(METRICS_QUEUE_STORAGE_KEY) ?? '';
  if (!raw) return [];
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as MetricEntry);
}

export function clearMetricsQueue(): void {
  localStorage.removeItem(METRICS_QUEUE_STORAGE_KEY);
}
