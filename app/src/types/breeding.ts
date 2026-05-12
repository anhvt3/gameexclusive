/**
 * Phase 3 — Breeding types (AP §11.11).
 *
 * Pure types — no logic. Consumed by Tasks 3, 5, 6, 11, 14.
 */

import type { PetCodename, PetRarity } from './pet';
import type { Element } from './element';

export type PetInstanceId = string;

export interface BreedingSession {
  readonly parentA: PetInstanceId;
  readonly parentB: PetInstanceId;
  readonly startedAt: number;
  readonly durationMs: number;
  readonly costBattleStars: number;
  readonly offspringSpec: {
    readonly codename: PetCodename;
    readonly rarity: PetRarity;
    readonly level: number;
  };
}

export interface CompatResult {
  readonly level: 'low' | 'medium' | 'high';
  readonly multiplier: number;
}

export interface OffspringSpec {
  readonly codename: PetCodename;
  readonly rarity: PetRarity;
  readonly level: number;
  readonly costBattleStars: number;
}

export interface BreedingPair {
  readonly elementA: Element;
  readonly elementB: Element;
  readonly offspringCodename: PetCodename;
}

export type BreedingFailureReason =
  | 'chamber_busy'
  | 'roster_full'
  | 'parent_not_found'
  | 'same_parent'
  | 'insufficient_stars'
  | 'server_hmac_mismatch'
  | 'server_bad_nonce'
  | 'server_fetch_failed_soft_allow'
  | 'no_active_session'
  | 'not_ready';
