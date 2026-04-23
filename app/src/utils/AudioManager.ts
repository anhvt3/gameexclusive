/**
 * AudioManager — ISP v1.1 Step 22.11 / Appendix I §2.
 *
 * Single audio entry point for both Phaser scenes and React UI.
 * Wraps Howler.js so every call-site can import a stable singleton
 * without caring about asset preloads, Phaser sound contexts, or
 * browser-autoplay quirks.
 *
 * Asset paths point at Antigravity's placeholders under
 * `app/public/assets/audio/` (real audio will overwrite these in
 * place without code changes).
 *
 * Mute state is held in-memory here and synced to
 * `SaveState.flags.audio_muted` by appLifecycle — keeps this module
 * pure (no store imports).
 */

import { Howl } from 'howler';

export type BgmKey = 'map' | 'combat';
export type SfxKey =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'spell_fire'
  | 'spell_water'
  | 'hit'
  | 'chest_open'
  | 'level_up';

export const BGM_PATHS: Record<BgmKey, string> = {
  map: '/assets/audio/bgm_map.wav',
  combat: '/assets/audio/bgm_combat.wav',
};

export const SFX_PATHS: Record<SfxKey, string> = {
  click: '/assets/audio/sfx_click.wav',
  correct: '/assets/audio/sfx_correct.wav',
  wrong: '/assets/audio/sfx_wrong.wav',
  spell_fire: '/assets/audio/sfx_spell_fire.wav',
  spell_water: '/assets/audio/sfx_spell_water.wav',
  hit: '/assets/audio/sfx_hit.wav',
  chest_open: '/assets/audio/sfx_chest_open.wav',
  level_up: '/assets/audio/sfx_level_up.wav',
};

const BGM_VOLUME = 0.4;
const SFX_VOLUME = 0.6;

class AudioManager {
  private bgmInstances = new Map<BgmKey, Howl>();
  private sfxInstances = new Map<SfxKey, Howl>();
  private currentBgm: { key: BgmKey; howl: Howl } | null = null;
  private muted = false;

  playBgm(key: BgmKey): void {
    const path = BGM_PATHS[key];
    if (!path) {
      console.warn(`[AudioManager] Unknown BGM key: ${key}`);
      return;
    }
    if (this.currentBgm?.key === key) return; // already playing — idempotent

    this.stopBgm();

    let howl = this.bgmInstances.get(key);
    if (!howl) {
      howl = new Howl({
        src: [path],
        loop: true,
        volume: BGM_VOLUME,
        mute: this.muted,
      });
      this.bgmInstances.set(key, howl);
    }
    howl.mute(this.muted);
    howl.play();
    this.currentBgm = { key, howl };
  }

  stopBgm(): void {
    if (this.currentBgm) {
      this.currentBgm.howl.stop();
      this.currentBgm = null;
    }
  }

  playSfx(key: SfxKey): void {
    if (this.muted) return;
    const path = SFX_PATHS[key];
    if (!path) {
      console.warn(`[AudioManager] Unknown SFX key: ${key}`);
      return;
    }
    let howl = this.sfxInstances.get(key);
    if (!howl) {
      howl = new Howl({ src: [path], volume: SFX_VOLUME });
      this.sfxInstances.set(key, howl);
    }
    howl.play();
  }

  setMuted(value: boolean): void {
    this.muted = value;
    for (const howl of this.bgmInstances.values()) {
      howl.mute(value);
    }
    // SFX are gated at play() time — no in-flight mute needed.
  }

  getMuted(): boolean {
    return this.muted;
  }

  getCurrentBgmKey(): BgmKey | null {
    return this.currentBgm?.key ?? null;
  }

  /** Test-only full reset. */
  __reset(): void {
    this.stopBgm();
    this.bgmInstances.clear();
    this.sfxInstances.clear();
    this.muted = false;
  }
}

export const audioManager = new AudioManager();
