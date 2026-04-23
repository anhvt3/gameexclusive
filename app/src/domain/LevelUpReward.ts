/**
 * LevelUpReward — AP v1.1 CL6bis / ISP Step 22.8.
 *
 * Pure weighted drop roll against the item registry. Inputs are passed
 * in (registry + rng + level) so the domain stays framework-free and
 * seed-deterministic under test. The caller (SaveStateStore.gainExp or
 * CombatScene boss path) is responsible for minting the InventoryItem
 * instance and persisting it.
 *
 * Rules:
 *   - Filter pool by `minLevel <= level`
 *   - Roll cumulative weight with `rng()` ∈ [0, 1)
 *   - Empty pool → null (caller warns + skips per AP E14)
 *   - drop_weight === 0 → item never selected (kept in registry for
 *     boss-only / event-only drops in later phases)
 *
 * Boss guarantee (Step 22.6 retrofit) is out of scope for the pure
 * picker: boss callers pass a narrower pool or bypass the roll and
 * pick from a curated list — modelled in CombatScene.
 */

import type { ItemDef } from '@data/staticConfig/items';

export interface RollDropParams {
  pool: readonly ItemDef[];
  level: number;
  /** [0, 1) deterministic source; default Math.random. */
  rng?: () => number;
}

export function filterByLevel(pool: readonly ItemDef[], level: number): ItemDef[] {
  return pool.filter((item) => item.minLevel <= level && item.drop_weight > 0);
}

/**
 * Weighted pick. Returns null when no item is eligible (empty pool,
 * all gated by minLevel, or all drop_weight === 0).
 */
export function rollDrop(params: RollDropParams): ItemDef | null {
  const { pool, level, rng = Math.random } = params;
  const eligible = filterByLevel(pool, level);
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, item) => sum + item.drop_weight, 0);
  if (totalWeight <= 0) return null;

  let target = rng() * totalWeight;
  for (const item of eligible) {
    target -= item.drop_weight;
    if (target < 0) return item;
  }
  // Floating-point guard — the cumulative should always sink below 0,
  // but if rng() returns exactly 1 - epsilon we fall back to the last
  // item so the function never returns null with a non-empty pool.
  return eligible[eligible.length - 1] ?? null;
}
