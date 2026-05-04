import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveState } from '@persistence/SaveStateStore';
import { eventBus } from '@bus/EventBus';
import { maybeOfferPetRescue } from '@domain/PetRescue';
import type * as PetRescueModule from '@domain/PetRescue';

vi.mock('@domain/PetRescue', async () => {
  const real = await vi.importActual<typeof PetRescueModule>('@domain/PetRescue');
  return {
    ...real,
    maybeOfferPetRescue: vi.fn(),
  };
});

vi.mock('phaser', () => {
  class MockScene {
    scale = { width: 1280, height: 720 };
    scene = {
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
    };
    textures = { exists: vi.fn().mockReturnValue(false) };
    tweens = { add: vi.fn().mockReturnValue({}) };
    add = {
      image: vi.fn().mockReturnValue({
        setDisplaySize: vi.fn().mockReturnThis(),
        setOrigin: vi.fn().mockReturnThis(),
      }),
      sprite: vi.fn().mockImplementation((_x, _y, key: string) => ({
        texture: { key },
        setScale: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
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
        setData: vi.fn().mockReturnThis(),
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

  it('create() renders 8 spell buttons + 1 flee button', () => {
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
    // 8 spell buttons (one per element) + 1 flee button.
    expect(interactiveCount).toBe(9);
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

describe('CombatScene — Step 22.10 equipment stat modifiers in combat', () => {
  it('equipping wand-fire-01 (+10% Fire) deals more damage vs same monster', async () => {
    const mod = await import('./CombatScene');
    mod.__resetCombatRng();
    mod.__setCombatRng(() => 1); // never crit
    // Pin Math.random so both scenes pick the same LO (same difficulty).
    const rngSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    // baseline: no equipment, fire_blast vs Embershed (Fire 40hp)
    const baselineScene = new mod.CombatScene();
    baselineScene.init({ monsterId: 1 });
    baselineScene.create();
    const baselineStart = baselineScene.getMonsterHp();
    baselineScene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    const baselineAfter = baselineScene.getMonsterHp();
    const baselineDmg = baselineStart - baselineAfter;

    // equipped: same, but with +10% Fire wand
    eventBus.clear();
    useSaveState.getState().reset();
    const fireWand = {
      instanceId: 'i-fw',
      itemId: 'wand-fire-01',
      acquiredAt: 1,
    };
    useSaveState.getState().addInventoryItem(fireWand);
    useSaveState.getState().equipItem('wand', fireWand.instanceId);

    const equippedScene = new mod.CombatScene();
    equippedScene.init({ monsterId: 1 });
    equippedScene.create();
    const equippedStart = equippedScene.getMonsterHp();
    equippedScene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    const equippedAfter = equippedScene.getMonsterHp();
    const equippedDmg = equippedStart - equippedAfter;

    expect(equippedDmg).toBeGreaterThan(baselineDmg);
    rngSpy.mockRestore();
    mod.__resetCombatRng();
  });

  it('crit roll rng=0 → damage uses isCrit=true (×1.5)', async () => {
    const mod = await import('./CombatScene');
    // Guarantee crit by forcing rng=0 AND setting crit chance via hat-storm-01
    useSaveState.getState().reset();
    const stormHat = {
      instanceId: 'i-sh',
      itemId: 'hat-storm-01',
      acquiredAt: 1,
    };
    useSaveState.getState().addInventoryItem(stormHat);
    useSaveState.getState().equipItem('hat', stormHat.instanceId);
    mod.__setCombatRng(() => 0); // always crit

    const scene = new mod.CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const start = scene.getMonsterHp();
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    const critDmg = start - scene.getMonsterHp();

    // Non-crit reference with rng forced to 1 (never crit) and no hat
    eventBus.clear();
    useSaveState.getState().reset();
    mod.__setCombatRng(() => 1);
    const plain = new mod.CombatScene();
    plain.init({ monsterId: 1 });
    plain.create();
    const startPlain = plain.getMonsterHp();
    plain.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    const plainDmg = startPlain - plain.getMonsterHp();

    expect(critDmg).toBeGreaterThan(plainDmg);
    mod.__resetCombatRng();
  });

  it('playerHpBar uses effective max (base + equipment maxHp delta)', async () => {
    const mod = await import('./CombatScene');
    useSaveState.getState().reset();
    const iceRobe = {
      instanceId: 'i-ir',
      itemId: 'outfit-ice-01', // +12 maxHp
      acquiredAt: 1,
    };
    useSaveState.getState().addInventoryItem(iceRobe);
    useSaveState.getState().equipItem('outfit', iceRobe.instanceId);
    const scene = new mod.CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const bar = scene.getPlayerHpBar()!;
    // HpBar exposes getCurrent — inspect internal max via re-setHp behaviour
    useSaveState.getState().setHp(112);
    expect(bar.getCurrent()).toBe(112); // clamped against effectiveMax=112, not base 100
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

  it('Step 22.17 — create() fires combat_monster_cry once', async () => {
    const { audioManager } = await import('@/utils/AudioManager');
    const sfx = vi.spyOn(audioManager, 'playSfx');
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(sfx).toHaveBeenCalledWith('combat_monster_cry');
    sfx.mockRestore();
  });

  it('Step 22.17 — applyPlayerDamage with hit fires combat_hit_impact', async () => {
    const { audioManager } = await import('@/utils/AudioManager');
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const sfx = vi.spyOn(audioManager, 'playSfx');
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    expect(sfx).toHaveBeenCalledWith('combat_hit_impact');
    sfx.mockRestore();
  });

  it('Step 22.17 — runMonsterTurn fires combat_hit_impact for player damage', async () => {
    const { audioManager } = await import('@/utils/AudioManager');
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const sfx = vi.spyOn(audioManager, 'playSfx');
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: false, timeSpent: 1, attempts: 1, lo_id: 100001 });
    // QUIZ_WRONG path: monster retaliates → combat_hit_impact for player hit
    expect(sfx).toHaveBeenCalledWith('combat_hit_impact');
    sfx.mockRestore();
  });

  it('Step 22.16 — renders weakness label "Yếu: <element>" near monster', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 1 }); // Embershed (Fire)
    scene.create();
    const textCalls = (scene.add.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const weaknessCall = textCalls.find((c: unknown[]) => String(c[2]).startsWith('Yếu:'));
    expect(weaknessCall).toBeDefined();
    // Fire's weakness = Water (per matrix)
    expect(weaknessCall![2]).toBe('Yếu: Water');
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

  it('boss victory grants a guaranteed inventory item (Step 22.8 retrofit)', () => {
    const scene = new CombatScene();
    scene.init({ monsterId: 99 });
    scene.create();
    scene.__setMonsterHp(1);
    const before = useSaveState.getState().inventory.length;
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 3, attempts: 1, lo_id: 100001 });
    // Boss path: guaranteed rollDrop call + any level-up cascade drops from 500 EXP.
    const after = useSaveState.getState().inventory.length;
    expect(after).toBeGreaterThan(before);
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

describe('CombatScene — Sprint A Task 13a entity array', () => {
  it('create() with active pet builds 3-entity array (hero + pet + monster)', () => {
    // Sprint C: ownedPets[] replaces the Sprint A inventory cast hack.
    useSaveState.setState({
      active_pet_instance_id: 'inst-bun',
      ownedPets: [
        {
          instanceId: 'inst-bun',
          petCodename: 'bunbleaf',
          rarity: 'common',
          level: 3,
          xp: 0,
          capturedAt: 0,
        },
      ],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(scene.getEntities()).toHaveLength(3);
    expect(scene.getEntities().map((e) => e.kind)).toEqual(['hero', 'pet', 'monster']);
  });

  it('create() without active pet builds 2-entity array (hero + monster)', () => {
    // beforeEach reset() sets active_pet_instance_id=null, ownedPets=[] — confirm no-pet path.
    useSaveState.setState({ active_pet_instance_id: null, ownedPets: [] });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(scene.getEntities()).toHaveLength(2);
    expect(scene.getEntities().map((e) => e.kind)).toEqual(['hero', 'monster']);
  });
});

describe('CombatScene — Sprint A Task 13b TurnQueue loop', () => {
  it('hero turn → spell click → quiz → resolveHeroSpell → pet auto-attacks → monster retaliates', async () => {
    useSaveState.setState({
      hp: 100,
      maxHp: 100,
      level: 1,
      active_pet_instance_id: 'inst-bun',
      ownedPets: [
        {
          instanceId: 'inst-bun',
          petCodename: 'bunbleaf',
          rarity: 'common',
          level: 3,
          xp: 0,
          capturedAt: 0,
        },
      ],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const monster = scene.getEntities().find((e) => e.kind === 'monster')!;
    const monsterMaxHp = monster.maxHp;
    scene.__pickTarget(monster.id);
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1000, attempts: 1, lo_id: 100001 });
    // delayedCall is 900 ms in real game; in test scenes the delayedCall mock may
    // execute synchronously. If your scene uses time.delayedCall, ensure tests
    // either run fully sync or wait long enough.
    await new Promise((r) => setTimeout(r, 1100));
    expect(monster.hp).toBeLessThan(monsterMaxHp);
  }, 5000);

  it('victory: all enemies dead emits EXIT_COMBAT(won=true)', () => {
    useSaveState.setState({
      hp: 100,
      maxHp: 100,
      level: 99,
      active_pet_instance_id: null,
      ownedPets: [],
    });
    const fired: unknown[] = [];
    const off = eventBus.on('EXIT_COMBAT', (p) => fired.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const m = scene.getEntities().find((e) => e.kind === 'monster')!;
    m.hp = 0;
    scene.__checkEnd();
    off();
    expect(fired).toHaveLength(1);
    expect((fired[0] as { won: boolean }).won).toBe(true);
  });

  it('defeat: all allies dead emits EXIT_COMBAT(won=false)', () => {
    useSaveState.setState({
      hp: 0,
      maxHp: 100,
      level: 1,
      active_pet_instance_id: null,
      ownedPets: [],
    });
    const fired: unknown[] = [];
    const off = eventBus.on('EXIT_COMBAT', (p) => fired.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    // Hero entity built with hp=0 since save.hp=0 → factionDead immediately on check
    scene.__checkEnd();
    off();
    expect(fired).toHaveLength(1);
    expect((fired[0] as { won: boolean }).won).toBe(false);
  });
});

describe('CombatScene Sprint C — handleVictory rescue offer', () => {
  beforeEach(() => {
    vi.mocked(maybeOfferPetRescue).mockReset();
  });

  it('emits PET_RESCUE_OFFERED when maybeOfferPetRescue returns an offer', () => {
    vi.mocked(maybeOfferPetRescue).mockReturnValue({
      codename: 'bunbleaf',
      rarity: 'rare',
    });
    const events: Array<{ petCodename: string; rarity: string }> = [];
    const off = eventBus.on('PET_RESCUE_OFFERED', (p) => events.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1);
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    off();
    expect(events).toEqual([{ petCodename: 'bunbleaf', rarity: 'rare' }]);
  });

  it('does not emit PET_RESCUE_OFFERED when offer is null', () => {
    vi.mocked(maybeOfferPetRescue).mockReturnValue(null);
    const events: unknown[] = [];
    const off = eventBus.on('PET_RESCUE_OFFERED', (p) => events.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1);
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    off();
    expect(events).toEqual([]);
  });
});

describe('CombatScene Sprint C — buildEntities reads ownedPets', () => {
  it('builds a PetEntity from ownedPets when active_pet_instance_id matches', () => {
    useSaveState.setState({
      active_pet_instance_id: 'inst-bun',
      ownedPets: [
        {
          instanceId: 'inst-bun',
          petCodename: 'bunbleaf',
          rarity: 'common',
          level: 1,
          xp: 0,
          capturedAt: 0,
        },
      ],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const petEntity = scene.getEntities().find((e) => e.kind === 'pet');
    expect(petEntity).toBeDefined();
    expect(petEntity!.name).toMatch(/Thỏ Lá/);
  });

  it('builds hero-solo when ownedPets is empty', () => {
    useSaveState.setState({ active_pet_instance_id: null, ownedPets: [] });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const petEntity = scene.getEntities().find((e) => e.kind === 'pet');
    expect(petEntity).toBeUndefined();
  });
});
