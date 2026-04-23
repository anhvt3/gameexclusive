/**
 * EffectiveStats — AP v1.1 CL7 / ISP Step 22.10.
 *
 * Pure selector that folds every modifier from currently-equipped
 * items into a single `EffectiveStats` shape. Callers (SaveStateStore,
 * CombatScene) read from this selector instead of walking the
 * inventory themselves, so the CL7 fold lives in one place.
 *
 * Inverse invariant: unequipping every item returns the same zeroed
 * baseline regardless of equip/unequip order (covered by property test).
 */

import type { Element } from '@/types/element';
import type { EquipmentMap, InventoryItem } from '@/types/item';
import type { ItemDef } from '@data/staticConfig/items';

export interface EffectiveStats {
  /** Flat HP added on top of base maxHp. */
  maxHpDelta: number;
  /** +% damage per element (keyed only where modifiers exist). */
  spellDamagePct: Partial<Record<Element, number>>;
  /** Total crit-chance percentage points. */
  critChancePct: number;
  /** Total +% EXP gained from all sources. */
  expGainPct: number;
}

export const ZERO_STATS: EffectiveStats = {
  maxHpDelta: 0,
  spellDamagePct: {},
  critChancePct: 0,
  expGainPct: 0,
};

export function computeEffectiveStats(
  equipment: EquipmentMap,
  inventory: readonly InventoryItem[],
  registry: readonly ItemDef[]
): EffectiveStats {
  const equippedInstanceIds = Object.values(equipment).filter((id): id is string => id !== null);
  if (equippedInstanceIds.length === 0) return { ...ZERO_STATS, spellDamagePct: {} };

  // instanceId → itemId → ItemDef
  const byInstance = new Map(inventory.map((inst) => [inst.instanceId, inst.itemId]));
  const byItemId = new Map(registry.map((def) => [def.id, def]));

  const stats: EffectiveStats = {
    maxHpDelta: 0,
    spellDamagePct: {},
    critChancePct: 0,
    expGainPct: 0,
  };

  for (const instanceId of equippedInstanceIds) {
    const itemId = byInstance.get(instanceId);
    if (!itemId) continue;
    const def = byItemId.get(itemId);
    if (!def) continue;

    for (const mod of def.modifiers) {
      switch (mod.kind) {
        case 'maxHp':
          stats.maxHpDelta += mod.delta;
          break;
        case 'spellDamage':
          stats.spellDamagePct[mod.element] = (stats.spellDamagePct[mod.element] ?? 0) + mod.pct;
          break;
        case 'critChance':
          stats.critChancePct += mod.pct;
          break;
        case 'expGain':
          stats.expGainPct += mod.pct;
          break;
      }
    }
  }

  return stats;
}
