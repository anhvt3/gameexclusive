import { describe, expect, it } from 'vitest';
import { ISLANDS } from '@/domain/ZoneRegistry';
import { ALL_MONSTERS } from '@/data/staticConfig/monsters';
import { ITEM_REGISTRY } from '@/data/staticConfig/items';

describe('islands static config', () => {
  it('all bg/walkable texture keys follow the canonical filename pattern', () => {
    const pattern = /^[a-z]+-(entrance|path|boss-hall)-(bg|walkable)-1280x720$/;
    for (const island of ISLANDS) {
      if (!island.zone) continue;
      const z = island.zone;
      expect(z.bgEntrance).toMatch(pattern);
      expect(z.bgPath).toMatch(pattern);
      expect(z.bgBossHall).toMatch(pattern);
      expect(z.walkableEntrance).toMatch(pattern);
      expect(z.walkablePath).toMatch(pattern);
      expect(z.walkableBossHall).toMatch(pattern);
    }
  });

  it('boss anchor and chest anchor lie within 1280x720', () => {
    for (const island of ISLANDS) {
      if (!island.zone) continue;
      expect(island.zone.bossAnchor.x).toBeGreaterThanOrEqual(0);
      expect(island.zone.bossAnchor.x).toBeLessThan(1280);
      expect(island.zone.bossAnchor.y).toBeGreaterThanOrEqual(0);
      expect(island.zone.bossAnchor.y).toBeLessThan(720);
      expect(island.zone.chestAnchor.x).toBeGreaterThanOrEqual(0);
      expect(island.zone.chestAnchor.x).toBeLessThan(1280);
    }
  });

  it('player spawn coords lie within 1280x720', () => {
    for (const island of ISLANDS) {
      if (!island.zone) continue;
      const screens = ['entrance', 'path', 'bossHall'] as const;
      for (const s of screens) {
        const p = island.zone.playerSpawn[s];
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(1280);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(720);
      }
    }
  });

  it('every pathMonster and bossId resolves to an existing monster', () => {
    const monsterIds = new Set(ALL_MONSTERS.map((m) => m.id));
    for (const island of ISLANDS) {
      if (!island.zone) continue;
      for (const id of island.zone.pathMonsters) {
        expect(monsterIds, `pathMonster ${id} on ${island.id}`).toContain(id);
      }
      expect(monsterIds, `bossId ${island.zone.bossId} on ${island.id}`).toContain(
        island.zone.bossId
      );
    }
  });

  it('every chest reward itemId resolves to an existing item', () => {
    const itemIds = new Set(ITEM_REGISTRY.map((i) => i.id));
    for (const island of ISLANDS) {
      if (!island.zone) continue;
      for (const reward of island.zone.chest.rewardItems) {
        expect(itemIds, `chest item ${reward.itemId} on ${island.id}`).toContain(reward.itemId);
      }
    }
  });
});
