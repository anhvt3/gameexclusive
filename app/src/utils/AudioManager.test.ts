import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface MockHowl {
  play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  mute: ReturnType<typeof vi.fn>;
  options: { src: string[]; loop?: boolean };
}
const howlInstances: MockHowl[] = [];

vi.mock('howler', () => ({
  Howl: class {
    options: { src: string[]; loop?: boolean };
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(options: { src: string[]; loop?: boolean }) {
      this.options = options;
      howlInstances.push(this as unknown as MockHowl);
    }
  },
}));

import { audioManager, BGM_PATHS, SFX_PATHS } from './AudioManager';

beforeEach(() => {
  audioManager.__reset();
  howlInstances.length = 0;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AudioManager — BGM', () => {
  it('playBgm creates a Howl with looping + correct src path', () => {
    audioManager.playBgm('world_explore');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.options.src).toEqual([BGM_PATHS.world_explore]);
    expect(howlInstances[0]!.options.loop).toBe(true);
    expect(howlInstances[0]!.play).toHaveBeenCalledTimes(1);
    expect(audioManager.getCurrentBgmKey()).toBe('world_explore');
  });

  it('playing the same BGM twice is idempotent (play called once)', () => {
    audioManager.playBgm('world_explore');
    audioManager.playBgm('world_explore');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.play).toHaveBeenCalledTimes(1);
  });

  it('switching BGM stops the previous track before starting the new one', () => {
    audioManager.playBgm('world_explore');
    const worldHowl = howlInstances[0]!;
    audioManager.playBgm('combat_active');
    expect(worldHowl.stop).toHaveBeenCalledTimes(1);
    expect(howlInstances).toHaveLength(2);
    expect(audioManager.getCurrentBgmKey()).toBe('combat_active');
  });

  it('stopBgm halts the current track + clears state', () => {
    audioManager.playBgm('world_explore');
    audioManager.stopBgm();
    expect(howlInstances[0]!.stop).toHaveBeenCalledTimes(1);
    expect(audioManager.getCurrentBgmKey()).toBeNull();
  });

  it('reusing the same key re-plays the cached Howl (no double instantiation)', () => {
    audioManager.playBgm('world_explore');
    audioManager.playBgm('combat_active');
    audioManager.playBgm('world_explore');
    expect(howlInstances).toHaveLength(2);
  });

  it('all 4 BGM keys resolve to /assets/audio/bgm/*.ogg paths', () => {
    expect(BGM_PATHS.main_menu).toMatch(/^\/assets\/audio\/bgm\/.+\.ogg$/);
    expect(BGM_PATHS.world_explore).toMatch(/^\/assets\/audio\/bgm\/.+\.ogg$/);
    expect(BGM_PATHS.combat_active).toMatch(/^\/assets\/audio\/bgm\/.+\.ogg$/);
    expect(BGM_PATHS.math_thinking).toMatch(/^\/assets\/audio\/bgm\/.+\.ogg$/);
  });
});

describe('AudioManager — SFX', () => {
  it('playSfx creates a Howl at the right path and plays it', () => {
    audioManager.playSfx('ui_btn_click');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.options.src).toEqual([SFX_PATHS.ui_btn_click]);
    expect(howlInstances[0]!.options.loop).toBeUndefined();
    expect(howlInstances[0]!.play).toHaveBeenCalled();
  });

  it('playSfx is cached — replaying uses the same Howl instance', () => {
    audioManager.playSfx('math_correct');
    audioManager.playSfx('math_correct');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.play).toHaveBeenCalledTimes(2);
  });

  it('playSfx is a no-op when muted', () => {
    audioManager.setMuted(true);
    audioManager.playSfx('math_correct');
    expect(howlInstances).toHaveLength(0);
  });

  it('all 22 SFX keys resolve to /assets/audio/sfx/*.ogg paths', () => {
    const keys = Object.keys(SFX_PATHS);
    expect(keys).toHaveLength(22);
    for (const key of keys) {
      expect(SFX_PATHS[key as keyof typeof SFX_PATHS]).toMatch(/^\/assets\/audio\/sfx\/.+\.ogg$/);
    }
  });

  it('SFX naming convention: keys are snake_case with category prefix', () => {
    const validPrefixes = ['ui_', 'math_', 'combat_', 'world_'];
    for (const key of Object.keys(SFX_PATHS)) {
      expect(validPrefixes.some((p) => key.startsWith(p))).toBe(true);
    }
  });
});

describe('AudioManager — mute', () => {
  it('setMuted(true) mutes every cached BGM Howl', () => {
    audioManager.playBgm('world_explore');
    const bgm = howlInstances[0]!;
    audioManager.setMuted(true);
    expect(bgm.mute).toHaveBeenLastCalledWith(true);
    expect(audioManager.getMuted()).toBe(true);
  });

  it('setMuted(false) un-mutes BGM', () => {
    audioManager.playBgm('world_explore');
    audioManager.setMuted(true);
    audioManager.setMuted(false);
    expect(howlInstances[0]!.mute).toHaveBeenLastCalledWith(false);
  });

  it('starting BGM while muted initialises with mute=true', () => {
    audioManager.setMuted(true);
    audioManager.playBgm('world_explore');
    expect(howlInstances[0]!.mute).toHaveBeenCalledWith(true);
  });
});
