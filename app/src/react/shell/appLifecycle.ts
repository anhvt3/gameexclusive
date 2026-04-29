/**
 * App lifecycle wiring — ISP v1.1 Step 21.
 *
 * Call initAppLifecycle() once at root mount. It:
 *   - boots Sentry (no-op without VITE_SENTRY_DSN)
 *   - wires EventBus → Sentry + metrics (observability bridge)
 *   - wires EventBus → IndexedDB event stream (event-stream bridge)
 *   - emits game_session_start metric (AP §6.2)
 *   - wires audio: BGM swap on combat, victory/level_up SFX, cast SFX on spell
 *
 * Returns a cleanup function that emits session_end (with duration_ms
 * + running quizzes_attempted count) and unsubscribes all bridges.
 */

import { eventBus, type Unsubscribe } from '@bus/EventBus';
import { initSentry } from '@/observability/sentry';
import { wireEventBusObservability } from '@/observability/eventBusBridge';
import { metrics } from '@/observability/metrics';
import { wireEventStream } from '@/events/eventStreamBridge';
import { audioManager } from '@/utils/AudioManager';
import { useSaveState } from '@persistence/SaveStateStore';

export const AUDIO_MUTED_FLAG = 'audio_muted';

const DEFAULT_GRADE = 'G5';

export interface AppLifecycleHandle {
  teardown: () => void;
}

export function initAppLifecycle(): AppLifecycleHandle {
  initSentry();
  const offObservability = wireEventBusObservability();
  const offStream = wireEventStream();

  // Audio (ISP Step 22.11): sync mute flag from SaveState, start world_explore BGM,
  // swap to combat_active BGM on ENTER_COMBAT (+ encounter SFX) and back on EXIT_COMBAT
  // (+ victory SFX if won), play world_level_up SFX on LEVEL_UP, fire cast SFX on
  // CAST_SPELL based on element. Key registry: see tasks/audio_manifest.md.
  audioManager.setMuted(useSaveState.getState().flags[AUDIO_MUTED_FLAG] === true);
  audioManager.playBgm('world_explore');
  const offEnterCombatAudio: Unsubscribe = eventBus.on('ENTER_COMBAT', () => {
    audioManager.playSfx('combat_encounter');
    audioManager.playBgm('combat_active');
  });
  const offExitCombatAudio: Unsubscribe = eventBus.on('EXIT_COMBAT', (payload) => {
    if (payload.won) audioManager.playSfx('combat_victory');
    audioManager.playBgm('world_explore');
  });
  const offLevelUpAudio: Unsubscribe = eventBus.on('LEVEL_UP', () => {
    audioManager.playSfx('world_level_up');
  });
  const offCastSpellAudio: Unsubscribe = eventBus.on('CAST_SPELL', ({ element }) => {
    if (element === 'Ice') audioManager.playSfx('combat_cast_ice');
    else audioManager.playSfx('combat_cast_fire');
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
    offCastSpellAudio();
    audioManager.stopBgm();
    offStream();
    offObservability();
  };

  return { teardown };
}
