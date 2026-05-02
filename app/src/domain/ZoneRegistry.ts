/**
 * ZoneRegistry — Sprint B Task 1 lookup helpers over ISLANDS static config.
 *
 * Pure domain layer: no React, no Phaser. Re-exports the immutable ISLANDS
 * array and offers id-based lookups used by world map + zone scenes.
 */

import type { IslandDef, IslandId, ZoneDef } from '@/types/zone';
import { ISLANDS as ISLANDS_DATA } from '@/data/staticConfig/islands';

export const ISLANDS = ISLANDS_DATA;

export function getIsland(id: IslandId): IslandDef | null {
  return ISLANDS.find((i) => i.id === id) ?? null;
}

export function getZone(islandId: IslandId): ZoneDef | null {
  return getIsland(islandId)?.zone ?? null;
}

export function getActiveIslands(): ReadonlyArray<IslandDef> {
  return ISLANDS.filter((i) => i.status === 'active');
}

/**
 * Lookup helper keyed by `ZoneDef.id` (e.g. 'forest-island'), as opposed to
 * `getZone` which is keyed by `IslandId` (e.g. 'forest'). ZoneScene/BossHallScene
 * receive a `zoneId` string in their `init(data)` payload, so this is the
 * accessor they use.
 */
export function getZoneByZoneId(zoneId: string): ZoneDef | null {
  for (const island of ISLANDS) {
    if (island.zone?.id === zoneId) return island.zone;
  }
  return null;
}
