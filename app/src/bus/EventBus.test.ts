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
