import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '@bus/EventBus';

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    cameras = { main: { setBackgroundColor: vi.fn() } };
    scene = { pause: vi.fn(), resume: vi.fn(), launch: vi.fn() };
    physics = {
      world: { setBounds: vi.fn() },
      add: {
        existing: vi.fn(),
        overlap: vi.fn(),
      },
    };
    add = {
      rectangle: vi.fn().mockImplementation(() => {
        const rect: Record<string, unknown> = {
          body: {
            setVelocity: vi.fn(),
            setVelocityX: vi.fn(),
            setVelocityY: vi.fn(),
            setCollideWorldBounds: vi.fn(),
            setImmovable: vi.fn(),
          },
          destroy: vi.fn(),
          _data: {} as Record<string, unknown>,
        };
        rect.setData = vi.fn((k: string, v: unknown) => {
          (rect._data as Record<string, unknown>)[k] = v;
        });
        rect.getData = vi.fn((k: string) => (rect._data as Record<string, unknown>)[k]);
        return rect;
      }),
      text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis() }),
    };
    input = {
      keyboard: {
        addKeys: vi.fn().mockReturnValue({
          W: { isDown: false },
          A: { isDown: false },
          S: { isDown: false },
          D: { isDown: false },
        }),
      },
    };
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { WorldScene, MAP_COLS, MAP_ROWS } = await import('./WorldScene');

beforeEach(() => {
  eventBus.clear();
});

describe('WorldScene — Step 13 monster spawn + overlap', () => {
  it('create() spawns 5 enemies', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.getEnemies()).toHaveLength(5);
  });

  it('create() spawns exactly 606 rectangles (600 tiles + 5 enemies + 1 player)', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.add.rectangle).toHaveBeenCalledTimes(MAP_COLS * MAP_ROWS + 5 + 1);
  });

  it('registers physics.add.overlap(player, enemies[])', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.physics.add.overlap).toHaveBeenCalledTimes(1);
    const call = (scene.physics.add.overlap as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]!;
    expect(Array.isArray(call[1])).toBe(true);
    expect((call[1] as unknown[]).length).toBe(5);
  });

  it('overlap callback → emit ENTER_COMBAT with monster_id + pause scene', () => {
    const scene = new WorldScene();
    const received: Array<{ monster_id: number }> = [];
    const off = eventBus.on('ENTER_COMBAT', (p) => received.push(p));

    scene.create();
    const overlapCall = (scene.physics.add.overlap as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0]!;
    const callback = overlapCall[2] as (p: unknown, e: unknown) => void;
    const enemies = scene.getEnemies();
    const enemySprite = enemies[0]!.sprite;

    callback(scene.getPlayer()!.sprite, enemySprite);

    expect(received).toHaveLength(1);
    expect(received[0]?.monster_id).toBe(enemies[0]!.monsterId);
    expect(scene.scene.pause).toHaveBeenCalled();
    expect(scene.isCombatTriggered()).toBe(true);
    off();
  });

  it('second overlap (already triggered) → no duplicate event', () => {
    const scene = new WorldScene();
    const fires = vi.fn();
    const off = eventBus.on('ENTER_COMBAT', fires);

    scene.create();
    const callback = (scene.physics.add.overlap as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]![2] as (p: unknown, e: unknown) => void;
    const enemySprite = scene.getEnemies()[0]!.sprite;
    callback(scene.getPlayer()!.sprite, enemySprite);
    callback(scene.getPlayer()!.sprite, enemySprite);

    expect(fires).toHaveBeenCalledTimes(1);
    off();
  });
});

describe('WorldScene — Step 17 EXIT_COMBAT integration', () => {
  it('EXIT_COMBAT won=true removes enemy matching monster_id', () => {
    const scene = new WorldScene();
    scene.create();
    const target = scene.getEnemies()[0]!;
    const initialCount = scene.getEnemies().length;

    eventBus.emit('EXIT_COMBAT', {
      won: true,
      exp_gained: target.monsterId,
      monster_id: target.monsterId,
    });

    expect(scene.getEnemies()).toHaveLength(initialCount - 1);
    expect(scene.getEnemies().find((e) => e.monsterId === target.monsterId)).toBeUndefined();
  });

  it('EXIT_COMBAT won=false keeps enemies intact', () => {
    const scene = new WorldScene();
    scene.create();
    const target = scene.getEnemies()[0]!;
    const initialCount = scene.getEnemies().length;

    eventBus.emit('EXIT_COMBAT', {
      won: false,
      exp_gained: 0,
      monster_id: target.monsterId,
    });

    expect(scene.getEnemies()).toHaveLength(initialCount);
  });

  it('EXIT_COMBAT resumes scene + clears combatTriggered', () => {
    const scene = new WorldScene();
    scene.create();
    // Simulate combat trigger first
    const callback = (scene.physics.add.overlap as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]![2] as (p: unknown, e: unknown) => void;
    callback(scene.getPlayer()!.sprite, scene.getEnemies()[0]!.sprite);
    expect(scene.isCombatTriggered()).toBe(true);

    eventBus.emit('EXIT_COMBAT', {
      won: true,
      exp_gained: 40,
      monster_id: scene.getEnemies()[0]!.monsterId,
    });

    expect(scene.scene.resume).toHaveBeenCalled();
    expect(scene.isCombatTriggered()).toBe(false);
  });

  it('shutdown() unsubscribes EXIT_COMBAT (no leak)', () => {
    const before = eventBus.getListenerCount();
    const scene = new WorldScene();
    scene.create();
    expect(eventBus.getListenerCount()).toBeGreaterThan(before);
    scene.shutdown();
    expect(eventBus.getListenerCount()).toBe(before);
  });
});
