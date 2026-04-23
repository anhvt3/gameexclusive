import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Howler before the module imports it.
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
    audioManager.playBgm('map');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.options.src).toEqual([BGM_PATHS.map]);
    expect(howlInstances[0]!.options.loop).toBe(true);
    expect(howlInstances[0]!.play).toHaveBeenCalledTimes(1);
    expect(audioManager.getCurrentBgmKey()).toBe('map');
  });

  it('playing the same BGM twice is idempotent (play called once)', () => {
    audioManager.playBgm('map');
    audioManager.playBgm('map');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.play).toHaveBeenCalledTimes(1);
  });

  it('switching BGM stops the previous track before starting the new one', () => {
    audioManager.playBgm('map');
    const mapHowl = howlInstances[0]!;
    audioManager.playBgm('combat');
    expect(mapHowl.stop).toHaveBeenCalledTimes(1);
    expect(howlInstances).toHaveLength(2);
    expect(audioManager.getCurrentBgmKey()).toBe('combat');
  });

  it('stopBgm halts the current track + clears state', () => {
    audioManager.playBgm('map');
    audioManager.stopBgm();
    expect(howlInstances[0]!.stop).toHaveBeenCalledTimes(1);
    expect(audioManager.getCurrentBgmKey()).toBeNull();
  });

  it('reusing the same key re-plays the cached Howl (no double instantiation)', () => {
    audioManager.playBgm('map');
    audioManager.playBgm('combat');
    audioManager.playBgm('map');
    // Expect only 2 Howls created (map, combat), not 3.
    expect(howlInstances).toHaveLength(2);
  });
});

describe('AudioManager — SFX', () => {
  it('playSfx creates a Howl at the right path and plays it', () => {
    audioManager.playSfx('click');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.options.src).toEqual([SFX_PATHS.click]);
    expect(howlInstances[0]!.options.loop).toBeUndefined();
    expect(howlInstances[0]!.play).toHaveBeenCalled();
  });

  it('playSfx is cached — replaying uses the same Howl instance', () => {
    audioManager.playSfx('correct');
    audioManager.playSfx('correct');
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.play).toHaveBeenCalledTimes(2);
  });

  it('playSfx is a no-op when muted', () => {
    audioManager.setMuted(true);
    audioManager.playSfx('correct');
    expect(howlInstances).toHaveLength(0);
  });
});

describe('AudioManager — mute', () => {
  it('setMuted(true) mutes every cached BGM Howl', () => {
    audioManager.playBgm('map');
    const bgm = howlInstances[0]!;
    audioManager.setMuted(true);
    expect(bgm.mute).toHaveBeenLastCalledWith(true);
    expect(audioManager.getMuted()).toBe(true);
  });

  it('setMuted(false) un-mutes BGM', () => {
    audioManager.playBgm('map');
    audioManager.setMuted(true);
    audioManager.setMuted(false);
    expect(howlInstances[0]!.mute).toHaveBeenLastCalledWith(false);
  });

  it('starting BGM while muted initialises with mute=true', () => {
    audioManager.setMuted(true);
    audioManager.playBgm('map');
    expect(howlInstances[0]!.mute).toHaveBeenCalledWith(true);
  });
});
