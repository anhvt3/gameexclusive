/**
 * STARTER_PETS — Sprint A pet registry.
 *
 * Six pets, one per primary element family. Codenames match Antigravity
 * art batch (`assets/pets/<codename>_<state>_256.png`). Stats are
 * starter-tier; later sprints scale via PetInstance.level.
 */

import type { Element } from '@/types/element';

export interface PetDef {
  codename: 'bunbleaf' | 'pyropup' | 'aquakit' | 'frostfae' | 'voltchick' | 'terraowl';
  displayNameVi: string;
  element: Element;
  baseHp: number;
  attackPower: number;
}

export const STARTER_PETS: readonly PetDef[] = [
  { codename: 'bunbleaf', displayNameVi: 'Thỏ Lá', element: 'Plant', baseHp: 60, attackPower: 8 },
  { codename: 'pyropup', displayNameVi: 'Cún Lửa', element: 'Fire', baseHp: 55, attackPower: 9 },
  { codename: 'aquakit', displayNameVi: 'Rái Nước', element: 'Water', baseHp: 65, attackPower: 7 },
  { codename: 'frostfae', displayNameVi: 'Tiên Băng', element: 'Ice', baseHp: 50, attackPower: 9 },
  { codename: 'voltchick', displayNameVi: 'Gà Sấm', element: 'Storm', baseHp: 55, attackPower: 8 },
  { codename: 'terraowl', displayNameVi: 'Cú Đất', element: 'Earth', baseHp: 70, attackPower: 7 },
] as const;

export function findPetDef(codename: PetDef['codename']): PetDef | undefined {
  return STARTER_PETS.find((p) => p.codename === codename);
}
