import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '@bus/EventBus';

// Inline-mock Phaser the same way WorldMapScene.test.ts does — stub Phaser.Scene
// with a base class whose constructor swallows the scene-key arg, then call
// attachMockedPhaser(scene) to wire the per-scene surface (add/input/tweens/
// scene-manager/cameras/textures/physics) ZoneScene needs at runtime.
vi.mock('phaser', () => {
  class MockScene {
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { ZoneScene, ZONE_SCENE_KEY, PLAYER_WALK_SPEED } = await import('./ZoneScene');

interface MockSpriteHandlers {
  [evt: string]: (...a: unknown[]) => void;
}

function makeSprite(x = 0, y = 0) {
  const handlers: MockSpriteHandlers = {};
  const sprite: Record<string, unknown> & { x: number; y: number } = {
    x,
    y,
    body: null,
    _data: {} as Record<string, unknown>,
    _handlers: handlers,
  };
  sprite.setOrigin = vi.fn().mockReturnValue(sprite);
  sprite.setDisplaySize = vi.fn().mockReturnValue(sprite);
  sprite.setInteractive = vi.fn().mockReturnValue(sprite);
  sprite.setTint = vi.fn().mockReturnValue(sprite);
  sprite.setData = vi.fn((k: string, v: unknown) => {
    (sprite._data as Record<string, unknown>)[k] = v;
    return sprite;
  });
  sprite.getData = vi.fn((k: string) => (sprite._data as Record<string, unknown>)[k]);
  sprite.on = vi.fn((evt: string, cb: (...a: unknown[]) => void) => {
    handlers[evt] = cb;
    return sprite;
  });
  sprite.destroy = vi.fn();
  return sprite as unknown as {
    x: number;
    y: number;
    body: unknown;
    setDisplaySize: ReturnType<typeof vi.fn>;
    setOrigin: ReturnType<typeof vi.fn>;
    setInteractive: ReturnType<typeof vi.fn>;
    setData: ReturnType<typeof vi.fn>;
    getData: ReturnType<typeof vi.fn>;
    on: (evt: string, cb: (...a: unknown[]) => void) => unknown;
    _handlers: MockSpriteHandlers;
    destroy: ReturnType<typeof vi.fn>;
  };
}

function attachMockedPhaser(scene: unknown): void {
  const s = scene as Record<string, unknown>;
  const inputHandlers: Record<string, (...a: unknown[]) => void> = {};
  s.add = {
    image: vi.fn((x: number, y: number, key: string) => {
      const sp = makeSprite(x, y);
      (sp as unknown as Record<string, unknown>).texture = { key };
      return sp;
    }),
    sprite: vi.fn((x: number, y: number, key: string) => {
      const sp = makeSprite(x, y);
      (sp as unknown as Record<string, unknown>).texture = { key };
      return sp;
    }),
    rectangle: vi.fn((x: number, y: number) => makeSprite(x, y)),
    text: vi.fn((x: number, y: number, label: string) => {
      const sp = makeSprite(x, y);
      (sp as unknown as Record<string, unknown>).text = label;
      // text supports .setOrigin().setInteractive().setPadding().setStyle() etc
      (sp as unknown as Record<string, unknown>).setPadding = vi.fn().mockReturnValue(sp);
      (sp as unknown as Record<string, unknown>).setStyle = vi.fn().mockReturnValue(sp);
      (sp as unknown as Record<string, unknown>).setScrollFactor = vi.fn().mockReturnValue(sp);
      (sp as unknown as Record<string, unknown>).setDepth = vi.fn().mockReturnValue(sp);
      return sp;
    }),
  };
  s.input = {
    on: vi.fn((evt: string, cb: (...a: unknown[]) => void) => {
      inputHandlers[evt] = cb;
    }),
    _handlers: inputHandlers,
  };
  s.tweens = {
    add: vi.fn((cfg: Record<string, unknown>) => {
      const tween: Record<string, unknown> = {
        _cfg: cfg,
        isPlaying: () => true,
        stop: vi.fn(),
        remove: vi.fn(),
      };
      return tween;
    }),
  };
  s.cameras = { main: { setBackgroundColor: vi.fn() } };
  s.scene = {
    start: vi.fn(),
    restart: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    launch: vi.fn(),
    stop: vi.fn(),
  };
  s.textures = {
    exists: vi.fn(() => false),
    get: vi.fn(() => ({ getSourceImage: () => null })),
  };
  s.physics = {
    add: { existing: vi.fn(), overlap: vi.fn() },
    world: { setBounds: vi.fn() },
  };
  s.scale = { width: 1280, height: 720 };
  s.time = { delayedCall: vi.fn() };
}

beforeEach(() => {
  eventBus.clear();
});

describe('ZoneScene — Sprint B Task 9', () => {
  it('exports scene key + PLAYER_WALK_SPEED constant of 220 px/s', () => {
    expect(ZONE_SCENE_KEY).toBe('ZoneScene');
    expect(PLAYER_WALK_SPEED).toBe(220);
  });

  it('entrance branch renders BG, player at entrance spawn, "Đi vào" button', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'entrance' });
    scene.create();
    expect(scene.getBackgroundKey()).toBe('forest-entrance-bg-1280x720');
    expect(scene.getPlayerPos()).toEqual({ x: 100, y: 600 });
    expect(scene.getAdvanceLabel()).toBe('Đi vào');
  });

  it('path branch renders path bg, player at path spawn, "Đi tiếp" button', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'path' });
    scene.create();
    expect(scene.getBackgroundKey()).toBe('forest-path-bg-1280x720');
    expect(scene.getPlayerPos()).toEqual({ x: 80, y: 600 });
    expect(scene.getAdvanceLabel()).toBe('Đi tiếp');
  });

  it('path branch spawns 3 wandering monsters', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'path' });
    scene.create();
    expect(scene.getMonsterCount()).toBe(3);
  });

  it('entrance branch spawns 0 monsters', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'entrance' });
    scene.create();
    expect(scene.getMonsterCount()).toBe(0);
  });

  it('path branch click on walkable point starts a walk tween', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'path' });
    scene.create();
    scene.simulateMaskAllWalkable();
    scene.simulateClickAt({ x: 600, y: 400 });
    expect(scene.isPlayerWalking()).toBe(true);
  });

  it('path branch click on blocked point does not start a tween', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'path' });
    scene.create();
    scene.simulateMaskAllBlocked();
    scene.simulateClickAt({ x: 600, y: 400 });
    expect(scene.isPlayerWalking()).toBe(false);
  });

  it('path branch overlap with monster emits ENTER_COMBAT and pauses scene', () => {
    const events: Array<{ monster_id: number }> = [];
    const off = eventBus.on('ENTER_COMBAT', (p) => events.push(p));
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'path' });
    scene.create();
    scene.simulateMonsterCollision(0);
    off();
    expect(events).toHaveLength(1);
    expect(scene.wasPaused()).toBe(true);
  });

  it('"Đi tiếp" on path screen advances to BossHallScene with zoneId', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'path' });
    scene.create();
    scene.clickAdvanceButton();
    expect(scene.lastSceneStartKey()).toBe('BossHallScene');
    expect(scene.lastSceneStartData()).toEqual({ zoneId: 'forest-island' });
  });

  it('"Đi vào" on entrance screen re-enters ZoneScene with screen=path', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'entrance' });
    scene.create();
    scene.clickAdvanceButton();
    expect(scene.lastSceneStartKey()).toBe('ZoneScene');
    expect(scene.lastSceneStartData()).toEqual({
      zoneId: 'forest-island',
      screen: 'path',
    });
  });

  it('on create persists currentZoneId in SaveState', async () => {
    const { useSaveState } = await import('@persistence/SaveStateStore');
    useSaveState.getState().setCurrentZoneId(null);
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island', screen: 'entrance' });
    scene.create();
    expect(useSaveState.getState().currentZoneId).toBe('forest-island');
  });

  it('init falls back to forest-island/entrance on invalid data', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 123 as unknown as string, screen: 'invalid' as never });
    expect(scene.getZoneId()).toBe('forest-island');
    expect(scene.getScreen()).toBe('entrance');
  });

  it('unknown zoneId routes back to WorldMapScene', () => {
    const scene = new ZoneScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'nope-island', screen: 'entrance' });
    scene.create();
    expect(scene.lastSceneStartKey()).toBe('WorldMapScene');
  });
});
