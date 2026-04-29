/**
 * ElementMatrix — Sprint A 8×8 rock-paper-scissors lookup.
 *
 * Multiplier convention: weak ×0.5, normal ×1.0, strong ×2.0.
 * Designed so every element has 1-3 strong counters; no element is
 * dominant (verified by unit test that no element wins all 7 matchups).
 *
 * Pairs not declared in ELEMENT_MATRIX default to 1.0 via getMultiplier.
 */

import type { Element } from '@/types/element';

const ALL_ELEMENTS: Element[] = [
  'Fire',
  'Water',
  'Plant',
  'Ice',
  'Storm',
  'Earth',
  'Astral',
  'Shadow',
];

export const ELEMENT_MATRIX: Record<Element, Partial<Record<Element, number>>> = {
  Fire: { Plant: 2.0, Ice: 2.0, Water: 0.5, Earth: 0.5 },
  Water: { Fire: 2.0, Earth: 2.0, Plant: 0.5, Storm: 0.5 },
  Plant: { Water: 2.0, Earth: 2.0, Fire: 0.5, Ice: 0.5 },
  Ice: { Plant: 2.0, Storm: 2.0, Fire: 0.5 },
  Storm: { Water: 2.0, Astral: 2.0, Earth: 0.5, Ice: 0.5 },
  Earth: { Fire: 2.0, Storm: 2.0, Shadow: 2.0, Plant: 0.5 },
  Astral: { Shadow: 2.0, Storm: 0.5 },
  Shadow: { Astral: 2.0, Earth: 0.5 },
};

/** Returns the damage multiplier when `attacker` element hits `defender`. */
export function getMultiplier(attacker: Element, defender: Element): number {
  return ELEMENT_MATRIX[attacker][defender] ?? 1.0;
}

/**
 * Returns the element with the highest multiplier vs `defender`. Used by
 * the combat HUD's "Yếu: <element>" hint label. Tie-breaks alphabetically
 * for determinism.
 */
export function getStrongestCounter(defender: Element): Element {
  let best: Element = 'Fire';
  let bestMul = 0;
  for (const attacker of ALL_ELEMENTS) {
    const m = getMultiplier(attacker, defender);
    if (m > bestMul || (m === bestMul && attacker < best)) {
      bestMul = m;
      best = attacker;
    }
  }
  return best;
}
