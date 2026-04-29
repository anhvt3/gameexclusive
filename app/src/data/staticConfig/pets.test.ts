import { describe, expect, it } from 'vitest';
import { STARTER_PETS, findPetDef, type PetDef } from './pets';

describe('STARTER_PETS registry', () => {
  it('has six entries one per element family', () => {
    expect(STARTER_PETS).toHaveLength(6);
    const elements = STARTER_PETS.map((p) => p.element);
    expect(elements).toContain('Plant');
    expect(elements).toContain('Fire');
    expect(elements).toContain('Water');
    expect(elements).toContain('Ice');
    expect(elements).toContain('Storm');
    expect(elements).toContain('Earth');
  });

  it('every pet has a unique codename', () => {
    const names = STARTER_PETS.map((p) => p.codename);
    expect(new Set(names).size).toBe(STARTER_PETS.length);
  });

  it('every pet has positive baseHp + attackPower', () => {
    for (const p of STARTER_PETS) {
      expect(p.baseHp).toBeGreaterThan(0);
      expect(p.attackPower).toBeGreaterThan(0);
    }
  });

  it('findPetDef returns the matching def', () => {
    const bun = findPetDef('bunbleaf');
    expect(bun?.element).toBe('Plant');
  });

  it('findPetDef returns undefined for unknown codename', () => {
    expect(findPetDef('not-a-pet' as never)).toBeUndefined();
  });

  it('PetDef shape compiles', () => {
    const p: PetDef = {
      codename: 'bunbleaf',
      displayNameVi: 'Thỏ Lá',
      element: 'Plant',
      baseHp: 60,
      attackPower: 8,
    };
    expect(p.element).toBe('Plant');
  });
});
