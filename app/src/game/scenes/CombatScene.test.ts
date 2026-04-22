import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveState } from '@persistence/SaveStateStore';
import { eventBus } from '@bus/EventBus';

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    scene = {
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
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

  it('QUIZ_RESULT correct (monster survives) → full round → PLAYER_TURN', () => {
    // Step 17: after QUIZ_CORRECT flow runs damage → monster alive → monster
    // retaliates → player alive → PLAYER_TURN. Intermediate states (RESOLVE_DAMAGE,
    // MONSTER_TURN) are traversed but not observable via getCombatState().
    const scene = new CombatScene();
    scene.init({ monsterId: 1 }); // Embershed 40 hp
    scene.create();
    scene.onSpellClick('fire_blast'); // fire_blast vs Fire = 1.0 mult, max 18 dmg
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('PLAYER_TURN');
    expect(scene.scene.resume).toHaveBeenCalledTimes(1);
  });

  it('QUIZ_RESULT wrong → monster retaliates → PLAYER_TURN', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 8, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('PLAYER_TURN');
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

describe('CombatScene — Step 17 damage resolution + victory/defeat', () => {
  it('QUIZ_CORRECT applies element-typed damage to monster HP', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 }); // Embershed Fire 40hp
    scene.create();
    const beforeHp = scene.getMonsterHp();
    scene.onSpellClick('water_jet'); // Water vs Fire = 2.0 mult
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    const afterHp = scene.getMonsterHp();
    expect(afterHp).toBeLessThan(beforeHp);
    expect(afterHp).toBeGreaterThan(0);
  });

  it('QUIZ_CORRECT updates monster HP bar', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const bar = scene.getMonsterHpBar()!;
    const before = bar.getCurrent();
    scene.onSpellClick('water_jet');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    expect(bar.getCurrent()).toBeLessThan(before);
  });

  it('QUIZ_WRONG decrements player HP by MONSTER_BASE_POWER (10)', () => {
    useSaveState.getState().reset();
    const hpBefore = useSaveState.getState().hp;
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 8, attempts: 1, lo_id: 100001 });
    expect(useSaveState.getState().hp).toBe(hpBefore - 10);
  });

  it('VICTORY when monster HP reaches 0 → emits EXIT_COMBAT won=true with monster_id + exp', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1); // force next hit to kill
    const exits: Array<{ won: boolean; exp_gained: number; monster_id: number | null }> = [];
    eventBus.on('EXIT_COMBAT', (p) => exits.push(p));
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('VICTORY');
    expect(exits).toHaveLength(1);
    expect(exits[0]!.won).toBe(true);
    expect(exits[0]!.monster_id).toBe(1);
    expect(exits[0]!.exp_gained).toBe(40); // embershed baseHp
  });

  it('VICTORY grants EXP via SaveState.gainExp', () => {
    useSaveState.getState().reset();
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1);
    const expBefore = useSaveState.getState().exp;
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    // gainExp(40) with threshold 100 → exp = 40 (no level-up)
    expect(useSaveState.getState().exp).toBe(expBefore + 40);
  });

  it('VICTORY stops CombatScene (no resume called)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1);
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    expect(scene.scene.stop).toHaveBeenCalledTimes(1);
    expect(scene.scene.resume).not.toHaveBeenCalled();
  });

  it('DEFEAT when player HP reaches 0 → emits EXIT_COMBAT won=false', () => {
    useSaveState.getState().reset();
    useSaveState.getState().setHp(5); // next monster hit (10 dmg) kills
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const exits: Array<{ won: boolean; exp_gained: number; monster_id: number | null }> = [];
    eventBus.on('EXIT_COMBAT', (p) => exits.push(p));
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 8, attempts: 1, lo_id: 100001 });
    expect(scene.getCombatState()).toBe('DEFEAT');
    expect(exits).toHaveLength(1);
    expect(exits[0]!.won).toBe(false);
    expect(exits[0]!.exp_gained).toBe(0);
    expect(exits[0]!.monster_id).toBe(1);
  });

  it('boss monster (is_boss) → 5× HP scale on init', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 99 }); // Aldergasp boss, baseHp 45
    expect(scene.getMonsterHp()).toBe(225);
    expect(scene.getMonsterMaxHp()).toBe(225);
  });

  it('normal monster → 1× HP (no scale)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 }); // Embershed, baseHp 40
    expect(scene.getMonsterHp()).toBe(40);
    expect(scene.getMonsterMaxHp()).toBe(40);
  });

  it('VICTORY vs boss grants 500 EXP (flat) instead of baseHp', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 99 });
    scene.create();
    scene.__setMonsterHp(1);
    const exits: Array<{ won: boolean; exp_gained: number }> = [];
    eventBus.on('EXIT_COMBAT', (p) => exits.push(p));
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    expect(exits[0]!.exp_gained).toBe(500);
  });

  it('DEFEAT respawns player (HP=maxHp, position reset) + stops scene', () => {
    useSaveState.getState().reset();
    useSaveState.getState().setHp(5);
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 8, attempts: 1, lo_id: 100001 });
    const save = useSaveState.getState();
    expect(save.hp).toBe(save.maxHp);
    expect(save.position).toEqual({ x: 480, y: 320 }); // WorldScene center
    expect(scene.scene.stop).toHaveBeenCalledTimes(1);
  });
});
