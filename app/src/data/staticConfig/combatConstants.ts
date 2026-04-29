/**
 * Combat balance constants — Sprint A multi-party combat.
 *
 * POSUP requirement (29/04/2026): every tunable balance number lives
 * here so phase-test rebalance can land without touching core combat
 * logic. Resolver / Pet / Hero formulas import from this file.
 */

/** Pet auto-attack base damage = pet.level × this. */
export const PET_DAMAGE_BASE_MULTIPLIER = 8;

/** ±jitter applied to pet damage to avoid robotic predictability. */
export const PET_DAMAGE_JITTER_PCT = 0.1;

/** Hero spell base bonus per quiz difficulty point (1-5 LO scale). */
export const HERO_SPELL_DIFFICULTY_BONUS = 0.1;

/** Multiplier when a hero spell crits (per AP §11.3). */
export const CRIT_DAMAGE_MULTIPLIER = 1.5;
