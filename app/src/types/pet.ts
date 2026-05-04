/**
 * Pet system types — Sprint C.
 *
 * PetInstance is what lives in SaveState.ownedPets[]. PetDef stays in
 * data/staticConfig/pets.ts (Sprint A) — this file is just the runtime
 * shapes that combat + UI consume.
 */

import type { PetDef } from '@data/staticConfig/pets';

export type PetCodename = PetDef['codename'];

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PetEvolutionStage = 1 | 2 | 3;

export type MonsterBucket = 'weak' | 'mid' | 'boss';

export interface PetInstance {
  readonly instanceId: string;
  readonly petCodename: PetCodename;
  readonly rarity: PetRarity;
  level: number;
  xp: number;
  readonly capturedAt: number;
}

/** Visual + reward weighting. Order matters — higher index = rarer. */
export const PET_RARITIES: ReadonlyArray<PetRarity> = ['common', 'rare', 'epic', 'legendary'];

/** Stat multipliers per rarity (gentle scaling, ElementSystem-safe). */
export const RARITY_HP_MULT: Readonly<Record<PetRarity, number>> = {
  common: 1.0,
  rare: 1.15,
  epic: 1.3,
  legendary: 1.6,
};

export const RARITY_ATK_MULT: Readonly<Record<PetRarity, number>> = {
  common: 1.0,
  rare: 1.15,
  epic: 1.3,
  legendary: 1.6,
};

/** Evolution stat multipliers (additive on top of rarity). */
export const EVOLUTION_HP_MULT: Readonly<Record<PetEvolutionStage, number>> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
};

export const EVOLUTION_ATK_MULT: Readonly<Record<PetEvolutionStage, number>> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
};

/** Per-level additive bonuses (applied on top of rarity × evolution). */
export const HP_PER_LEVEL = 5;
export const ATK_PER_LEVEL = 1;

/** Hard cap on owned pets — soft cap with release-picker UI at limit. */
export const ROSTER_CAP = 12;

/** Visual cue colors (Tailwind class fragments — used by overlay + inventory). */
export const RARITY_BORDER_CLASS: Readonly<Record<PetRarity, string>> = {
  common: 'border-slate-400',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-amber-400',
};

export const RARITY_GLOW_CLASS: Readonly<Record<PetRarity, string>> = {
  common: '',
  rare: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  epic: 'shadow-[0_0_12px_rgba(168,85,247,0.7)]',
  legendary: 'shadow-[0_0_18px_rgba(251,191,36,0.8)]',
};

export const RARITY_LABEL_VI: Readonly<Record<PetRarity, string>> = {
  common: 'Thường',
  rare: 'Hiếm',
  epic: 'Sử thi',
  legendary: 'Huyền thoại',
};
