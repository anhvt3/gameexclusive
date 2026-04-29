import { describe, expect, it, beforeEach, vi } from 'vitest';
import { resolveHeroSpell, resolvePetAttack, resolveMonsterAttack } from './CombatResolver';
import { eventBus } from '@bus/EventBus';
import type { CombatEntity } from '@/types/combat';

function hero(): CombatEntity {
  return {
    id: 'h',
    kind: 'hero',
    faction: 'ally',
    name: 'Hero',
    element: 'Fire',
    level: 1,
    hp: 100,
    maxHp: 100,
    spriteKey: '',
    isCrittable: true,
  };
}

function pet(level = 3): CombatEntity {
  return {
    id: 'p',
    kind: 'pet',
    faction: 'ally',
    name: 'Pet',
    element: 'Plant',
    level,
    hp: 60,
    maxHp: 60,
    spriteKey: '',
    isCrittable: false,
    petInstanceId: 'i',
    attackPower: 8,
  };
}

function monster(element: 'Plant' | 'Water' | 'Fire' = 'Plant', hp = 40): CombatEntity {
  return {
    id: 'm',
    kind: 'monster',
    faction: 'enemy',
    name: 'Mon',
    element,
    level: 1,
    hp,
    maxHp: 40,
    spriteKey: '',
    isCrittable: true,
    monsterDefId: 1,
    attackPower: 10,
    isBoss: false,
  };
}

describe('CombatResolver — Sprint A', () => {
  let busSpy: ReturnType<typeof vi.fn>;
  let off: () => void;

  beforeEach(() => {
    busSpy = vi.fn();
    off = eventBus.on('TURN_RESOLVED', busSpy as any);
  });

  function teardown() {
    off();
  }

  it('hero spell vs Plant target with Fire = ×2 multiplier', () => {
    const r = resolveHeroSpell({
      source: hero(),
      target: monster('Plant'),
      spellElement: 'Fire',
      spellBasePower: 12,
      difficulty: 1,
      heroCritChancePct: 0,
      heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.99,
    });
    expect(r.damage).toBe(26);
    expect(r.isCrit).toBe(false);
    expect(r.multiplier).toBe(2.0);
    teardown();
  });

  it('hero crit applies CRIT_DAMAGE_MULTIPLIER 1.5x', () => {
    const r = resolveHeroSpell({
      source: hero(),
      target: monster('Plant'),
      spellElement: 'Fire',
      spellBasePower: 10,
      difficulty: 1,
      heroCritChancePct: 100,
      heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.0,
    });
    expect(r.damage).toBe(33);
    expect(r.isCrit).toBe(true);
    teardown();
  });

  it('pet attack uses PET_DAMAGE_BASE_MULTIPLIER × level', () => {
    const r = resolvePetAttack({
      source: pet(3),
      target: monster('Plant'),
      rng: () => 0.5,
    });
    expect(r.damage).toBe(24);
    teardown();
  });

  it('pet element advantage doubles damage', () => {
    const r = resolvePetAttack({
      source: pet(3),
      target: monster('Water'),
      rng: () => 0.5,
    });
    expect(r.damage).toBe(48);
    teardown();
  });

  it('pet jitter stays within ±10% across 20 samples', () => {
    let min = Infinity,
      max = -Infinity;
    for (let i = 0; i < 20; i++) {
      const r = resolvePetAttack({
        source: pet(10),
        target: monster('Plant'),
        rng: Math.random,
      });
      min = Math.min(min, r.damage);
      max = Math.max(max, r.damage);
    }
    expect(min).toBeGreaterThanOrEqual(72);
    expect(max).toBeLessThanOrEqual(88);
    teardown();
  });

  it('monster attack flat damage no jitter', () => {
    const r = resolveMonsterAttack({
      source: monster('Fire'),
      target: hero(),
      rng: () => 0.0,
    });
    expect(r.damage).toBe(10);
    teardown();
  });

  it('damage clamps to >= 0', () => {
    const t = monster('Plant', 0);
    const r = resolvePetAttack({ source: pet(0), target: t, rng: () => 0.5 });
    expect(r.damage).toBeGreaterThanOrEqual(0);
    teardown();
  });

  it('emits TURN_RESOLVED with correct shape', () => {
    resolveHeroSpell({
      source: hero(),
      target: monster('Plant'),
      spellElement: 'Fire',
      spellBasePower: 12,
      difficulty: 1,
      heroCritChancePct: 0,
      heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.99,
    });
    expect(busSpy).toHaveBeenCalledTimes(1);
    expect(busSpy.mock.calls[0]?.[0]).toMatchObject({
      sourceId: 'h',
      targetIds: ['m'],
      action: 'spell',
    });
    teardown();
  });

  it('resolver mutates target hp', () => {
    const t = monster('Plant', 40);
    resolvePetAttack({ source: pet(3), target: t, rng: () => 0.5 });
    expect(t.hp).toBeLessThan(40);
    teardown();
  });

  it('target hp does not go below 0', () => {
    const t = monster('Plant', 5);
    resolvePetAttack({ source: pet(10), target: t, rng: () => 0.5 });
    expect(t.hp).toBe(0);
    teardown();
  });

  it('non-crittable target ignores crit roll', () => {
    const boss = { ...monster('Plant'), isCrittable: false };
    const r = resolveHeroSpell({
      source: hero(),
      target: boss,
      spellElement: 'Fire',
      spellBasePower: 10,
      difficulty: 1,
      heroCritChancePct: 100,
      heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.0,
    });
    expect(r.isCrit).toBe(false);
    teardown();
  });

  it('dead target short-circuits — no event, no damage', () => {
    const t = monster('Plant', 0);
    busSpy.mockClear();
    const r = resolvePetAttack({ source: pet(3), target: t, rng: () => 0.5 });
    expect(r.damage).toBe(0);
    expect(busSpy).not.toHaveBeenCalled();
    teardown();
  });
});
