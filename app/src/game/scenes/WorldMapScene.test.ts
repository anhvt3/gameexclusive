import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '@bus/EventBus';

// Mock Phaser identically to WorldScene.test.ts pattern. WorldMapScene only
// uses scene.add.image (vs rectangle in WorldScene) so we add an image factory
// that mirrors the rectangle stub: chainable setters + setData/getData store.
vi.mock('phaser', () => {
  function makeImage() {
    const img: Record<string, unknown> = {
      _data: {} as Record<string, unknown>,
      _handlers: {} as Record<string, (...a: unknown[]) => void>,
    };
    img.setOrigin = vi.fn().mockReturnValue(img);
    img.setTint = vi.fn().mockReturnValue(img);
    img.setInteractive = vi.fn().mockReturnValue(img);
    img.setData = vi.fn((k: string, v: unknown) => {
      (img._data as Record<string, unknown>)[k] = v;
      return img;
    });
    img.getData = vi.fn((k: string) => (img._data as Record<string, unknown>)[k]);
    img.on = vi.fn((evt: string, cb: (...a: unknown[]) => void) => {
      (img._handlers as Record<string, (...a: unknown[]) => void>)[evt] = cb;
      return img;
    });
    img.emit = (evt: string) => {
      const cb = (img._handlers as Record<string, (...a: unknown[]) => void>)[evt];
      cb?.();
    };
    img.destroy = vi.fn();
    return img;
  }

  class MockScene {
    scale = { width: 1280, height: 720 };
    cameras = { main: { setBackgroundColor: vi.fn() } };
    scene = { pause: vi.fn(), resume: vi.fn(), launch: vi.fn(), start: vi.fn() };
    add = {
      image: vi.fn().mockImplementation(() => makeImage()),
    };
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { WorldMapScene, WORLD_MAP_SCENE_KEY } = await import('./WorldMapScene');

beforeEach(() => {
  eventBus.clear();
});

describe('WorldMapScene — Sprint B Task 8', () => {
  it('exposes scene key constant', () => {
    expect(WORLD_MAP_SCENE_KEY).toBe('WorldMapScene');
  });

  it('renders 8 island markers at their declared anchors', () => {
    const scene = new WorldMapScene();
    scene.create();
    expect(scene.getMarkers()).toHaveLength(8);
  });

  it('clicking an active island emits ENTER_ZONE with the matching zoneId', () => {
    const scene = new WorldMapScene();
    const events: Array<{ zoneId: string }> = [];
    const off = eventBus.on('ENTER_ZONE', (p) => events.push(p));
    scene.create();
    scene.simulateClickIsland('forest');
    off();
    expect(events).toEqual([{ zoneId: 'forest-island' }]);
  });

  it('clicking an active island starts ZoneScene with the matching zoneId', () => {
    const scene = new WorldMapScene();
    scene.create();
    scene.simulateClickIsland('volcanic');
    expect(scene.scene.start).toHaveBeenCalledWith('ZoneScene', {
      zoneId: 'volcanic-island',
      screen: 'entrance',
    });
  });

  it('clicking a locked island does not emit ENTER_ZONE', () => {
    const scene = new WorldMapScene();
    const events: Array<{ zoneId: string }> = [];
    const off = eventBus.on('ENTER_ZONE', (p) => events.push(p));
    scene.create();
    scene.simulateClickIsland('storm');
    off();
    expect(events).toEqual([]);
  });

  it('clicking a locked island emits LOCKED_ISLAND_HINT with islandId', () => {
    const scene = new WorldMapScene();
    const hints: Array<{ islandId: string }> = [];
    const off = eventBus.on('LOCKED_ISLAND_HINT', (p) => hints.push(p));
    scene.create();
    scene.simulateClickIsland('shadow');
    off();
    expect(hints).toEqual([{ islandId: 'shadow' }]);
  });

  it('locked markers receive grey tint; active markers do not', () => {
    const scene = new WorldMapScene();
    scene.create();
    const markers = scene.getMarkers();
    // We tagged each marker with islandId — assert tint applied only to locked.
    for (const m of markers) {
      const id = (m as unknown as { getData: (k: string) => string }).getData('islandId');
      const setTint = (m as unknown as { setTint: ReturnType<typeof vi.fn> }).setTint;
      const isLocked = ['storm', 'ocean', 'earth', 'astral', 'shadow'].includes(id);
      if (isLocked) {
        expect(setTint).toHaveBeenCalled();
      } else {
        expect(setTint).not.toHaveBeenCalled();
      }
    }
  });
});
