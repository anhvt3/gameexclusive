/**
 * CombatEntity — Sprint A multi-party combat tag union.
 *
 * Hero, pet, and monster entities all flow through the same TurnQueue
 * and CombatResolver. The `kind` discriminator lets TypeScript narrow
 * to the right shape inside scene logic.
 */

import type { Element } from './element';

export type CombatEntityKind = 'hero' | 'pet' | 'monster';
export type Faction = 'ally' | 'enemy';

interface CombatEntityBase {
  /** Unique per-combat instance id (regenerated each ENTER_COMBAT). */
  id: string;
  kind: CombatEntityKind;
  faction: Faction;
  /** Display label above HP bar. */
  name: string;
  element: Element;
  level: number;
  hp: number;
  maxHp: number;
  /** Phaser texture key for combat-scene render. */
  spriteKey: string;
  /** Bosses can flag false to disable crits against them. */
  isCrittable: boolean;
}

export interface HeroEntity extends CombatEntityBase {
  kind: 'hero';
  faction: 'ally';
}

export interface PetEntity extends CombatEntityBase {
  kind: 'pet';
  faction: 'ally';
  /** Links back to SaveState.inventory for level/xp/persistence. */
  petInstanceId: string;
  /** Baseline pet damage before element multiplier (from PetDef). */
  attackPower: number;
}

export interface MonsterEntity extends CombatEntityBase {
  kind: 'monster';
  faction: 'enemy';
  monsterDefId: number;
  attackPower: number;
  isBoss: boolean;
}

export type CombatEntity = HeroEntity | PetEntity | MonsterEntity;
