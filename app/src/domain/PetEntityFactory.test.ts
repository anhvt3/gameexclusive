import { describe, expect, it } from 'vitest';
import { buildPetEntity } from './PetEntityFactory';

describe('buildPetEntity — Sprint A', () => {
  it('returns null when activePetInstanceId is null', () => {
    expect(buildPetEntity(null, [])).toBeNull();
  });

  it('returns null when instance not in inventory', () => {
    expect(buildPetEntity('missing', [])).toBeNull();
  });

  it('returns null when instance refers to unknown petDef codename', () => {
    const inv = [{ instanceId: 'i', petCodename: 'not-a-pet', level: 1, xp: 0 } as never];
    expect(buildPetEntity('i', inv)).toBeNull();
  });

  it('builds PetEntity from valid instance + def', () => {
    const inv = [{ instanceId: 'i', petCodename: 'bunbleaf', level: 3, xp: 0 } as never];
    const e = buildPetEntity('i', inv);
    expect(e).not.toBeNull();
    expect(e?.kind).toBe('pet');
    expect(e?.element).toBe('Plant');
    expect(e?.level).toBe(3);
    expect(e?.maxHp).toBe(60);
    expect(e?.hp).toBe(60);
    expect(e?.attackPower).toBe(8);
    expect(e?.spriteKey).toBe('pet_bunbleaf_idle');
  });
});
