import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockScene {
    scene = { start: vi.fn() };
    scale = { width: 1280, height: 720 };
    add = {
      text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), destroy: vi.fn() }),
      rectangle: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        width: 0,
        destroy: vi.fn(),
      }),
    };
    load = {
      on: vi.fn(),
      once: vi.fn(),
      image: vi.fn(),
      spritesheet: vi.fn(),
      tilemapTiledJSON: vi.fn(),
    };
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { PreloadScene, PRELOAD_SCENE_KEY, PHASE1_ASSETS } = await import('./PreloadScene');

describe('PreloadScene', () => {
  it('scene key = "PreloadScene"', () => {
    expect(PRELOAD_SCENE_KEY).toBe('PreloadScene');
  });

  it('preload() registers progress + complete handlers', () => {
    const scene = new PreloadScene();
    scene.preload();
    expect(scene.load.on).toHaveBeenCalledWith('progress', expect.any(Function));
    expect(scene.load.once).toHaveBeenCalledWith('complete', expect.any(Function));
  });

  it('preload() creates progress bar UI rectangles', () => {
    const scene = new PreloadScene();
    scene.preload();
    expect(scene.add.rectangle).toHaveBeenCalledTimes(2); // bg + fill
    expect(scene.add.text).toHaveBeenCalled(); // label
  });

  it('preload() queues all assets in PHASE1_ASSETS manifest', () => {
    const scene = new PreloadScene();
    scene.preload();
    expect(scene.load.image).toHaveBeenCalledTimes(PHASE1_ASSETS.images.length);
    expect(scene.load.spritesheet).toHaveBeenCalledTimes(PHASE1_ASSETS.spritesheets.length);
    expect(scene.load.tilemapTiledJSON).toHaveBeenCalledTimes(PHASE1_ASSETS.tilemaps.length);
  });

  it('create() transitions to WorldScene', () => {
    const scene = new PreloadScene();
    scene.create();
    expect(scene.scene.start).toHaveBeenCalledWith('WorldScene');
  });

  it('PHASE1_ASSETS shape has 3 categories', () => {
    expect(PHASE1_ASSETS).toHaveProperty('images');
    expect(PHASE1_ASSETS).toHaveProperty('spritesheets');
    expect(PHASE1_ASSETS).toHaveProperty('tilemaps');
  });
});
