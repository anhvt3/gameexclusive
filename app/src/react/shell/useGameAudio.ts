/**
 * useGameAudio — React hook wrapping the AudioManager singleton.
 *
 * ISP v1.1 Step 22.11 / Appendix I §2 — convenience surface for React UI
 * to fire SFX / control BGM without importing `@/utils/AudioManager`
 * directly at every call-site.
 *
 * Returned API is referentially stable across renders (functions captured
 * once via useCallback bound to the singleton). Safe to pass into deps
 * arrays; will not retrigger effects.
 *
 * Usage:
 *   const { playSfx, playBgm, stopBgm, setMuted, getMuted } = useGameAudio();
 *   <button onClick={() => playSfx('ui_btn_click')}>Start</button>
 *   <button onMouseEnter={() => playSfx('ui_btn_hover')}>Hover me</button>
 *
 * Layer compliance (AP 3.1): Lives in `react/` and only imports `utils/`.
 * Does NOT import Phaser (`game/`) — boundary preserved by ESLint rule.
 *
 * Contrast with EventBus path: callers wanting decoupled audio should
 * still emit domain events (e.g. `LEVEL_UP`, `ENTER_COMBAT`) — appLifecycle
 * maps those to AudioManager. This hook is for direct UI-feedback sounds
 * where no domain event is meaningful (button click, popup open, etc.).
 */

import { useCallback } from 'react';
import { audioManager, type BgmKey, type SfxKey } from '@/utils/AudioManager';

export interface UseGameAudio {
  /** Play a one-shot SFX. No-op when muted. */
  playSfx: (key: SfxKey) => void;
  /** Start (or resume) the named BGM track. Idempotent if already playing. */
  playBgm: (key: BgmKey) => void;
  /** Stop the current BGM (if any). */
  stopBgm: () => void;
  /** Toggle global mute. SFX silenced immediately, BGM `mute()` propagated. */
  setMuted: (value: boolean) => void;
  /** Read current mute state. */
  getMuted: () => boolean;
  /** Read currently-playing BGM key (null when stopped). */
  getCurrentBgmKey: () => BgmKey | null;
}

export function useGameAudio(): UseGameAudio {
  const playSfx = useCallback((key: SfxKey) => audioManager.playSfx(key), []);
  const playBgm = useCallback((key: BgmKey) => audioManager.playBgm(key), []);
  const stopBgm = useCallback(() => audioManager.stopBgm(), []);
  const setMuted = useCallback((value: boolean) => audioManager.setMuted(value), []);
  const getMuted = useCallback(() => audioManager.getMuted(), []);
  const getCurrentBgmKey = useCallback(() => audioManager.getCurrentBgmKey(), []);

  return { playSfx, playBgm, stopBgm, setMuted, getMuted, getCurrentBgmKey };
}

// Re-export key types so consumers don't need a second import.
export type { BgmKey, SfxKey };
