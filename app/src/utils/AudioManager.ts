/**
 * AudioManager — ISP v1.1 Step 22.11 / Appendix I §2.
 *
 * Single audio entry point for both Phaser scenes and React UI.
 * Wraps Howler.js so every call-site can import a stable singleton
 * without caring about asset preloads, Phaser sound contexts, or
 * browser-autoplay quirks.
 *
 * Asset paths point at OGG Vorbis files under
 * `app/public/assets/audio/{sfx,bgm}/`. Keys follow the convention
 * `[category]_[action/object]` (snake_case), matching the manifest in
 * `tasks/audio_manifest.md`.
 *
 * Mute state is held in-memory here and synced to
 * `SaveState.flags.audio_muted` by appLifecycle — keeps this module
 * pure (no store imports).
 *
 * AP DELTA NOTE (2026-04-29): keys renamed from short codes
 * (`map`, `combat`, `click`, `correct`, ...) to the prompt-mandated
 * `[category]_[action]` convention. Type B change — reviewer must
 * update Appendix I §2 with the full key registry.
 */

import { Howl } from 'howler';

/**
 * Background music keys — 4 tracks, looped.
 */
export type BgmKey = 'main_menu' | 'world_explore' | 'combat_active' | 'math_thinking';

/**
 * Sound effect keys — 22 short clips, one-shot.
 * Naming: [category]_[action/object]. Categories: ui, math, combat, world.
 */
export type SfxKey =
  | 'ui_btn_hover'
  | 'ui_btn_click'
  | 'ui_popup_open'
  | 'ui_popup_close'
  | 'ui_error_beep'
  | 'math_keyboard_tap'
  | 'math_correct'
  | 'math_wrong'
  | 'math_whiteboard_draw'
  | 'combat_encounter'
  | 'combat_cast_fire'
  | 'combat_cast_ice'
  | 'combat_hit_impact'
  | 'combat_miss'
  | 'combat_heal'
  | 'combat_monster_cry'
  | 'combat_victory'
  | 'world_step_grass'
  | 'world_collect_item'
  | 'world_chest_open'
  | 'world_npc_talk'
  | 'world_level_up';

export const BGM_PATHS: Record<BgmKey, string> = {
  main_menu: '/assets/audio/bgm/bgm_main_menu.ogg',
  world_explore: '/assets/audio/bgm/bgm_world_explore.ogg',
  combat_active: '/assets/audio/bgm/bgm_combat_active.ogg',
  math_thinking: '/assets/audio/bgm/bgm_math_thinking.ogg',
};

export const SFX_PATHS: Record<SfxKey, string> = {
  ui_btn_hover: '/assets/audio/sfx/ui_btn_hover.ogg',
  ui_btn_click: '/assets/audio/sfx/ui_btn_click.ogg',
  ui_popup_open: '/assets/audio/sfx/ui_popup_open.ogg',
  ui_popup_close: '/assets/audio/sfx/ui_popup_close.ogg',
  ui_error_beep: '/assets/audio/sfx/ui_error_beep.ogg',
  math_keyboard_tap: '/assets/audio/sfx/math_keyboard_tap.ogg',
  math_correct: '/assets/audio/sfx/math_correct.ogg',
  math_wrong: '/assets/audio/sfx/math_wrong.ogg',
  math_whiteboard_draw: '/assets/audio/sfx/math_whiteboard_draw.ogg',
  combat_encounter: '/assets/audio/sfx/combat_encounter.ogg',
  combat_cast_fire: '/assets/audio/sfx/combat_cast_fire.ogg',
  combat_cast_ice: '/assets/audio/sfx/combat_cast_ice.ogg',
  combat_hit_impact: '/assets/audio/sfx/combat_hit_impact.ogg',
  combat_miss: '/assets/audio/sfx/combat_miss.ogg',
  combat_heal: '/assets/audio/sfx/combat_heal.ogg',
  combat_monster_cry: '/assets/audio/sfx/combat_monster_cry.ogg',
  combat_victory: '/assets/audio/sfx/combat_victory.ogg',
  world_step_grass: '/assets/audio/sfx/world_step_grass.ogg',
  world_collect_item: '/assets/audio/sfx/world_collect_item.ogg',
  world_chest_open: '/assets/audio/sfx/world_chest_open.ogg',
  world_npc_talk: '/assets/audio/sfx/world_npc_talk.ogg',
  world_level_up: '/assets/audio/sfx/world_level_up.ogg',
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
    if (this.currentBgm?.key === key) return;

    try {
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
    } catch (err) {
      console.warn(`[AudioManager] playBgm(${key}) failed:`, err);
    }
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
    // Defensive: a missing asset / decoder error in Howler must NEVER bubble
    // up to UI handlers — a tutorial Continue button that throws here would
    // freeze the dialog. Log and swallow.
    try {
      let howl = this.sfxInstances.get(key);
      if (!howl) {
        howl = new Howl({ src: [path], volume: SFX_VOLUME });
        this.sfxInstances.set(key, howl);
      }
      howl.play();
    } catch (err) {
      console.warn(`[AudioManager] playSfx(${key}) failed:`, err);
    }
  }

  setMuted(value: boolean): void {
    this.muted = value;
    for (const howl of this.bgmInstances.values()) {
      howl.mute(value);
    }
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
