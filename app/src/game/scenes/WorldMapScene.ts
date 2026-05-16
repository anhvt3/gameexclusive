/**
 * WorldMapScene — Sprint B Task 8.
 *
 * Macro world map: 8 island markers (3 active, 5 grey-tinted locked).
 *  - Active click → emit ENTER_ZONE + start('ZoneScene', { zoneId, screen: 'entrance' })
 *  - Locked click → emit LOCKED_ISLAND_HINT for the React tooltip overlay
 *
 * Layer rule (AP 3.1): pure Phaser scene; MUST NOT import React.
 */

import Phaser from 'phaser';
import { ISLANDS, getIsland } from '@/domain/ZoneRegistry';
import type { IslandId } from '@/types/zone';
import { eventBus } from '@bus/EventBus';

export const WORLD_MAP_SCENE_KEY = 'WorldMapScene';

export class WorldMapScene extends Phaser.Scene {
  private markers: Phaser.GameObjects.Image[] = [];
  private lastTooltipIslandId: IslandId | null = null;

  constructor() {
    super(WORLD_MAP_SCENE_KEY);
  }

  create(): void {
    this.markers = [];
    this.lastTooltipIslandId = null;

    // Background — preloaded by PreloadScene (Sprint B Task 7).
    // Assets are now correctly exported at native design size (Antigravity
    // re-export per Appendix J, 2026-05-16), so no setDisplaySize needed.
    if (typeof this.add.image === 'function') {
      const bg = this.add.image(960, 540, 'world-map-bg');
      bg.setOrigin?.(0.5);
    }

    for (const island of ISLANDS) {
      const m = this.add.image(island.worldMapAnchor.x, island.worldMapAnchor.y, island.iconKey);
      m.setData?.('islandId', island.id);
      m.setInteractive?.({ useHandCursor: true });
      if (island.status === 'locked') {
        m.setTint?.(0x666666);
      }
      m.on?.('pointerdown', () => this.handleIslandClick(island.id));
      this.markers.push(m);
    }
  }

  private handleIslandClick(id: IslandId): void {
    const island = getIsland(id);
    if (!island) return;
    if (island.status === 'locked') {
      this.lastTooltipIslandId = id;
      eventBus.emit('LOCKED_ISLAND_HINT', { islandId: id });
      return;
    }
    if (island.zone) {
      eventBus.emit('ENTER_ZONE', { zoneId: island.zone.id });
      this.scene.start('ZoneScene', { zoneId: island.zone.id, screen: 'entrance' });
    }
  }

  /** Test helpers — exposed for unit + Playwright bridge use. */
  getMarkers(): Phaser.GameObjects.Image[] {
    return this.markers;
  }

  simulateClickIsland(id: IslandId): void {
    this.handleIslandClick(id);
  }

  getLastTooltipIslandId(): IslandId | null {
    return this.lastTooltipIslandId;
  }
}
