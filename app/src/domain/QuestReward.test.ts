import { describe, expect, it } from 'vitest';
import { rollQuestReward, RARITY_FILTER } from './QuestReward';
import { ITEM_REGISTRY } from '@data/staticConfig/items';

describe('RARITY_FILTER', () => {
  it('common→common, rare→rare, epic→epic', () => {
    expect(RARITY_FILTER.common).toEqual(['common']);
    expect(RARITY_FILTER.rare).toEqual(['rare']);
    expect(RARITY_FILTER.epic).toEqual(['epic']);
  });
});

describe('rollQuestReward', () => {
  it('returns a common item for daily tier', () => {
    const item = rollQuestReward('common', 1, () => 0);
    expect(item).not.toBeNull();
    expect(item!.rarity).toBe('common');
  });

  it('returns a rare item for weekly tier', () => {
    const item = rollQuestReward('rare', 5, () => 0);
    expect(item).not.toBeNull();
    expect(item!.rarity).toBe('rare');
  });

  it('returns an epic item for main tier', () => {
    const item = rollQuestReward('epic', 10, () => 0);
    expect(item).not.toBeNull();
    expect(item!.rarity).toBe('epic');
  });

  it('respects rollDrop minLevel filter', () => {
    const item = rollQuestReward('common', 1, () => 0);
    if (item) {
      expect(item.minLevel).toBeLessThanOrEqual(1);
    }
  });

  it('uses ITEM_REGISTRY as the pool', () => {
    const validIds = new Set(ITEM_REGISTRY.map((i) => i.id));
    const item = rollQuestReward('common', 1, () => 0);
    if (item) {
      expect(validIds).toContain(item.id);
    }
  });
});
