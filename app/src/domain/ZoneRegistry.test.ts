import { describe, expect, it } from 'vitest';
import { ISLANDS, getIsland, getActiveIslands, getZone, getZoneByZoneId } from './ZoneRegistry';

describe('ZoneRegistry', () => {
  it('declares exactly 8 islands', () => {
    expect(ISLANDS).toHaveLength(8);
  });

  it('marks exactly 3 islands as active and 5 as locked', () => {
    expect(ISLANDS.filter((i) => i.status === 'active')).toHaveLength(3);
    expect(ISLANDS.filter((i) => i.status === 'locked')).toHaveLength(5);
  });

  it('uses unique island IDs', () => {
    const ids = ISLANDS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('forces active islands to forest/volcanic/frozen exactly', () => {
    const active = getActiveIslands()
      .map((i) => i.id)
      .sort();
    expect(active).toEqual(['forest', 'frozen', 'volcanic']);
  });

  it('every active island has a zone with 3 path monsters and 1 boss', () => {
    for (const island of getActiveIslands()) {
      expect(island.zone).not.toBeNull();
      expect(island.zone!.pathMonsters).toHaveLength(3);
      expect(typeof island.zone!.bossId).toBe('number');
    }
  });

  it('every locked island has zone === null', () => {
    for (const island of ISLANDS.filter((i) => i.status === 'locked')) {
      expect(island.zone).toBeNull();
    }
  });

  it('getZone returns the zone for an active island and null for locked', () => {
    expect(getZone('forest')).not.toBeNull();
    expect(getZone('astral')).toBeNull();
  });

  it('getIsland returns null for unknown id', () => {
    expect(getIsland('nope' as never)).toBeNull();
  });

  it('getZoneByZoneId resolves zone by ZoneDef.id', () => {
    const zone = getZoneByZoneId('forest-island');
    expect(zone).not.toBeNull();
    expect(zone!.islandId).toBe('forest');
  });

  it('getZoneByZoneId returns null for unknown zoneId', () => {
    expect(getZoneByZoneId('nope-island')).toBeNull();
  });
});
