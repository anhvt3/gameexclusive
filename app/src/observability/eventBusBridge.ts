/**
 * EventBus ↔ observability bridge — ISP v1.1 Step 18.5.
 *
 * Wires the pure EventBus to the side-effectful observability layer:
 *   - Sentry: EventBus listener errors → captureException
 *   - Metrics: ENTER_COMBAT → combat_started
 *              EXIT_COMBAT  → combat_completed (duration_ms)
 *              QUIZ_RESULT  → quiz_answered
 *
 * game_session_start + session_end fire from app shell lifecycle (Step 21).
 * wireEventBusObservability() returns a cleanup function that unsubscribes
 * everything — call on app unmount.
 */

import { eventBus, setEventBusErrorReporter, type Unsubscribe } from '@bus/EventBus';
import { findLOById } from '@data/supham/LearningObjectAdapter';
import { captureException } from './sentry';
import { metrics } from './metrics';

// Stub until Step 21 reads student grade from profile / auth.
const DEFAULT_GRADE = 'G5';

export function wireEventBusObservability(): Unsubscribe {
  // Route listener errors → Sentry
  setEventBusErrorReporter((err, context) => {
    captureException(err, context);
  });

  const combatStartTs = new Map<number, number>();

  const offEnter = eventBus.on('ENTER_COMBAT', ({ monster_id }) => {
    combatStartTs.set(monster_id, Date.now());
    metrics.combatStarted({ monster_id, grade: DEFAULT_GRADE });
  });

  const offExit = eventBus.on('EXIT_COMBAT', ({ won, monster_id }) => {
    if (monster_id == null) return;
    const start = combatStartTs.get(monster_id) ?? Date.now();
    combatStartTs.delete(monster_id);
    metrics.combatCompleted({
      monster_id,
      won,
      duration_ms: Date.now() - start,
    });
  });

  const offQuiz = eventBus.on('QUIZ_RESULT', ({ correct, timeSpent, lo_id }) => {
    const lo = lo_id != null ? findLOById(lo_id) : null;
    metrics.quizAnswered({
      quiz_type_id: lo?.quiz_type_id ?? 0,
      is_correct: correct,
      time_spent: timeSpent,
    });
  });

  return () => {
    offEnter();
    offExit();
    offQuiz();
    setEventBusErrorReporter(null);
  };
}
