/**
 * Monster registry — AP v1.1 Appendix A (Phase 1 subset = 5 starters).
 *
 * Full 20-roster deferred to Phase 2 per CEO review.
 * Sprite paths are Antigravity-delivered — placeholder fallback used until arrival.
 */

import type { Element } from '@/types/element';

export interface MonsterDef {
  id: number;
  codename: string;
  displayNameVi: string;
  element: Element;
  tier: 'starter' | 'mid' | 'boss' | 'rare';
  baseHp: number;
  spritePath: string; // placeholder OK; fallback rectangle if not loaded
  placeholderColor: number;
}

const ELEMENT_COLORS: Record<Element, number> = {
  Fire: 0xff6b35,
  Water: 0x00b4d8,
  Earth: 0x774936,
  Ice: 0xcaf0f8,
  Storm: 0xffd60a,
  Plant: 0x7cb342,
  Shadow: 0x10002b,
  Astral: 0x7209b7,
};

export const STARTER_MONSTERS: MonsterDef[] = [
  {
    id: 1,
    codename: 'embershed',
    displayNameVi: 'Đom Đóm Lửa',
    element: 'Fire',
    tier: 'starter',
    baseHp: 40,
    spritePath: '/assets/monsters/embershed_idle_128.png',
    placeholderColor: ELEMENT_COLORS.Fire,
  },
  {
    id: 4,
    codename: 'tidus',
    displayNameVi: 'Rái Cá Sóng',
    element: 'Water',
    tier: 'starter',
    baseHp: 42,
    spritePath: '/assets/monsters/tidus_idle_128.png',
    placeholderColor: ELEMENT_COLORS.Water,
  },
  {
    id: 7,
    codename: 'applepot',
    displayNameVi: 'Táo Gai',
    element: 'Plant',
    tier: 'starter',
    baseHp: 45,
    spritePath: '/assets/monsters/applepot_idle_128.png',
    placeholderColor: ELEMENT_COLORS.Plant,
  },
  {
    id: 10,
    codename: 'frostfang',
    displayNameVi: 'Cáo Tuyết',
    element: 'Ice',
    tier: 'starter',
    baseHp: 40,
    spritePath: '/assets/monsters/frostfang_idle_128.png',
    placeholderColor: ELEMENT_COLORS.Ice,
  },
  {
    id: 13,
    codename: 'voltee',
    displayNameVi: 'Điện Điểu',
    element: 'Storm',
    tier: 'starter',
    baseHp: 38,
    spritePath: '/assets/monsters/voltee_idle_128.png',
    placeholderColor: ELEMENT_COLORS.Storm,
  },
];

export function findMonsterById(id: number): MonsterDef | undefined {
  return STARTER_MONSTERS.find((m) => m.id === id);
}
