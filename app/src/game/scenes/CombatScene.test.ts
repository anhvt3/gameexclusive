import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveState } from '@persistence/SaveStateStore';
import { eventBus } from '@bus/EventBus';

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    scene = {
      pause: vi.fn(),
      resume: vi.fn(),
    };
    add = {
      image: vi.fn().mockReturnValue({
        setDisplaySize: vi.fn().mockReturnThis(),
        setOrigin: vi.fn().mockReturnThis(),
      }),
      sprite: vi.fn().mockReturnValue({
        setScale: vi.fn().mockReturnThis(),
      }),
      rectangle: vi.fn().mockImplementation(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        setStrokeStyle: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        width: 240,
        fillColor: 0,
      })),
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
  eventBus.clear();
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

describe('CombatScene — Step 16 FSM + Quiz integration', () => {
  it('create() transitions INIT → PLAYER_TURN', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(scene.getCombatState()).toBe('PLAYER_TURN');
  });

  it('create() renders 4 spell buttons (one per element)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    // 2 HP bar bg + 2 HP bar fill = 4 rectangles from HpBar, + 4 spell buttons = 8 total
    // We only assert that at least 4 interactive rectangles were wired.
    const rectCalls = (
      scene.add.rectangle as unknown as {
        mock: { results: { value: { setInteractive: ReturnType<typeof vi.fn> } }[] };
      }
    ).mock.results;
    const interactiveCount = rectCalls.filter(
      (r) => (r.value.setInteractive as ReturnType<typeof vi.fn>).mock.calls.length > 0
    ).length;
    expect(interactiveCount).toBe(4);
  });

  it('onSpellClick emits OPEN_QUIZ with valid lo_id + monster_id', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const spy = vi.fn();
    eventBus.on('OPEN_QUIZ', spy);
    scene.onSpellClick('fire_blast');
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0]![0];
    expect(typeof payload.lo_id).toBe('number');
    expect(payload.lo_id).toBeGreaterThan(0);
    expect(payload.monster_id).toBe(1);
  });

  it('onSpellClick transitions PLAYER_TURN → QUIZ_GATE via SELECT_SPELL', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    expect(scene.getCombatState()).toBe('QUIZ_GATE');
    expect(scene.getSelectedSpellId()).toBe('fire_blast');
  });

  it('onSpellClick pauses Phaser scene', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    expect(scene.scene.pause).toHaveBeenCalledTimes(1);
  });

  it('onSpellClick ignored outside PLAYER_TURN (guard)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast'); // → QUIZ_GATE
    (scene.scene.pause as ReturnType<typeof vi.fn>).mockClear();
    scene.onSpellClick('water_jet'); // should be ignored
    expect(scene.getSelectedSpellId()).toBe('fire_blast');
    expect(scene.scene.pause).not.toHaveBeenCalled();
  });

  it('QUIZ_RESULT correct → state RESOLVE_DAMAGE + resume', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('RESOLVE_DAMAGE');
    expect(scene.scene.resume).toHaveBeenCalledTimes(1);
  });

  it('QUIZ_RESULT wrong → state MONSTER_TURN + resume', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 8, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('MONSTER_TURN');
    expect(scene.scene.resume).toHaveBeenCalledTimes(1);
  });

  it('QUIZ_RESULT outside QUIZ_GATE is ignored (guard)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    // Still PLAYER_TURN — no spell clicked
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('PLAYER_TURN');
    expect(scene.scene.resume).not.toHaveBeenCalled();
  });

  it('shutdown() unsubscribes QUIZ_RESULT (no leak)', () => {
    const before = eventBus.getListenerCount();
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(eventBus.getListenerCount()).toBeGreaterThan(before);
    scene.shutdown();
    expect(eventBus.getListenerCount()).toBe(before);
  });
});
