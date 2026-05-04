import { describe, expect, it } from 'vitest';
import { buildPetEntity } from './PetEntityFactory';
import { ATK_PER_LEVEL, HP_PER_LEVEL, type PetInstance } from '@/types/pet';

function mkInstance(over: Partial<PetInstance> = {}): PetInstance {
  return {
    instanceId: 'inst-1',
    petCodename: 'bunbleaf',
    rarity: 'common',
    level: 1,
    xp: 0,
    capturedAt: 0,
    ...over,
  };
}

describe('buildPetEntity — Sprint A', () => {
  it('returns null when activePetInstanceId is null', () => {
    expect(buildPetEntity(null, [])).toBeNull();
  });

  it('returns null when instance not in inventory', () => {
    expect(buildPetEntity('missing', [])).toBeNull();
  });

  it('returns null when instance refers to unknown petDef codename', () => {
    const inv = [
      {
        instanceId: 'i',
        petCodename: 'not-a-pet',
        rarity: 'common',
        level: 1,
        xp: 0,
        capturedAt: 0,
      } as never,
    ];
    expect(buildPetEntity('i', inv)).toBeNull();
  });

  it('builds PetEntity from valid instance + def', () => {
    const inv = [mkInstance({ instanceId: 'i', petCodename: 'bunbleaf', level: 3 })];
    const e = buildPetEntity('i', inv);
    expect(e).not.toBeNull();
    expect(e?.kind).toBe('pet');
    expect(e?.element).toBe('Plant');
    expect(e?.level).toBe(3);
    // Sprint C: level 3 common → baseHp + 2*HP_PER_LEVEL = 60 + 10 = 70
    expect(e?.maxHp).toBe(60 + 2 * HP_PER_LEVEL);
    expect(e?.hp).toBe(60 + 2 * HP_PER_LEVEL);
    expect(e?.attackPower).toBe(8 + 2 * ATK_PER_LEVEL);
    expect(e?.spriteKey).toBe('pet_bunbleaf_idle');
  });
});

describe('buildPetEntity — rarity + evolution multipliers', () => {
  it('common level 1 → flat baseHp / attackPower (multipliers all 1.0)', () => {
    const inst = mkInstance({ rarity: 'common', level: 1 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent).not.toBeNull();
    expect(ent!.maxHp).toBe(60); // bunbleaf baseHp = 60
    expect(ent!.attackPower).toBe(8); // bunbleaf attackPower = 8
  });

  it('rare level 1 → baseHp × 1.15, atk × 1.15 (rounded)', () => {
    const inst = mkInstance({ rarity: 'rare', level: 1 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.maxHp).toBe(Math.round(60 * 1.15));
    expect(ent!.attackPower).toBe(Math.round(8 * 1.15));
  });

  it('legendary level 1 → 1.6× baseHp, 1.6× atk', () => {
    const inst = mkInstance({ rarity: 'legendary', level: 1 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.maxHp).toBe(Math.round(60 * 1.6));
    expect(ent!.attackPower).toBe(Math.round(8 * 1.6));
  });

  it('common level 5 adds level bonus +20 HP +4 ATK', () => {
    const inst = mkInstance({ rarity: 'common', level: 5 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.maxHp).toBe(60 + 4 * HP_PER_LEVEL);
    expect(ent!.attackPower).toBe(8 + 4 * ATK_PER_LEVEL);
  });

  it('epic level 10 (stage 2) → baseHp × 1.3 (rarity) × 1.3 (evo) + 9 levels', () => {
    const inst = mkInstance({ rarity: 'epic', level: 10 });
    const ent = buildPetEntity('inst-1', [inst]);
    const expected = Math.round(60 * 1.3 * 1.3) + 9 * HP_PER_LEVEL;
    expect(ent!.maxHp).toBe(expected);
  });

  it('legendary level 20 (stage 3) → baseHp × 1.6 × 1.6 + 19 levels', () => {
    const inst = mkInstance({ rarity: 'legendary', level: 20 });
    const ent = buildPetEntity('inst-1', [inst]);
    const expected = Math.round(60 * 1.6 * 1.6) + 19 * HP_PER_LEVEL;
    expect(ent!.maxHp).toBe(expected);
  });

  it('hp === maxHp on a fresh entity (full health at combat start)', () => {
    const inst = mkInstance({ rarity: 'rare', level: 5 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.hp).toBe(ent!.maxHp);
  });
});
