/**
 * PetEntityFactory — bridge from a SaveState PetInstance to a
 * combat-ready PetEntity. Sprint C extends Sprint A's flat read with
 * rarity and evolution stat multipliers + per-level additive bonus.
 *
 * Stat formula:
 *   maxHp = round(def.baseHp × rarityMult × evoMult) + (level - 1) × HP_PER_LEVEL
 *   attackPower = round(def.attackPower × rarityMult × evoMult)
 *                 + (level - 1) × ATK_PER_LEVEL
 *
 * Returns null when no pet is active or any lookup fails.
 */

import type { PetEntity } from '@/types/combat';
import { findPetDef } from '@data/staticConfig/pets';
import {
  ATK_PER_LEVEL,
  HP_PER_LEVEL,
  RARITY_ATK_MULT,
  RARITY_HP_MULT,
  type PetInstance,
} from '@/types/pet';
import { evolutionMultiplier, evolutionStage } from './PetLeveling';

/** @deprecated Sprint C migrates to PetInstance. Kept for one release. */
export type PetInstanceShape = PetInstance;

export function buildPetEntity(
  activePetInstanceId: string | null,
  inventory: ReadonlyArray<PetInstance>
): PetEntity | null {
  if (!activePetInstanceId) return null;
  const inst = inventory.find((p) => p.instanceId === activePetInstanceId);
  if (!inst) return null;
  const def = findPetDef(inst.petCodename);
  if (!def) return null;

  const rarityHp = RARITY_HP_MULT[inst.rarity];
  const rarityAtk = RARITY_ATK_MULT[inst.rarity];
  const evoMult = evolutionMultiplier(evolutionStage(inst.level));
  const levelBonus = inst.level - 1;

  const maxHp = Math.round(def.baseHp * rarityHp * evoMult) + levelBonus * HP_PER_LEVEL;
  const attackPower =
    Math.round(def.attackPower * rarityAtk * evoMult) + levelBonus * ATK_PER_LEVEL;

  return {
    id: `pet-${inst.instanceId}`,
    kind: 'pet',
    faction: 'ally',
    name: def.displayNameVi,
    element: def.element,
    level: inst.level,
    hp: maxHp,
    maxHp,
    spriteKey: `pet_${def.codename}_idle`,
    isCrittable: false,
    petInstanceId: inst.instanceId,
    attackPower,
  };
}
