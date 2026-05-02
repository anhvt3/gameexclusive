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

  it('create() defaults to WorldMapScene on a fresh save (Sprint B)', async () => {
    const { useSaveState } = await import('@persistence/SaveStateStore');
    useSaveState.getState().reset();
    const scene = new PreloadScene();
    scene.create();
    expect(scene.scene.start).toHaveBeenCalledWith('WorldMapScene');
  });

  it('create() resumes ZoneScene when currentZoneId is set', async () => {
    const { useSaveState } = await import('@persistence/SaveStateStore');
    useSaveState.getState().reset();
    useSaveState.getState().setCurrentZoneId('forest-island');
    const scene = new PreloadScene();
    scene.create();
    expect(scene.scene.start).toHaveBeenCalledWith('ZoneScene', {
      zoneId: 'forest-island',
      screen: 'entrance',
    });
    useSaveState.getState().reset();
  });

  it('create() falls back to legacy WorldScene when useLegacyWorldScene=true', async () => {
    const { useSaveState } = await import('@persistence/SaveStateStore');
    useSaveState.getState().reset();
    useSaveState.getState().setLegacyWorldFlag(true);
    const scene = new PreloadScene();
    scene.create();
    expect(scene.scene.start).toHaveBeenCalledWith('WorldScene');
    useSaveState.getState().reset();
  });

  it('PHASE1_ASSETS shape has 3 categories', () => {
    expect(PHASE1_ASSETS).toHaveProperty('images');
    expect(PHASE1_ASSETS).toHaveProperty('spritesheets');
    expect(PHASE1_ASSETS).toHaveProperty('tilemaps');
  });

  it('registers 24 pet textures (6 codenames × 4 states)', () => {
    const petPaths = PHASE1_ASSETS.images.filter((i) => i.key.startsWith('pet_')).map((i) => i.key);
    expect(petPaths).toHaveLength(24);
    for (const codename of [
      'bunbleaf',
      'pyropup',
      'aquakit',
      'frostfae',
      'voltchick',
      'terraowl',
    ]) {
      for (const state of ['idle', 'attack', 'hurt', 'death']) {
        expect(petPaths).toContain(`pet_${codename}_${state}`);
      }
    }
  });

  it('registers evolution VFX strip + party HP strip BG', () => {
    const keys = PHASE1_ASSETS.images.map((i) => i.key);
    expect(keys).toContain('evolution_burst_8frames');
    expect(keys).toContain('party_hp_strip_bg');
  });
});

describe('PreloadScene Sprint B assets', () => {
  function runPreloadAndCaptureLoadCalls(): Array<{ key: string; url: string }> {
    const scene = new PreloadScene();
    scene.preload();
    const mockCalls = (scene.load.image as unknown as { mock: { calls: [string, string][] } }).mock
      .calls;
    return mockCalls.map(([key, url]) => ({ key, url }));
  }

  it('loads the world map illustration and 8 island icons', () => {
    const calls = runPreloadAndCaptureLoadCalls();
    const keys = calls.map((c) => c.key);
    expect(keys).toContain('world-map-bg');
    for (const id of [
      'forest',
      'volcanic',
      'frozen',
      'storm',
      'ocean',
      'earth',
      'astral',
      'shadow',
    ]) {
      expect(keys).toContain(`island-icon-${id}`);
    }
  });

  it('loads 9 zone backgrounds and 9 walkable masks for active islands', () => {
    const calls = runPreloadAndCaptureLoadCalls();
    const keys = calls.map((c) => c.key);
    for (const island of ['forest', 'volcanic', 'frozen']) {
      for (const screen of ['entrance', 'path', 'boss-hall']) {
        expect(keys).toContain(`${island}-${screen}-bg-1280x720`);
        expect(keys).toContain(`${island}-${screen}-walkable-1280x720`);
      }
    }
  });
});
