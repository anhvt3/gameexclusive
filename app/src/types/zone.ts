/**
 * Zone & Island type definitions — Sprint B Task 1.
 *
 * Defines IslandDef / ZoneDef / ChestDef for the 8-island world map.
 * Pure types only — no runtime behavior.
 */

import type { Element } from './element';

/** Numeric monster id — matches `MonsterDef.id` in data/staticConfig/monsters.ts. */
export type MonsterId = number;

export type IslandId =
  | 'forest'
  | 'volcanic'
  | 'frozen'
  | 'storm'
  | 'ocean'
  | 'earth'
  | 'astral'
  | 'shadow';

export type ZoneScreen = 'entrance' | 'path' | 'bossHall';

export type IslandStatus = 'active' | 'locked';

export interface ChestDef {
  readonly id: string;
  readonly rewardItems: ReadonlyArray<{ readonly itemId: string; readonly qty: number }>;
}

export interface ZoneDef {
  readonly id: string;
  readonly islandId: IslandId;
  readonly bgEntrance: string;
  readonly bgPath: string;
  readonly bgBossHall: string;
  readonly walkableEntrance: string;
  readonly walkablePath: string;
  readonly walkableBossHall: string;
  readonly pathMonsters: ReadonlyArray<MonsterId>;
  readonly bossId: MonsterId;
  readonly bossAnchor: { readonly x: number; readonly y: number };
  readonly chestAnchor: { readonly x: number; readonly y: number };
  readonly chest: ChestDef;
  readonly playerSpawn: {
    readonly entrance: { readonly x: number; readonly y: number };
    readonly path: { readonly x: number; readonly y: number };
    readonly bossHall: { readonly x: number; readonly y: number };
  };
}

export interface IslandDef {
  readonly id: IslandId;
  readonly displayName: string;
  readonly element: Element;
  readonly status: IslandStatus;
  readonly worldMapAnchor: { readonly x: number; readonly y: number };
  readonly iconKey: string;
  readonly zone: ZoneDef | null;
  readonly requiredLevel: number;
}
