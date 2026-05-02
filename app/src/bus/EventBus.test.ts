import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '@bus/EventBus';

beforeEach(() => {
  eventBus.clear();
});

describe('Sprint B EventBus events', () => {
  it('ENTER_ZONE accepts { zoneId }', () => {
    let captured: { zoneId: string } | null = null;
    const off = eventBus.on('ENTER_ZONE', (p) => {
      captured = p;
    });
    eventBus.emit('ENTER_ZONE', { zoneId: 'forest-island' });
    off();
    expect(captured).toEqual({ zoneId: 'forest-island' });
  });

  it('EXIT_ZONE carries reason union', () => {
    const reasons: Array<'retreat' | 'completed'> = [];
    const off = eventBus.on('EXIT_ZONE', ({ reason }) => reasons.push(reason));
    eventBus.emit('EXIT_ZONE', { zoneId: 'forest-island', reason: 'retreat' });
    eventBus.emit('EXIT_ZONE', { zoneId: 'forest-island', reason: 'completed' });
    off();
    expect(reasons).toEqual(['retreat', 'completed']);
  });

  it('BOSS_DEFEATED carries bossId and zoneId', () => {
    let captured: { bossId: string; zoneId: string } | null = null;
    const off = eventBus.on('BOSS_DEFEATED', (p) => {
      captured = p;
    });
    eventBus.emit('BOSS_DEFEATED', { bossId: 'forest-boss', zoneId: 'forest-island' });
    off();
    expect(captured).toEqual({ bossId: 'forest-boss', zoneId: 'forest-island' });
  });

  it('CHEST_OPENED carries items array', () => {
    let count = -1;
    const off = eventBus.on('CHEST_OPENED', (p) => {
      count = p.items.length;
    });
    eventBus.emit('CHEST_OPENED', {
      chestId: 'forest-boss-chest',
      zoneId: 'forest-island',
      items: [{ itemId: 'wand-fire-01', qty: 1 }],
    });
    off();
    expect(count).toBe(1);
  });

  it('LOCKED_ISLAND_HINT carries islandId', () => {
    let captured: { islandId: string } | null = null;
    const off = eventBus.on('LOCKED_ISLAND_HINT', (p) => {
      captured = p;
    });
    eventBus.emit('LOCKED_ISLAND_HINT', { islandId: 'shadow' });
    off();
    expect(captured).toEqual({ islandId: 'shadow' });
  });
});
