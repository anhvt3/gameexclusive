import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Howler — same pattern as AudioManager.test.ts.
interface MockHowl {
  play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  mute: ReturnType<typeof vi.fn>;
  options: { src: string[] };
}
const howlInstances: MockHowl[] = [];

vi.mock('howler', () => ({
  Howl: class {
    options: { src: string[] };
    play = vi.fn();
    stop = vi.fn();
    mute = vi.fn();
    constructor(options: { src: string[] }) {
      this.options = options;
      howlInstances.push(this as unknown as MockHowl);
    }
  },
}));

import { useGameAudio } from './useGameAudio';
import { audioManager } from '@/utils/AudioManager';

beforeEach(() => {
  audioManager.__reset();
  howlInstances.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useGameAudio — hook surface', () => {
  it('exposes 6 API methods', () => {
    const { result } = renderHook(() => useGameAudio());
    expect(typeof result.current.playSfx).toBe('function');
    expect(typeof result.current.playBgm).toBe('function');
    expect(typeof result.current.stopBgm).toBe('function');
    expect(typeof result.current.setMuted).toBe('function');
    expect(typeof result.current.getMuted).toBe('function');
    expect(typeof result.current.getCurrentBgmKey).toBe('function');
  });

  it('playSfx forwards to the singleton AudioManager', () => {
    const { result } = renderHook(() => useGameAudio());
    act(() => {
      result.current.playSfx('ui_btn_click');
    });
    expect(howlInstances).toHaveLength(1);
    expect(howlInstances[0]!.options.src[0]).toMatch(/ui_btn_click\.ogg$/);
  });

  it('playBgm forwards to the singleton + getCurrentBgmKey reflects state', () => {
    const { result } = renderHook(() => useGameAudio());
    act(() => {
      result.current.playBgm('main_menu');
    });
    expect(result.current.getCurrentBgmKey()).toBe('main_menu');
  });

  it('stopBgm halts current track', () => {
    const { result } = renderHook(() => useGameAudio());
    act(() => {
      result.current.playBgm('main_menu');
      result.current.stopBgm();
    });
    expect(result.current.getCurrentBgmKey()).toBeNull();
  });

  it('setMuted/getMuted round-trip', () => {
    const { result } = renderHook(() => useGameAudio());
    act(() => {
      result.current.setMuted(true);
    });
    expect(result.current.getMuted()).toBe(true);
    act(() => {
      result.current.setMuted(false);
    });
    expect(result.current.getMuted()).toBe(false);
  });

  it('returned function refs are stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useGameAudio());
    const first = result.current;
    rerender();
    const second = result.current;
    expect(second.playSfx).toBe(first.playSfx);
    expect(second.playBgm).toBe(first.playBgm);
    expect(second.stopBgm).toBe(first.stopBgm);
    expect(second.setMuted).toBe(first.setMuted);
  });
});
