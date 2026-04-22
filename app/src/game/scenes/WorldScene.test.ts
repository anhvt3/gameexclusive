import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    cameras = { main: { setBackgroundColor: vi.fn() } };
    physics = {
      world: { setBounds: vi.fn() },
      add: { existing: vi.fn() },
    };
    add = {
      rectangle: vi.fn().mockReturnValue({
        body: {
          setVelocity: vi.fn(),
          setVelocityX: vi.fn(),
          setVelocityY: vi.fn(),
          setCollideWorldBounds: vi.fn(),
        },
        destroy: vi.fn(),
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

const { WorldScene, WORLD_SCENE_KEY, TILE_SIZE, MAP_COLS, MAP_ROWS } = await import('./WorldScene');

describe('WorldScene — Step 12 placeholder', () => {
  it('scene key = "WorldScene"', () => {
    expect(WORLD_SCENE_KEY).toBe('WorldScene');
  });

  it('exports map constants (30 cols × 20 rows × 32px)', () => {
    expect(MAP_COLS).toBe(30);
    expect(MAP_ROWS).toBe(20);
    expect(TILE_SIZE).toBe(32);
  });

  it('create() sets camera background + physics world bounds', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#2a5a3a');
    expect(scene.physics.world.setBounds).toHaveBeenCalledWith(
      0,
      0,
      MAP_COLS * TILE_SIZE,
      MAP_ROWS * TILE_SIZE
    );
  });

  it('create() draws checkerboard placeholder (30×20 = 600 rectangles + 1 player)', () => {
    const scene = new WorldScene();
    scene.create();
    // 600 placeholder tiles + 1 player rect = 601
    expect(scene.add.rectangle).toHaveBeenCalledTimes(MAP_COLS * MAP_ROWS + 1);
  });

  it('create() spawns Player at world center', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.getPlayer()).not.toBeNull();
  });

  it('update() calls player.update when player exists', () => {
    const scene = new WorldScene();
    scene.create();
    const player = scene.getPlayer()!;
    const spy = vi.spyOn(player, 'update');
    scene.update();
    expect(spy).toHaveBeenCalled();
  });

  it('update() no-op when player null (safety)', () => {
    const scene = new WorldScene();
    expect(() => scene.update()).not.toThrow();
  });
});
