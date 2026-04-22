import { describe, it, expect } from 'vitest';
import {
  ITEM_SLOTS,
  ITEM_RARITIES,
  EquipmentSlotSchema,
  ItemRaritySchema,
  ItemModifierSchema,
  InventoryItemSchema,
  EquipmentMapSchema,
  EMPTY_EQUIPMENT,
} from './item';

describe('item types — enums + schemas', () => {
  it('ITEM_SLOTS covers 4 equipment slots (hat/outfit/wand/shoes)', () => {
    expect(ITEM_SLOTS).toEqual(['hat', 'outfit', 'wand', 'shoes']);
    expect(EquipmentSlotSchema.parse('hat')).toBe('hat');
    expect(() => EquipmentSlotSchema.parse('cape')).toThrow();
  });

  it('ITEM_RARITIES covers common/rare/epic/legendary', () => {
    expect(ITEM_RARITIES).toEqual(['common', 'rare', 'epic', 'legendary']);
    expect(ItemRaritySchema.parse('legendary')).toBe('legendary');
    expect(() => ItemRaritySchema.parse('mythic')).toThrow();
  });

  it('ItemModifierSchema accepts each CL7 kind', () => {
    expect(ItemModifierSchema.parse({ kind: 'maxHp', delta: 10 })).toMatchObject({
      kind: 'maxHp',
    });
    expect(
      ItemModifierSchema.parse({ kind: 'spellDamage', element: 'Fire', pct: 5 })
    ).toMatchObject({ kind: 'spellDamage' });
    expect(ItemModifierSchema.parse({ kind: 'critChance', pct: 3 }).kind).toBe('critChance');
    expect(ItemModifierSchema.parse({ kind: 'expGain', pct: 2 }).kind).toBe('expGain');
  });

  it('ItemModifierSchema rejects unknown kind', () => {
    expect(() => ItemModifierSchema.parse({ kind: 'coinDrop', pct: 1 })).toThrow();
  });

  it('ItemModifierSchema rejects spellDamage with bad element', () => {
    expect(() =>
      ItemModifierSchema.parse({ kind: 'spellDamage', element: 'Lightning', pct: 1 })
    ).toThrow();
  });

  it('InventoryItemSchema requires all fields', () => {
    const ok = InventoryItemSchema.parse({
      instanceId: 'uuid-1',
      itemId: 'hat-apprentice-01',
      acquiredAt: 1700000000000,
    });
    expect(ok.instanceId).toBe('uuid-1');
    expect(() =>
      InventoryItemSchema.parse({ instanceId: '', itemId: 'x', acquiredAt: 1 })
    ).toThrow();
  });

  it('EquipmentMapSchema requires all 4 slots (nullable)', () => {
    expect(EquipmentMapSchema.parse(EMPTY_EQUIPMENT)).toEqual(EMPTY_EQUIPMENT);
    expect(() => EquipmentMapSchema.parse({ hat: null, outfit: null })).toThrow();
  });

  it('EMPTY_EQUIPMENT has all 4 slots = null', () => {
    expect(EMPTY_EQUIPMENT).toEqual({ hat: null, outfit: null, wand: null, shoes: null });
  });
});
