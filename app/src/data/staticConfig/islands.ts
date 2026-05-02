/**
 * ISLANDS — Sprint B Task 1 static config (8 islands; 3 active + 5 locked).
 *
 * Phase 1 ships Forest / Volcanic / Frozen as fully playable zones; remaining
 * 5 islands render as locked silhouettes on the world map (zone=null).
 *
 * Monster IDs reference `STARTER_MONSTERS` / `BOSS_MONSTERS` in monsters.ts.
 * Sprint B Phase 1 only has 5 starters + 1 boss available, so all 3 active
 * islands reuse the daily boss (id=99) and a starter trio matched per element
 * theme. The full per-zone monster roster is deferred to Phase 2 per CEO scope.
 */

import type { IslandDef } from '@/types/zone';

export const ISLANDS: ReadonlyArray<IslandDef> = [
  {
    id: 'forest',
    displayName: 'Đảo Rừng Xanh',
    element: 'Plant',
    status: 'active',
    worldMapAnchor: { x: 480, y: 320 },
    iconKey: 'island-icon-forest',
    requiredLevel: 1,
    zone: {
      id: 'forest-island',
      islandId: 'forest',
      bgEntrance: 'forest-entrance-bg-1280x720',
      bgPath: 'forest-path-bg-1280x720',
      bgBossHall: 'forest-boss-hall-bg-1280x720',
      walkableEntrance: 'forest-entrance-walkable-1280x720',
      walkablePath: 'forest-path-walkable-1280x720',
      walkableBossHall: 'forest-boss-hall-walkable-1280x720',
      // Phase 1: reuse starter roster (full per-zone monsters → Phase 2).
      pathMonsters: [7, 1, 13],
      bossId: 99,
      bossAnchor: { x: 640, y: 420 },
      chestAnchor: { x: 640, y: 480 },
      chest: {
        id: 'forest-boss-chest',
        rewardItems: [
          { itemId: 'wand-fire-01', qty: 1 },
          { itemId: 'hat-fire-01', qty: 1 },
        ],
      },
      playerSpawn: {
        entrance: { x: 100, y: 600 },
        path: { x: 80, y: 600 },
        bossHall: { x: 640, y: 660 },
      },
    },
  },
  {
    id: 'volcanic',
    displayName: 'Đảo Núi Lửa',
    element: 'Fire',
    status: 'active',
    worldMapAnchor: { x: 1280, y: 280 },
    iconKey: 'island-icon-volcanic',
    requiredLevel: 1,
    zone: {
      id: 'volcanic-island',
      islandId: 'volcanic',
      bgEntrance: 'volcanic-entrance-bg-1280x720',
      bgPath: 'volcanic-path-bg-1280x720',
      bgBossHall: 'volcanic-boss-hall-bg-1280x720',
      walkableEntrance: 'volcanic-entrance-walkable-1280x720',
      walkablePath: 'volcanic-path-walkable-1280x720',
      walkableBossHall: 'volcanic-boss-hall-walkable-1280x720',
      pathMonsters: [1, 13, 7],
      bossId: 99,
      bossAnchor: { x: 640, y: 420 },
      chestAnchor: { x: 640, y: 480 },
      chest: {
        id: 'volcanic-boss-chest',
        // Plan called for `wand-fire-02` (not in items.ts) — substitute with closest existing.
        rewardItems: [{ itemId: 'wand-fire-01', qty: 1 }],
      },
      playerSpawn: {
        entrance: { x: 100, y: 600 },
        path: { x: 80, y: 600 },
        bossHall: { x: 640, y: 660 },
      },
    },
  },
  {
    id: 'frozen',
    displayName: 'Đảo Băng Giá',
    element: 'Ice',
    status: 'active',
    worldMapAnchor: { x: 1500, y: 540 },
    iconKey: 'island-icon-frozen',
    requiredLevel: 1,
    zone: {
      id: 'frozen-island',
      islandId: 'frozen',
      bgEntrance: 'frozen-entrance-bg-1280x720',
      bgPath: 'frozen-path-bg-1280x720',
      bgBossHall: 'frozen-boss-hall-bg-1280x720',
      walkableEntrance: 'frozen-entrance-walkable-1280x720',
      walkablePath: 'frozen-path-walkable-1280x720',
      walkableBossHall: 'frozen-boss-hall-walkable-1280x720',
      pathMonsters: [10, 4, 13],
      bossId: 99,
      bossAnchor: { x: 640, y: 420 },
      chestAnchor: { x: 640, y: 480 },
      chest: {
        id: 'frozen-boss-chest',
        rewardItems: [{ itemId: 'outfit-ice-01', qty: 1 }],
      },
      playerSpawn: {
        entrance: { x: 100, y: 600 },
        path: { x: 80, y: 600 },
        bossHall: { x: 640, y: 660 },
      },
    },
  },
  // 5 locked silhouettes — zone=null until Phase 2 unlocks.
  {
    id: 'storm',
    displayName: 'Đảo Bão Tố',
    element: 'Storm',
    status: 'locked',
    worldMapAnchor: { x: 1500, y: 820 },
    iconKey: 'island-icon-storm',
    requiredLevel: 5,
    zone: null,
  },
  {
    id: 'ocean',
    displayName: 'Đảo Đại Dương',
    element: 'Water',
    status: 'locked',
    worldMapAnchor: { x: 960, y: 920 },
    iconKey: 'island-icon-ocean',
    requiredLevel: 5,
    zone: null,
  },
  {
    id: 'earth',
    displayName: 'Đảo Đất Nung',
    element: 'Earth',
    status: 'locked',
    worldMapAnchor: { x: 420, y: 820 },
    iconKey: 'island-icon-earth',
    requiredLevel: 7,
    zone: null,
  },
  {
    id: 'astral',
    displayName: 'Đảo Tinh Hà',
    // Astral element exists but is locked; placeholder Storm per plan.
    element: 'Storm',
    status: 'locked',
    worldMapAnchor: { x: 220, y: 540 },
    iconKey: 'island-icon-astral',
    requiredLevel: 9,
    zone: null,
  },
  {
    id: 'shadow',
    displayName: 'Đảo Bóng Tối',
    // Shadow element exists but is locked; placeholder Fire per plan.
    element: 'Fire',
    status: 'locked',
    worldMapAnchor: { x: 960, y: 180 },
    iconKey: 'island-icon-shadow',
    requiredLevel: 12,
    zone: null,
  },
];
