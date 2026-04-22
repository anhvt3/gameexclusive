import { describe, it, expect } from 'vitest';
import { ITEM_REGISTRY, findItemDef } from './items';
import { ItemModifierSchema } from '@/types/item';

describe('ITEM_REGISTRY — Phase 1 starter set (Appendix H)', () => {
  it('ships 10 items', () => {
    expect(ITEM_REGISTRY).toHaveLength(10);
  });

  it('covers 3 hats / 3 outfits / 3 wands / 1 boots', () => {
    const bySlot = ITEM_REGISTRY.reduce<Record<string, number>>((acc, i) => {
      acc[i.slot] = (acc[i.slot] ?? 0) + 1;
      return acc;
    }, {});
    expect(bySlot).toEqual({ hat: 3, outfit: 3, wand: 3, shoes: 1 });
  });

  it('all ids are unique', () => {
    const ids = ITEM_REGISTRY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every modifier passes ItemModifierSchema', () => {
    for (const item of ITEM_REGISTRY) {
      for (const mod of item.modifiers) {
        expect(() => ItemModifierSchema.parse(mod)).not.toThrow();
      }
    }
  });

  it('icon + sprite paths follow /assets/items/<slot>/<id>_{icon,sprite}.png', () => {
    for (const item of ITEM_REGISTRY) {
      expect(item.iconPath).toBe(`/assets/items/${item.slot}/${item.id}_icon.png`);
      expect(item.spritePath).toBe(`/assets/items/${item.slot}/${item.id}_sprite.png`);
    }
  });

  it('rarer items have lower drop_weight than common siblings', () => {
    const hats = ITEM_REGISTRY.filter((i) => i.slot === 'hat');
    const common = hats.find((i) => i.rarity === 'common')!;
    const rare = hats.find((i) => i.rarity === 'rare')!;
    const epic = hats.find((i) => i.rarity === 'epic')!;
    expect(common.drop_weight).toBeGreaterThan(rare.drop_weight);
    expect(rare.drop_weight).toBeGreaterThan(epic.drop_weight);
  });

  it('findItemDef resolves known id and returns undefined otherwise', () => {
    expect(findItemDef('hat-apprentice-01')?.slot).toBe('hat');
    expect(findItemDef('does-not-exist')).toBeUndefined();
  });
});
