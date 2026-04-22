/**
 * ElementSystem — AP v1.1 Section 5 CL1
 *
 * 8-element rock-paper-scissors damage formula.
 * Pure TypeScript, framework-free — testable độc lập Phaser/React.
 *
 * Contract:
 *   ELEMENTS: 8 elements (Fire/Water/Earth/Ice/Storm/Plant/Shadow/Astral)
 *   getMultiplier(atk, def): lookup from fixed matrix — throws on invalid
 *   calculateDamage(power, atk, def, difficulty, isCrit): scaled damage
 *
 * Multiplier set: {0.5, 1.0, 1.5, 2.0}
 * Damage formula: power × multiplier × (1 + difficulty/10) × (crit ? 1.5 : 1.0)
 */

export { ELEMENTS } from '@/types/element';
export type { Element } from '@/types/element';

import { ELEMENTS, type Element } from '@/types/element';

/**
 * Rock-paper-scissors matrix. Value = damage multiplier from attacker to defender.
 * Rule: strong matchup = 2.0, weak matchup = 0.5, 1.5 = secondary strength, 1.0 = neutral.
 *
 * Chain:
 *   Fire → Plant → Water → Fire (core triangle)
 *   Ice → Plant, Earth → Storm, Storm → Water, Shadow → Astral, Astral → Shadow
 *   Water ↔ Fire, Plant ↔ Earth secondary
 */
const MATRIX: Record<Element, Record<Element, number>> = {
  Fire: {
    Fire: 1.0,
    Water: 0.5,
    Earth: 1.0,
    Ice: 1.5,
    Storm: 1.0,
    Plant: 2.0,
    Shadow: 1.0,
    Astral: 1.0,
  },
  Water: {
    Fire: 2.0,
    Water: 1.0,
    Earth: 1.5,
    Ice: 0.5,
    Storm: 1.0,
    Plant: 0.5,
    Shadow: 1.0,
    Astral: 1.0,
  },
  Earth: {
    Fire: 1.5,
    Water: 0.5,
    Earth: 1.0,
    Ice: 1.0,
    Storm: 2.0,
    Plant: 0.5,
    Shadow: 1.0,
    Astral: 1.0,
  },
  Ice: {
    Fire: 0.5,
    Water: 0.5,
    Earth: 1.0,
    Ice: 1.0,
    Storm: 1.5,
    Plant: 2.0,
    Shadow: 1.0,
    Astral: 1.0,
  },
  Storm: {
    Fire: 1.0,
    Water: 2.0,
    Earth: 0.5,
    Ice: 0.5,
    Storm: 1.0,
    Plant: 1.0,
    Shadow: 1.5,
    Astral: 1.0,
  },
  Plant: {
    Fire: 0.5,
    Water: 2.0,
    Earth: 1.5,
    Ice: 0.5,
    Storm: 1.0,
    Plant: 1.0,
    Shadow: 1.0,
    Astral: 1.0,
  },
  Shadow: {
    Fire: 1.0,
    Water: 1.0,
    Earth: 1.0,
    Ice: 1.0,
    Storm: 0.5,
    Plant: 1.5,
    Shadow: 1.0,
    Astral: 2.0,
  },
  Astral: {
    Fire: 1.0,
    Water: 1.0,
    Earth: 1.0,
    Ice: 1.0,
    Storm: 1.0,
    Plant: 1.0,
    Shadow: 2.0,
    Astral: 1.0,
  },
};

function assertElement(e: Element): void {
  if (!(ELEMENTS as readonly string[]).includes(e)) {
    throw new Error(`[ElementSystem] Invalid element: "${e}"`);
  }
}

/** Damage multiplier for attacker element vs defender element. */
export function getMultiplier(attacker: Element, defender: Element): number {
  assertElement(attacker);
  assertElement(defender);
  const row = MATRIX[attacker];
  const value = row[defender];
  return value;
}

/**
 * Calculate final damage.
 *   final = max(0, round(power × multiplier × (1 + difficulty/10) × (crit ? 1.5 : 1.0)))
 *
 * @param power        spell base power (>= 0)
 * @param attacker     element of spell
 * @param defender     element of target
 * @param difficulty   LO difficulty 1-5 (scales ×1.1 to ×1.5)
 * @param isCrit       crit hit flag
 */
export function calculateDamage(
  power: number,
  attacker: Element,
  defender: Element,
  difficulty: number,
  isCrit: boolean
): number {
  const mult = getMultiplier(attacker, defender);
  const diffScale = 1 + difficulty / 10;
  const critScale = isCrit ? 1.5 : 1.0;
  const raw = power * mult * diffScale * critScale;
  return Math.max(0, Math.round(raw));
}
