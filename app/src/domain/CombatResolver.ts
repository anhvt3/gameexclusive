/**
 * CombatResolver — Sprint A damage application for multi-party combat.
 *
 * Pure logic + one side-effect: emits `TURN_RESOLVED` after a successful
 * resolution. Mutates `target.hp` directly (entities are scene-local
 * objects rebuilt every ENTER_COMBAT — mutation is intentional and
 * scoped). Tests inject `rng` for determinism.
 */

import { eventBus } from '@bus/EventBus';
import type { Element } from '@/types/element';
import type { CombatEntity } from '@/types/combat';
import { getMultiplier } from './ElementMatrix';
import {
  PET_DAMAGE_BASE_MULTIPLIER,
  PET_DAMAGE_JITTER_PCT,
  HERO_SPELL_DIFFICULTY_BONUS,
  CRIT_DAMAGE_MULTIPLIER,
} from '@data/staticConfig/combatConstants';

export interface ResolveResult {
  damage: number;
  isCrit: boolean;
  multiplier: number;
  remainingHp: number;
}

interface HeroSpellArgs {
  source: CombatEntity;
  target: CombatEntity;
  spellElement: Element;
  spellBasePower: number;
  difficulty: number;
  heroCritChancePct: number;
  heroSpellDamagePct: Partial<Record<Element, number>>;
  rng: () => number;
}

interface PetAttackArgs {
  source: CombatEntity;
  target: CombatEntity;
  rng: () => number;
}

interface MonsterAttackArgs {
  source: CombatEntity;
  target: CombatEntity;
  rng: () => number;
}

function emitResolved(args: {
  source: CombatEntity;
  target: CombatEntity;
  action: 'spell' | 'pet-attack' | 'monster-attack';
  damage: number;
  isCrit: boolean;
}): number {
  const remainingHp = Math.max(0, args.target.hp - args.damage);
  args.target.hp = remainingHp;
  eventBus.emit('TURN_RESOLVED', {
    sourceId: args.source.id,
    targetIds: [args.target.id],
    action: args.action,
    damage: args.damage,
    isCrit: args.isCrit,
    remainingHp,
  });
  return remainingHp;
}

export function resolveHeroSpell(args: HeroSpellArgs): ResolveResult {
  const {
    source,
    target,
    spellElement,
    spellBasePower,
    difficulty,
    heroCritChancePct,
    heroSpellDamagePct,
    rng,
  } = args;

  if (target.hp <= 0) {
    return { damage: 0, isCrit: false, multiplier: 1, remainingHp: 0 };
  }

  const base = spellBasePower * (1 + difficulty * HERO_SPELL_DIFFICULTY_BONUS);
  const multiplier = getMultiplier(spellElement, target.element);
  const isCrit = target.isCrittable && rng() < heroCritChancePct / 100;
  const critMul = isCrit ? CRIT_DAMAGE_MULTIPLIER : 1;
  const elementBonusPct = heroSpellDamagePct[spellElement] ?? 0;
  const raw = base * multiplier * critMul * (1 + elementBonusPct / 100);
  const damage = Math.max(0, Math.round(raw));
  const remainingHp = emitResolved({
    source,
    target,
    action: 'spell',
    damage,
    isCrit,
  });
  return { damage, isCrit, multiplier, remainingHp };
}

export function resolvePetAttack(args: PetAttackArgs): ResolveResult {
  const { source, target, rng } = args;
  if (target.hp <= 0) {
    return { damage: 0, isCrit: false, multiplier: 1, remainingHp: 0 };
  }
  const base = source.level * PET_DAMAGE_BASE_MULTIPLIER;
  const multiplier = getMultiplier(source.element, target.element);
  const jitter = 1 + (rng() * 2 - 1) * PET_DAMAGE_JITTER_PCT;
  const damage = Math.max(0, Math.round(base * multiplier * jitter));
  const remainingHp = emitResolved({
    source,
    target,
    action: 'pet-attack',
    damage,
    isCrit: false,
  });
  return { damage, isCrit: false, multiplier, remainingHp };
}

export function resolveMonsterAttack(args: MonsterAttackArgs): ResolveResult {
  const { source, target } = args;
  if (target.hp <= 0) {
    return { damage: 0, isCrit: false, multiplier: 1, remainingHp: 0 };
  }
  const base = source.kind === 'monster' ? source.attackPower : 10;
  const multiplier = getMultiplier(source.element, target.element);
  const damage = Math.max(0, Math.round(base * multiplier));
  const remainingHp = emitResolved({
    source,
    target,
    action: 'monster-attack',
    damage,
    isCrit: false,
  });
  return { damage, isCrit: false, multiplier, remainingHp };
}
