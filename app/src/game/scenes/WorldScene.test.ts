import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    cameras = { main: { setBackgroundColor: vi.fn() } };
    add = {
      text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis() }),
    };
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { WorldScene, WORLD_SCENE_KEY } = await import('./WorldScene');

describe('WorldScene (Step 11 stub)', () => {
  it('scene key = "WorldScene"', () => {
    expect(WORLD_SCENE_KEY).toBe('WorldScene');
  });

  it('create() sets camera background color', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#2a5a3a');
  });

  it('create() adds stub label text', () => {
    const scene = new WorldScene();
    scene.create();
    expect(scene.add.text).toHaveBeenCalled();
  });
});
