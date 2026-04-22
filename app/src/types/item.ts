/**
 * Item types — AP v1.1 §11.1 / ISP Step 22.7.
 *
 * Pure shared types: EquipmentSlot + ItemRarity enums, InventoryItem
 * instance shape, EquipmentMap per-slot layout, and the ItemModifier
 * discriminated union that CL7 (Step 22.10) folds into effective stats.
 *
 * ItemDef (the registry row) lives with the data layer in
 * src/data/staticConfig/items.ts — it's static config, not a cross-
 * cutting type.
 */

import { z } from 'zod';
import { ElementsSchema } from './element';

export const ITEM_SLOTS = ['hat', 'outfit', 'wand', 'shoes'] as const;
export type EquipmentSlot = (typeof ITEM_SLOTS)[number];
export const EquipmentSlotSchema = z.enum(ITEM_SLOTS);

export const ITEM_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type ItemRarity = (typeof ITEM_RARITIES)[number];
export const ItemRaritySchema = z.enum(ITEM_RARITIES);

/**
 * CL7 modifier union. Keep the list closed — new kinds require a Task B
 * doc update + a matching branch in computeEffectiveStats (Step 22.10).
 */
export const ItemModifierSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('maxHp'), delta: z.number().int() }),
  z.object({
    kind: z.literal('spellDamage'),
    element: ElementsSchema,
    pct: z.number(),
  }),
  z.object({ kind: z.literal('critChance'), pct: z.number() }),
  z.object({ kind: z.literal('expGain'), pct: z.number() }),
]);
export type ItemModifier = z.infer<typeof ItemModifierSchema>;

/**
 * InventoryItem — the save-state instance. instanceId is created at
 * mint time (usually crypto.randomUUID). Stacking is out of scope for
 * Phase 1 — each drop lives as its own row so enchant/durability can
 * plug in later without migration.
 */
export const InventoryItemSchema = z.object({
  instanceId: z.string().min(1),
  itemId: z.string().min(1),
  acquiredAt: z.number().int().nonnegative(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

/** Per-slot mapping of equipped instance, or null when the slot is empty. */
export const EquipmentMapSchema = z.object({
  hat: z.string().nullable(),
  outfit: z.string().nullable(),
  wand: z.string().nullable(),
  shoes: z.string().nullable(),
});
export type EquipmentMap = z.infer<typeof EquipmentMapSchema>;

export const EMPTY_EQUIPMENT: EquipmentMap = {
  hat: null,
  outfit: null,
  wand: null,
  shoes: null,
};
