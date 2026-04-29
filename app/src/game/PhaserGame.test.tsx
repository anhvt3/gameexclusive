import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { eventBus } from '@bus/EventBus';

const mockDestroy = vi.fn();
const mockGameCtor = vi.fn();

vi.mock('phaser', () => {
  class MockGame {
    destroy = mockDestroy;
    scene = { add: vi.fn(), start: vi.fn() };
    constructor(config: unknown) {
      mockGameCtor(config);
    }
  }
  class MockScene {
    scale = { width: 1280, height: 720 };
    add = { text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis() }) };
    constructor(_key: string) {}
  }
  return {
    default: {
      Game: MockGame,
      Scene: MockScene,
      AUTO: 0,
      Scale: { FIT: 3, CENTER_BOTH: 3 },
    },
  };
});

// Import AFTER mock so PhaserGame picks up the mocked Phaser
const { PhaserGame } = await import('./PhaserGame');

beforeEach(() => {
  mockDestroy.mockClear();
  mockGameCtor.mockClear();
  eventBus.clear();
});

describe('PhaserGame — React wrapper', () => {
  it('mounts: creates Phaser.Game with correct config', () => {
    render(<PhaserGame />);
    expect(mockGameCtor).toHaveBeenCalledTimes(1);
    const cfg = mockGameCtor.mock.calls[0]?.[0] as { width: number; height: number };
    expect(cfg.width).toBe(960);
    expect(cfg.height).toBe(640);
  });

  it('renders container div with data-testid', () => {
    const { getByTestId } = render(<PhaserGame />);
    expect(getByTestId('phaser-container')).toBeInTheDocument();
  });

  it('unmount: calls game.destroy(true, false)', () => {
    const { unmount } = render(<PhaserGame />);
    unmount();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledWith(true, false);
  });

  it('custom width/height props respected', () => {
    render(<PhaserGame width={800} height={600} />);
    const cfg = mockGameCtor.mock.calls[0]?.[0] as { width: number; height: number };
    expect(cfg.width).toBe(800);
    expect(cfg.height).toBe(600);
  });

  it('NO MEMORY LEAK — 10 mount/unmount cycles stable', () => {
    const initialListenerCount = eventBus.getListenerCount();
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<PhaserGame />);
      unmount();
    }
    expect(mockDestroy).toHaveBeenCalledTimes(10);
    expect(mockGameCtor).toHaveBeenCalledTimes(10);
    // EventBus should not accumulate listeners across cycles
    expect(eventBus.getListenerCount()).toBeLessThanOrEqual(initialListenerCount + 1);
  });

  it('BootScene registered in scene config', () => {
    render(<PhaserGame />);
    const cfg = mockGameCtor.mock.calls[0]?.[0] as { scene: unknown[] };
    expect(cfg.scene).toBeInstanceOf(Array);
    expect(cfg.scene).toHaveLength(4); // Boot + Preload + World + Combat (Step 14)
  });
});
