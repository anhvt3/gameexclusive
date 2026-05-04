import { describe, expect, it } from 'vitest';
import {
  petThresholdForLevel,
  evolutionStage,
  evolutionMultiplier,
  applyPetXp,
} from './PetLeveling';
import type { PetInstance } from '@/types/pet';

function mkPet(over: Partial<PetInstance> = {}): PetInstance {
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

describe('petThresholdForLevel', () => {
  it('mirrors the hero curve for levels 1-5', () => {
    expect(petThresholdForLevel(1)).toBeGreaterThan(0);
    expect(petThresholdForLevel(2)).toBeGreaterThan(petThresholdForLevel(1));
    expect(petThresholdForLevel(5)).toBeGreaterThan(petThresholdForLevel(4));
  });
});

describe('evolutionStage', () => {
  it('1-9 → stage 1', () => {
    expect(evolutionStage(1)).toBe(1);
    expect(evolutionStage(9)).toBe(1);
  });

  it('10-19 → stage 2', () => {
    expect(evolutionStage(10)).toBe(2);
    expect(evolutionStage(19)).toBe(2);
  });

  it('20+ → stage 3', () => {
    expect(evolutionStage(20)).toBe(3);
    expect(evolutionStage(99)).toBe(3);
  });
});

describe('evolutionMultiplier', () => {
  it('stage 1 = 1.0, stage 2 = 1.3, stage 3 = 1.6', () => {
    expect(evolutionMultiplier(1)).toBe(1.0);
    expect(evolutionMultiplier(2)).toBe(1.3);
    expect(evolutionMultiplier(3)).toBe(1.6);
  });
});

describe('applyPetXp', () => {
  it('no level up when xp under threshold', () => {
    const pet = mkPet({ level: 1, xp: 0 });
    const result = applyPetXp(pet, 1, 5); // gain 5, hero level 1 cap
    expect(result.pet.level).toBe(1);
    expect(result.pet.xp).toBe(5);
    expect(result.levelUps).toEqual([]);
  });

  it('single level up records the new level + evolved flag', () => {
    const t1 = petThresholdForLevel(1);
    const pet = mkPet({ level: 1, xp: 0 });
    const result = applyPetXp(pet, 5, t1); // gain exactly threshold
    expect(result.pet.level).toBe(2);
    expect(result.pet.xp).toBe(0);
    expect(result.levelUps).toEqual([{ newLevel: 2, evolved: false }]);
  });

  it('multi-level cascade through 9→10 sets evolved=true', () => {
    const pet = mkPet({ level: 9, xp: 0 });
    const t = petThresholdForLevel(9);
    const result = applyPetXp(pet, 99, t * 2); // big gain
    expect(result.pet.level).toBeGreaterThanOrEqual(10);
    const tenth = result.levelUps.find((l) => l.newLevel === 10);
    expect(tenth).toBeDefined();
    expect(tenth!.evolved).toBe(true);
  });

  it('multi-level cascade through 19→20 sets evolved=true', () => {
    const pet = mkPet({ level: 19, xp: 0 });
    const t = petThresholdForLevel(19);
    const result = applyPetXp(pet, 99, t * 2);
    const twentieth = result.levelUps.find((l) => l.newLevel === 20);
    expect(twentieth).toBeDefined();
    expect(twentieth!.evolved).toBe(true);
  });

  it('caps at heroLevel — pet.level never exceeds hero.level', () => {
    const pet = mkPet({ level: 5, xp: 0 });
    const result = applyPetXp(pet, 5, 999_999); // huge gain, hero cap 5
    expect(result.pet.level).toBe(5);
    // remaining xp accumulates but is bounded to threshold-1 (held back at cap)
    expect(result.pet.xp).toBeLessThan(petThresholdForLevel(5));
    expect(result.levelUps).toEqual([]);
  });

  it('does nothing when amount is 0 or negative', () => {
    const pet = mkPet({ level: 1, xp: 10 });
    expect(applyPetXp(pet, 5, 0).pet.xp).toBe(10);
    expect(applyPetXp(pet, 5, -5).pet.xp).toBe(10);
  });
});
