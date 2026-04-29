/**
 * PetEntityFactory — Sprint A bridge from SaveState pet instance to a
 * combat-ready PetEntity. Returns null when no pet is active or any
 * lookup fails — CombatScene treats null as "hero solo" path.
 */

import type { PetEntity } from '@/types/combat';
import { findPetDef, type PetDef } from '@data/staticConfig/pets';

/**
 * SaveState pet instance shape. Sprint C will land the full inventory
 * model; for Sprint A we accept the minimal shape needed to build a
 * PetEntity. The cast to `never` in tests keeps coupling loose.
 */
export interface PetInstanceShape {
  instanceId: string;
  petCodename: PetDef['codename'];
  level: number;
  xp: number;
}

export function buildPetEntity(
  activePetInstanceId: string | null,
  inventory: PetInstanceShape[]
): PetEntity | null {
  if (!activePetInstanceId) return null;
  const inst = inventory.find((p) => p.instanceId === activePetInstanceId);
  if (!inst) return null;
  const def = findPetDef(inst.petCodename);
  if (!def) return null;
  return {
    id: `pet-${inst.instanceId}`,
    kind: 'pet',
    faction: 'ally',
    name: def.displayNameVi,
    element: def.element,
    level: inst.level,
    hp: def.baseHp,
    maxHp: def.baseHp,
    spriteKey: `pet_${def.codename}_idle`,
    isCrittable: false,
    petInstanceId: inst.instanceId,
    attackPower: def.attackPower,
  };
}
