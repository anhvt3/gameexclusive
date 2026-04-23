/**
 * App lifecycle wiring — ISP v1.1 Step 21.
 *
 * Call initAppLifecycle() once at root mount. It:
 *   - boots Sentry (no-op without VITE_SENTRY_DSN)
 *   - wires EventBus → Sentry + metrics (observability bridge)
 *   - wires EventBus → IndexedDB event stream (event-stream bridge)
 *   - emits game_session_start metric (AP §6.2)
 *
 * Returns a cleanup function that emits session_end (with duration_ms
 * + running quizzes_attempted count) and unsubscribes all bridges.
 *
 * Kept framework-free (plain function, not a hook) so the App shell
 * can call it from a one-shot useEffect without re-invocations under
 * StrictMode causing duplicate wiring — the returned cleanup handles
 * that path.
 */

import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { initSentry } from '@/observability/sentry';
import { wireEventBusObservability } from '@/observability/eventBusBridge';
import { metrics } from '@/observability/metrics';
import { wireEventStream } from '@/events/eventStreamBridge';
import { audioManager } from '@/utils/AudioManager';
import { useSaveState } from '@persistence/SaveStateStore';

export const AUDIO_MUTED_FLAG = 'audio_muted';

// Stub until Step 22.5 reads profile grade from auth.
const DEFAULT_GRADE = 'G5';

export interface AppLifecycleHandle {
  teardown: () => void;
}

export function initAppLifecycle(): AppLifecycleHandle {
  initSentry();
  const offObservability = wireEventBusObservability();
  const offStream = wireEventStream();

  // Audio (ISP Step 22.11): sync mute flag from SaveState, start map BGM,
  // swap to combat BGM on ENTER_COMBAT and back on EXIT_COMBAT, play
  // level_up SFX on LEVEL_UP. All wired through the pure AudioManager.
  audioManager.setMuted(useSaveState.getState().flags[AUDIO_MUTED_FLAG] === true);
  audioManager.playBgm('map');
  const offEnterCombatAudio: Unsubscribe = eventBus.on('ENTER_COMBAT', () => {
    audioManager.playBgm('combat');
  });
  const offExitCombatAudio: Unsubscribe = eventBus.on('EXIT_COMBAT', () => {
    audioManager.playBgm('map');
  });
  const offLevelUpAudio: Unsubscribe = eventBus.on('LEVEL_UP', () => {
    audioManager.playSfx('level_up');
  });

  const sessionStartMs = Date.now();
  let quizzesAttempted = 0;
  const quizCountUnsub: Unsubscribe = eventBus.on('QUIZ_RESULT', () => {
    quizzesAttempted += 1;
  });

  metrics.gameSessionStart({
    grade: DEFAULT_GRADE,
    day_of_week: new Date().getDay(),
  });

  const teardown = () => {
    metrics.sessionEnd({
      duration_ms: Date.now() - sessionStartMs,
      quizzes_attempted: quizzesAttempted,
    });
    quizCountUnsub();
    offEnterCombatAudio();
    offExitCombatAudio();
    offLevelUpAudio();
    audioManager.stopBgm();
    offStream();
    offObservability();
  };

  return { teardown };
}
