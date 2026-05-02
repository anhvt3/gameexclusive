/**
 * LockedIslandTooltip — Sprint B Task 8.
 *
 * Listens to LOCKED_ISLAND_HINT events fired by WorldMapScene when the user
 * taps a grey-tinted (status=locked) island marker. Surfaces a center-screen
 * "Sắp ra mắt" toast for the matching island, then auto-hides after
 * LOCKED_ISLAND_TOOLTIP_MS so it never blocks subsequent input.
 *
 * Layer rule (AP 3.1): React overlay; MUST NOT import Phaser. Talks to the
 * Phaser scene exclusively through @bus/EventBus + @/domain/ZoneRegistry.
 */

import { useEffect, useState } from 'react';
import { eventBus } from '@bus/EventBus';
import { getIsland } from '@/domain/ZoneRegistry';
import type { IslandId } from '@/types/zone';

export const LOCKED_ISLAND_TOOLTIP_MS = 2500;

export function LockedIslandTooltip() {
  const [islandId, setIslandId] = useState<IslandId | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = eventBus.on('LOCKED_ISLAND_HINT', ({ islandId: id }) => {
      const lookup = getIsland(id as IslandId);
      if (!lookup) {
        // Unknown id — ignore quietly so no stale tooltip appears.
        return;
      }
      setIslandId(id as IslandId);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIslandId(null), LOCKED_ISLAND_TOOLTIP_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      off();
    };
  }, []);

  if (!islandId) return null;
  const island = getIsland(islandId);
  if (!island) return null;

  return (
    <div
      data-testid="locked-island-tooltip"
      role="status"
      className="pointer-events-none fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white shadow-lg"
    >
      {island.displayName} — Sắp ra mắt
    </div>
  );
}
