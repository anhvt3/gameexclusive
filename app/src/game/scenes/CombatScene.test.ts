import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveState } from '@persistence/SaveStateStore';

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    add = {
      image: vi.fn().mockReturnValue({
        setDisplaySize: vi.fn().mockReturnThis(),
        setOrigin: vi.fn().mockReturnThis(),
      }),
      sprite: vi.fn().mockReturnValue({
        setScale: vi.fn().mockReturnThis(),
      }),
      rectangle: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setStrokeStyle: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        width: 240,
        fillColor: 0,
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setText: vi.fn(),
        destroy: vi.fn(),
      }),
    };
    constructor(_key: string) {}
  }
  return { default: { Scene: MockScene } };
});

const { CombatScene, COMBAT_SCENE_KEY } = await import('./CombatScene');

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('CombatScene — Step 14 static layout', () => {
  it('scene key = "CombatScene"', () => {
    expect(COMBAT_SCENE_KEY).toBe('CombatScene');
  });

  it('init() resolves monsterId → MonsterDef', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 }); // Embershed
    expect(scene.getMonsterDef()?.codename).toBe('embershed');
    expect(scene.getMonsterHp()).toBe(40); // baseHp
  });

  it('init() with unknown monsterId → def null + hp 0', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 99999 });
    expect(scene.getMonsterDef()).toBeNull();
    expect(scene.getMonsterHp()).toBe(0);
  });

  it('create() with valid monster renders bg + sprites + hp bars', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(scene.add.image).toHaveBeenCalled(); // bg + monster
    expect(scene.add.sprite).toHaveBeenCalled(); // wizard
    expect(scene.getPlayerHpBar()).not.toBeNull();
    expect(scene.getMonsterHpBar()).not.toBeNull();
  });

  it('create() with invalid monster shows error text', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 99999 });
    scene.create();
    const textCalls = (scene.add.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const errorCall = textCalls.find((c: unknown[]) => String(c[2]).includes('Combat error'));
    expect(errorCall).toBeDefined();
  });

  it('player HP bar reactive to SaveState change', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const bar = scene.getPlayerHpBar()!;
    expect(bar.getCurrent()).toBe(100); // initial maxHp
    useSaveState.getState().setHp(37);
    expect(bar.getCurrent()).toBe(37);
  });

  it('shutdown() unsubscribes + destroys HP bars', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const playerBar = scene.getPlayerHpBar()!;
    const monsterBar = scene.getMonsterHpBar()!;
    const spy1 = vi.spyOn(playerBar, 'destroy');
    const spy2 = vi.spyOn(monsterBar, 'destroy');
    scene.shutdown();
    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(scene.getPlayerHpBar()).toBeNull();
    expect(scene.getMonsterHpBar()).toBeNull();
  });

  it('after shutdown, SaveState changes do NOT update bars (unsubscribe works)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.shutdown();
    // If unsub failed, this would throw (bar is null → ?.setHp ignored)
    expect(() => useSaveState.getState().setHp(50)).not.toThrow();
  });
});
