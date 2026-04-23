/**
 * EventBus ↔ EventStreamStore bridge — ISP v1.1 Step 19.
 *
 * Subscribes to runtime events and persists them to the IndexedDB
 * append-only log. The bridge is separate from the observability
 * metrics bridge so each can be mounted/unmounted independently.
 *
 * Wire at app shell mount (Step 21); returns a cleanup function.
 */

import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { findLOById } from '@data/supham/LearningObjectAdapter';
import { appendEvent } from './EventStreamStore';

/**
 * Subscribe to QUIZ_RESULT / ENTER_COMBAT / EXIT_COMBAT and append to
 * the event stream. Appends are fire-and-forget — errors are logged and
 * surfaced via the EventBus error reporter (Sentry).
 */
export function wireEventStream(): Unsubscribe {
  const combatStartTs = new Map<number, number>();

  // Serialize appends so event ordering reflects emit ordering, not
  // whichever IDB transaction happens to resolve first.
  let queue: Promise<unknown> = Promise.resolve();
  let seq = 0;
  const tsAt = (): number => {
    // Monotonic tick: base on Date.now() + a strictly-increasing seq nudge
    // so events emitted in the same ms retain emit order in `by-ts` index.
    seq += 1;
    return Date.now() * 1000 + seq;
  };

  const offQuiz = eventBus.on('QUIZ_RESULT', ({ correct, timeSpent, lo_id, attempts }) => {
    if (lo_id == null) return;
    const lo = findLOById(lo_id);
    if (!lo) return;
    const ts = tsAt();
    queue = queue.then(() =>
      appendEvent({
        type: 'quiz_answered',
        ts,
        lo_id,
        quiz_type_id: lo.quiz_type_id,
        correct,
        time_spent: timeSpent,
        attempts,
      }).catch((err) => console.error('[eventStreamBridge] quiz_answered append failed:', err))
    );
  });

  const offEnter = eventBus.on('ENTER_COMBAT', ({ monster_id }) => {
    combatStartTs.set(monster_id, Date.now());
    const ts = tsAt();
    queue = queue.then(() =>
      appendEvent({ type: 'combat_started', ts, monster_id }).catch((err) =>
        console.error('[eventStreamBridge] combat_started append failed:', err)
      )
    );
  });

  const offExit = eventBus.on('EXIT_COMBAT', ({ won, monster_id }) => {
    if (monster_id == null) return;
    const start = combatStartTs.get(monster_id) ?? Date.now();
    combatStartTs.delete(monster_id);
    const ts = tsAt();
    queue = queue.then(() =>
      appendEvent({
        type: 'combat_completed',
        ts,
        monster_id,
        won,
        duration_ms: Date.now() - start,
      }).catch((err) => console.error('[eventStreamBridge] combat_completed append failed:', err))
    );
  });

  const offLevelUp = eventBus.on('LEVEL_UP', ({ newLevel, grantedItemId }) => {
    const ts = tsAt();
    queue = queue.then(() =>
      appendEvent({
        type: 'level_up',
        ts,
        new_level: newLevel,
        granted_item_id: grantedItemId,
      }).catch((err) => console.error('[eventStreamBridge] level_up append failed:', err))
    );
  });

  return () => {
    offQuiz();
    offEnter();
    offExit();
    offLevelUp();
  };
}
