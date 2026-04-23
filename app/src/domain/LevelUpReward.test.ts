import { describe, it, expect } from 'vitest';
import { filterByLevel, rollDrop } from './LevelUpReward';
import type { ItemDef } from '@data/staticConfig/items';
import { ITEM_REGISTRY } from '@data/staticConfig/items';

function makeItem(overrides: Partial<ItemDef> & Pick<ItemDef, 'id'>): ItemDef {
  return {
    id: overrides.id,
    slot: overrides.slot ?? 'hat',
    displayNameVi: overrides.displayNameVi ?? 'x',
    rarity: overrides.rarity ?? 'common',
    iconKey: overrides.iconKey ?? 'k',
    spriteKey: overrides.spriteKey ?? 'k',
    iconPath: overrides.iconPath ?? 'p',
    spritePath: overrides.spritePath ?? 'p',
    modifiers: overrides.modifiers ?? [],
    drop_weight: overrides.drop_weight ?? 10,
    minLevel: overrides.minLevel ?? 1,
  };
}

describe('LevelUpReward — filterByLevel', () => {
  it('excludes items with minLevel > current level', () => {
    const pool = [makeItem({ id: 'a', minLevel: 1 }), makeItem({ id: 'b', minLevel: 5 })];
    expect(filterByLevel(pool, 3).map((i) => i.id)).toEqual(['a']);
  });

  it('excludes items with drop_weight === 0', () => {
    const pool = [makeItem({ id: 'a', drop_weight: 10 }), makeItem({ id: 'b', drop_weight: 0 })];
    expect(filterByLevel(pool, 10).map((i) => i.id)).toEqual(['a']);
  });
});

describe('LevelUpReward — rollDrop', () => {
  it('empty pool → null', () => {
    expect(rollDrop({ pool: [], level: 1 })).toBeNull();
  });

  it('all items gated by minLevel → null', () => {
    const pool = [makeItem({ id: 'hi', minLevel: 99 })];
    expect(rollDrop({ pool, level: 1 })).toBeNull();
  });

  it('all items have drop_weight 0 → null', () => {
    const pool = [makeItem({ id: 'a', drop_weight: 0, minLevel: 1 })];
    expect(rollDrop({ pool, level: 1 })).toBeNull();
  });

  it('single-item pool → always that item', () => {
    const pool = [makeItem({ id: 'only' })];
    const result = rollDrop({ pool, level: 1, rng: () => 0 });
    expect(result?.id).toBe('only');
  });

  it('deterministic with fixed rng → reproducible pick', () => {
    const pool = [
      makeItem({ id: 'a', drop_weight: 10 }),
      makeItem({ id: 'b', drop_weight: 10 }),
      makeItem({ id: 'c', drop_weight: 10 }),
    ];
    // total=30. rng=0 → target 0 → "a" (target -10 < 0 after first)
    expect(rollDrop({ pool, level: 1, rng: () => 0 })?.id).toBe('a');
    // rng=0.5 → target 15 → "b" (15-10=5, then 5-10<0)
    expect(rollDrop({ pool, level: 1, rng: () => 0.5 })?.id).toBe('b');
    // rng=0.99 → target ~29.7 → "c"
    expect(rollDrop({ pool, level: 1, rng: () => 0.99 })?.id).toBe('c');
  });

  it('higher drop_weight wins more often over many rolls', () => {
    const pool = [
      makeItem({ id: 'rare', drop_weight: 1 }),
      makeItem({ id: 'common', drop_weight: 99 }),
    ];
    let rareCount = 0;
    let commonCount = 0;
    const samples = 2000;
    // Deterministic linear sweep to avoid flakiness — covers the full [0,1) range.
    for (let i = 0; i < samples; i++) {
      const r = i / samples;
      const dropped = rollDrop({ pool, level: 1, rng: () => r });
      if (dropped?.id === 'rare') rareCount++;
      else if (dropped?.id === 'common') commonCount++;
    }
    expect(commonCount).toBeGreaterThan(rareCount * 20);
  });

  it('drop_weight=0 item never picked even when in pool', () => {
    const pool = [
      makeItem({ id: 'ghost', drop_weight: 0 }),
      makeItem({ id: 'real', drop_weight: 5 }),
    ];
    for (let i = 0; i < 100; i++) {
      const r = i / 100;
      expect(rollDrop({ pool, level: 1, rng: () => r })?.id).toBe('real');
    }
  });

  it('works against real ITEM_REGISTRY at level 1 (common-only)', () => {
    const dropped = rollDrop({ pool: ITEM_REGISTRY, level: 1, rng: () => 0 });
    expect(dropped).not.toBeNull();
    expect(dropped!.minLevel).toBeLessThanOrEqual(1);
  });

  it('registry at level 4 includes epic items in eligible set', () => {
    const eligible = filterByLevel(ITEM_REGISTRY, 4);
    expect(eligible.some((i) => i.rarity === 'epic')).toBe(true);
  });
});
