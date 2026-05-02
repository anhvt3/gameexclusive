import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '@bus/EventBus';
import { useSaveState } from '@persistence/SaveStateStore';

// Inline-mock Phaser the same way ZoneScene.test.ts does.
vi.mock('phaser', () => {
  class MockScene {
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { BossHallScene, BOSS_HALL_SCENE_KEY } = await import('./BossHallScene');
const { getZoneByZoneId } = await import('@/domain/ZoneRegistry');

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
    setOrigin: ReturnType<typeof vi.fn>;
    setDisplaySize: ReturnType<typeof vi.fn>;
    setInteractive: ReturnType<typeof vi.fn>;
    setData: ReturnType<typeof vi.fn>;
    getData: ReturnType<typeof vi.fn>;
    on: (evt: string, cb: (...a: unknown[]) => void) => unknown;
    _handlers: MockSpriteHandlers;
    destroy: ReturnType<typeof vi.fn>;
  };
}

interface AttachOpts {
  onSceneLaunch?: (k: string, d: unknown) => void;
  onSceneStart?: (k: string, d: unknown) => void;
}

function attachMockedPhaser(scene: unknown, opts: AttachOpts = {}): void {
  const s = scene as Record<string, unknown>;
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
      (sp as unknown as Record<string, unknown>).setPadding = vi.fn().mockReturnValue(sp);
      (sp as unknown as Record<string, unknown>).setStyle = vi.fn().mockReturnValue(sp);
      (sp as unknown as Record<string, unknown>).setScrollFactor = vi.fn().mockReturnValue(sp);
      (sp as unknown as Record<string, unknown>).setDepth = vi.fn().mockReturnValue(sp);
      return sp;
    }),
  };
  s.input = { on: vi.fn() };
  s.tweens = { add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })) };
  s.cameras = { main: { setBackgroundColor: vi.fn() } };
  s.scene = {
    start: vi.fn((k: string, d: unknown) => opts.onSceneStart?.(k, d)),
    pause: vi.fn(),
    resume: vi.fn(),
    launch: vi.fn((k: string, d: unknown) => opts.onSceneLaunch?.(k, d)),
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
  useSaveState.getState().reset();
  eventBus.clear();
});

describe('BossHallScene — Sprint B Task 10', () => {
  it('exports BOSS_HALL_SCENE_KEY constant', () => {
    expect(BOSS_HALL_SCENE_KEY).toBe('BossHallScene');
  });

  it('fresh hall: renders boss sprite, no chest, no banner', () => {
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    expect(scene.hasBossSprite()).toBe(true);
    expect(scene.hasChestSprite()).toBe(false);
    expect(scene.hasConqueredBanner()).toBe(false);
  });

  it('clicking boss launches CombatScene with the zone bossId', () => {
    const launches: Array<{ k: string; d: unknown }> = [];
    const scene = new BossHallScene();
    attachMockedPhaser(scene, { onSceneLaunch: (k, d) => launches.push({ k, d }) });
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    scene.simulateBossClick();
    const expectedBossId = getZoneByZoneId('forest-island')!.bossId;
    expect(launches[0]).toEqual({ k: 'CombatScene', d: { monsterId: expectedBossId } });
  });

  it('boss click emits ENTER_COMBAT and pauses scene', () => {
    const events: Array<{ monster_id: number }> = [];
    const off = eventBus.on('ENTER_COMBAT', (p) => events.push(p));
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    scene.simulateBossClick();
    off();
    expect(events).toHaveLength(1);
    expect(scene.wasPaused()).toBe(true);
  });

  it('on EXIT_COMBAT(won=true, bossId): boss removed, chest spawned, BOSS_DEFEATED emitted, save updated', () => {
    const events: Array<{ bossId: string; zoneId: string }> = [];
    const off = eventBus.on('BOSS_DEFEATED', (p) => events.push(p));
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    const numericBossId = getZoneByZoneId('forest-island')!.bossId;
    scene.simulateBossClick();
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: numericBossId });
    off();
    expect(scene.hasBossSprite()).toBe(false);
    expect(scene.hasChestSprite()).toBe(true);
    expect(events).toEqual([{ bossId: 'forest-boss', zoneId: 'forest-island' }]);
    expect(useSaveState.getState().defeatedBossIds).toContain('forest-boss');
  });

  it('on EXIT_COMBAT(won=false): boss intact, no chest, no flag set', () => {
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    const numericBossId = getZoneByZoneId('forest-island')!.bossId;
    scene.simulateBossClick();
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: numericBossId });
    expect(scene.hasBossSprite()).toBe(true);
    expect(scene.hasChestSprite()).toBe(false);
    expect(useSaveState.getState().defeatedBossIds).toEqual([]);
  });

  it('clicking chest emits CHEST_OPENED with rewards and marks claimed', () => {
    const events: Array<{ chestId: string; zoneId: string; items: ReadonlyArray<unknown> }> = [];
    const off = eventBus.on('CHEST_OPENED', (p) => events.push(p));
    useSaveState.getState().addDefeatedBoss('forest-boss');
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    scene.simulateChestClick();
    off();
    expect(events).toHaveLength(1);
    expect(events[0]!.chestId).toBe('forest-boss-chest');
    expect(events[0]!.items.length).toBeGreaterThan(0);
    expect(useSaveState.getState().claimedChestIds).toContain('forest-boss-chest');
  });

  it('defeated + chest unclaimed branch: shows chest only', () => {
    useSaveState.getState().addDefeatedBoss('forest-boss');
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    expect(scene.hasBossSprite()).toBe(false);
    expect(scene.hasChestSprite()).toBe(true);
    expect(scene.hasConqueredBanner()).toBe(false);
  });

  it('conquered branch (boss defeated + chest claimed): banner only', () => {
    useSaveState.getState().addDefeatedBoss('forest-boss');
    useSaveState.getState().addClaimedChest('forest-boss-chest');
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    expect(scene.hasBossSprite()).toBe(false);
    expect(scene.hasChestSprite()).toBe(false);
    expect(scene.hasConqueredBanner()).toBe(true);
  });

  it('Quay lại button: emits EXIT_ZONE retreat, clears currentZoneId, starts WorldMapScene', () => {
    const events: Array<{ zoneId: string; reason: string }> = [];
    const off = eventBus.on('EXIT_ZONE', (p) => events.push(p));
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    scene.simulateRetreatClick();
    off();
    expect(events).toEqual([{ zoneId: 'forest-island', reason: 'retreat' }]);
    expect(useSaveState.getState().currentZoneId).toBeNull();
    expect(scene.lastSceneStartKey()).toBe('WorldMapScene');
  });

  it('init falls back to forest-island on invalid data', () => {
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 123 as unknown as string });
    expect(scene.getZoneId()).toBe('forest-island');
  });

  it('on create persists currentZoneId in SaveState', () => {
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'forest-island' });
    scene.create();
    expect(useSaveState.getState().currentZoneId).toBe('forest-island');
  });

  it('unknown zoneId routes back to WorldMapScene', () => {
    const scene = new BossHallScene();
    attachMockedPhaser(scene);
    scene.init({ zoneId: 'nope-island' });
    scene.create();
    expect(scene.lastSceneStartKey()).toBe('WorldMapScene');
  });
});
