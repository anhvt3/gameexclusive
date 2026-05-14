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

describe('Sprint C EventBus events', () => {
  it('PET_RESCUE_OFFERED carries codename and rarity', () => {
    let captured: { petCodename: string; rarity: string } | null = null;
    const off = eventBus.on('PET_RESCUE_OFFERED', (p) => {
      captured = p;
    });
    eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    off();
    expect(captured).toEqual({ petCodename: 'bunbleaf', rarity: 'rare' });
  });

  it('PET_COLLECTED carries instanceId, codename, rarity', () => {
    let captured: any = null;
    const off = eventBus.on('PET_COLLECTED', (p) => {
      captured = p;
    });
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: 'inst-1',
      petCodename: 'bunbleaf',
      rarity: 'rare',
    });
    off();
    expect(captured.petInstanceId).toBe('inst-1');
  });

  it('PET_RELEASED carries reason union', () => {
    const reasons: string[] = [];
    const off = eventBus.on('PET_RELEASED', (p) => reasons.push(p.reason));
    eventBus.emit('PET_RELEASED', {
      petCodename: 'bunbleaf',
      rarity: 'rare',
      reason: 'rejected-offer',
    });
    eventBus.emit('PET_RELEASED', { petCodename: 'pyropup', rarity: 'epic', reason: 'manual' });
    off();
    expect(reasons).toEqual(['rejected-offer', 'manual']);
  });

  it('PET_LEVEL_UP carries petInstanceId, newLevel, evolved', () => {
    let captured: any = null;
    const off = eventBus.on('PET_LEVEL_UP', (p) => {
      captured = p;
    });
    eventBus.emit('PET_LEVEL_UP', {
      petInstanceId: 'inst-1',
      newLevel: 10,
      evolved: true,
    });
    off();
    expect(captured.evolved).toBe(true);
  });
});

describe('Sprint D EventBus events', () => {
  it('QUEST_PROGRESS carries questId and delta', () => {
    let captured: { questId: string; delta: number } | null = null;
    const off = eventBus.on('QUEST_PROGRESS', (p) => {
      captured = p;
    });
    eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    off();
    expect(captured).toEqual({ questId: 'daily-combat-3', delta: 1 });
  });

  it('CHEST_OPENED accepts optional label override', () => {
    let captured: any = null;
    const off = eventBus.on('CHEST_OPENED', (p) => {
      captured = p;
    });
    eventBus.emit('CHEST_OPENED', {
      chestId: 'quest-daily-combat-3',
      zoneId: 'quest-panel',
      items: [{ itemId: 'wand-fire-01', qty: 1 }],
      label: 'Đóng',
    });
    off();
    expect(captured.label).toBe('Đóng');
  });

  it('CHEST_OPENED label is optional — Sprint B emits still work without it', () => {
    let captured: any = null;
    const off = eventBus.on('CHEST_OPENED', (p) => {
      captured = p;
    });
    eventBus.emit('CHEST_OPENED', {
      chestId: 'forest-boss-chest',
      zoneId: 'forest-island',
      items: [{ itemId: 'wand-fire-01', qty: 1 }],
    });
    off();
    expect(captured.label).toBeUndefined();
  });
});

describe('Sprint F — daily reward events', () => {
  it('BATTLE_STARS_EARNED carries amount + total', () => {
    const received: Array<{ amount: number; total: number }> = [];
    const off = eventBus.on('BATTLE_STARS_EARNED', (p) => received.push(p));
    eventBus.emit('BATTLE_STARS_EARNED', { amount: 15, total: 175 });
    expect(received).toEqual([{ amount: 15, total: 175 }]);
    off();
  });

  it('LOOT_JAR_READY carries battlesSince', () => {
    const received: Array<{ battlesSince: number }> = [];
    const off = eventBus.on('LOOT_JAR_READY', (p) => received.push(p));
    eventBus.emit('LOOT_JAR_READY', { battlesSince: 3 });
    expect(received).toEqual([{ battlesSince: 3 }]);
    off();
  });

  it('LOGIN_CLAIMED carries dayOfCycle, streak, items', () => {
    const received: Array<{ dayOfCycle: number; streak: number; items: string[] }> = [];
    const off = eventBus.on('LOGIN_CLAIMED', (p) => received.push(p));
    eventBus.emit('LOGIN_CLAIMED', {
      dayOfCycle: 4,
      streak: 4,
      items: ['health-potion-small', 'mana-potion-small'],
    });
    expect(received).toEqual([
      { dayOfCycle: 4, streak: 4, items: ['health-potion-small', 'mana-potion-small'] },
    ]);
    off();
  });
});

describe('Phase 3 — shop + breeding events', () => {
  it('SHOP_STOCK_REFRESHED carries slots + anchorUtc7', () => {
    const received: Array<{ slots: unknown[]; anchorUtc7: number }> = [];
    const off = eventBus.on('SHOP_STOCK_REFRESHED', (p) => received.push(p));
    eventBus.emit('SHOP_STOCK_REFRESHED', { slots: [], anchorUtc7: 12345 });
    expect(received).toEqual([{ slots: [], anchorUtc7: 12345 }]);
    off();
  });

  it('SHOP_PURCHASE_COMPLETED carries itemId + priceCharged + stockRemaining', () => {
    const received: unknown[] = [];
    const off = eventBus.on('SHOP_PURCHASE_COMPLETED', (p) => received.push(p));
    eventBus.emit('SHOP_PURCHASE_COMPLETED', {
      itemId: 'hat-apprentice-01',
      priceCharged: 30,
      stockRemaining: 0,
    });
    expect(received).toHaveLength(1);
    off();
  });

  it('BREEDING_STARTED carries parents + duration + expectedRarity', () => {
    const received: unknown[] = [];
    const off = eventBus.on('BREEDING_STARTED', (p) => received.push(p));
    eventBus.emit('BREEDING_STARTED', {
      parentA: 'pet-a',
      parentB: 'pet-b',
      durationMs: 0,
      expectedRarity: 'rare',
    });
    expect(received).toHaveLength(1);
    off();
  });

  it('EGG_HATCHED carries offspring info', () => {
    const received: unknown[] = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    eventBus.emit('EGG_HATCHED', {
      offspringInstanceId: 'inst-xyz',
      rarity: 'rare',
      codename: 'aquakit',
    });
    expect(received).toHaveLength(1);
    off();
  });
});

describe('Phase 4 — EGG_HATCHED carries optional wasRushed', () => {
  it('accepts wasRushed=true', () => {
    const received: unknown[] = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    eventBus.emit('EGG_HATCHED', {
      offspringInstanceId: 'x',
      rarity: 'rare',
      codename: 'aquakit',
      wasRushed: true,
    });
    expect(received).toEqual([
      {
        offspringInstanceId: 'x',
        rarity: 'rare',
        codename: 'aquakit',
        wasRushed: true,
      },
    ]);
    off();
  });

  it('still accepts emit without wasRushed (backward-compat)', () => {
    const received: unknown[] = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    eventBus.emit('EGG_HATCHED', {
      offspringInstanceId: 'y',
      rarity: 'common',
      codename: 'pyropup',
    });
    expect(received).toHaveLength(1);
    off();
  });
});
