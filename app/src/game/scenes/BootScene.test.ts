import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockScene {
    scene = { start: vi.fn() };
    add = { text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis() }) };
    scale = { width: 1280, height: 720 };
    private sceneKey: string;
    constructor(key: string) {
      this.sceneKey = key;
    }
    get key(): string {
      return this.sceneKey;
    }
  }
  return {
    default: { Scene: MockScene },
  };
});

const { BootScene, BOOT_SCENE_KEY } = await import('./BootScene');

describe('BootScene', () => {
  it('scene key = "BootScene"', () => {
    expect(BOOT_SCENE_KEY).toBe('BootScene');
  });

  it('create() transitions to PreloadScene', () => {
    const scene = new BootScene();
    scene.create();
    expect(scene.scene.start).toHaveBeenCalledWith('PreloadScene');
  });
});
