import { describe, it, expect } from 'vitest';
import { computeEffectiveStats, ZERO_STATS } from './EffectiveStats';
import type { EquipmentMap, InventoryItem } from '@/types/item';
import { ITEM_REGISTRY } from '@data/staticConfig/items';

const EMPTY: EquipmentMap = { hat: null, outfit: null, wand: null, shoes: null };

function instance(itemId: string, instanceId: string): InventoryItem {
  return { instanceId, itemId, acquiredAt: 1_700_000_000_000 };
}

describe('EffectiveStats — computeEffectiveStats', () => {
  it('no equipment → ZERO_STATS baseline', () => {
    expect(computeEffectiveStats(EMPTY, [], ITEM_REGISTRY)).toEqual(ZERO_STATS);
  });

  it('outfit-apprentice-01 (+5 maxHp) only affects maxHpDelta', () => {
    const inv = [instance('outfit-apprentice-01', 'ia')];
    const eq: EquipmentMap = { ...EMPTY, outfit: 'ia' };
    const s = computeEffectiveStats(eq, inv, ITEM_REGISTRY);
    expect(s.maxHpDelta).toBe(5);
    expect(s.spellDamagePct).toEqual({});
    expect(s.critChancePct).toBe(0);
    expect(s.expGainPct).toBe(0);
  });

  it('wand-fire-01 (+10% Fire) only populates Fire entry', () => {
    const inv = [instance('wand-fire-01', 'iw')];
    const eq: EquipmentMap = { ...EMPTY, wand: 'iw' };
    const s = computeEffectiveStats(eq, inv, ITEM_REGISTRY);
    expect(s.spellDamagePct.Fire).toBe(10);
    expect(s.spellDamagePct.Water).toBeUndefined();
  });

  it('outfit-fire-01 stacks Fire % with a fire wand', () => {
    const inv = [instance('outfit-fire-01', 'io'), instance('wand-fire-01', 'iw')];
    const eq: EquipmentMap = { ...EMPTY, outfit: 'io', wand: 'iw' };
    const s = computeEffectiveStats(eq, inv, ITEM_REGISTRY);
    // outfit-fire-01 = +8 maxHp + 3% Fire; wand-fire-01 = +10% Fire
    expect(s.maxHpDelta).toBe(8);
    expect(s.spellDamagePct.Fire).toBe(13);
  });

  it('hat-storm-01 (+4% crit) populates critChancePct', () => {
    const inv = [instance('hat-storm-01', 'ih')];
    const eq: EquipmentMap = { ...EMPTY, hat: 'ih' };
    expect(computeEffectiveStats(eq, inv, ITEM_REGISTRY).critChancePct).toBe(4);
  });

  it('shoes-apprentice-01 + hat-apprentice-01 stack expGainPct', () => {
    const inv = [instance('shoes-apprentice-01', 'is'), instance('hat-apprentice-01', 'ih')];
    const eq: EquipmentMap = { ...EMPTY, shoes: 'is', hat: 'ih' };
    const s = computeEffectiveStats(eq, inv, ITEM_REGISTRY);
    expect(s.expGainPct).toBe(3 + 2);
  });

  it('equipment slot pointing to a non-existent instanceId is ignored (no throw)', () => {
    const eq: EquipmentMap = { ...EMPTY, hat: 'ghost' };
    expect(() => computeEffectiveStats(eq, [], ITEM_REGISTRY)).not.toThrow();
    expect(computeEffectiveStats(eq, [], ITEM_REGISTRY)).toEqual(ZERO_STATS);
  });

  it('equipment referencing unknown itemId is ignored (no throw)', () => {
    const inv = [instance('ghost-item-id', 'ix')];
    const eq: EquipmentMap = { ...EMPTY, hat: 'ix' };
    expect(computeEffectiveStats(eq, inv, ITEM_REGISTRY)).toEqual(ZERO_STATS);
  });

  it('inverse invariant: stripping every slot returns baseline', () => {
    const inv = [
      instance('hat-storm-01', 'ih'),
      instance('outfit-ice-01', 'io'),
      instance('wand-plant-01', 'iw'),
      instance('shoes-apprentice-01', 'is'),
    ];
    const full: EquipmentMap = { hat: 'ih', outfit: 'io', wand: 'iw', shoes: 'is' };
    const loaded = computeEffectiveStats(full, inv, ITEM_REGISTRY);
    expect(loaded).not.toEqual(ZERO_STATS);
    const stripped = computeEffectiveStats(EMPTY, inv, ITEM_REGISTRY);
    expect(stripped).toEqual(ZERO_STATS);
  });
});
