/**
 * SaveStateStore — ISP v1.1 Step 9 / 9.5 / 22.6 / 22.7.
 *
 * Zustand store with HMAC-wrapped localStorage persist middleware.
 * Single source of truth (AP §7.7) for player HP/MP/EXP/Level/Position/
 * Flags, plus (v2) Inventory + Equipment per AP §11.1.
 *
 * Level formula (AP CL6):
 *   thresholdForLevel(N) = floor(100 × N^1.5)
 *
 * Schema version timeline:
 *   v1 → base player state (hp/mp/exp/level/position/flags/last_boss_attempt_date)
 *   v2 → +inventory, +equipment, +lastLevelUpAt (AP §11, additive migrate)
 *
 * The migration injects empty defaults for missing fields so existing
 * Phase 1 saves survive the bump. HmacStorage re-signs on the next
 * write, matching the AP §3.2 tolerance model.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createHmacStorage } from './HmacStorage';
import {
  EMPTY_EQUIPMENT,
  type EquipmentMap,
  type EquipmentSlot,
  type InventoryItem,
} from '@/types/item';
import { ITEM_REGISTRY } from '@data/staticConfig/items';
import { rollDrop } from '@domain/LevelUpReward';
import { eventBus } from '@bus/EventBus';

export const SAVE_STATE_KEY = 'game_ss3_save_v1';
export const SCHEMA_VERSION = 2;

export function thresholdForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export class InvalidEquipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEquipError';
  }
}

/**
 * Level-up RNG seam — tests swap the underlying rng via __setLevelUpRng
 * so drop rolls stay deterministic without exposing the store internals.
 */
let _rng: () => number = Math.random;
export function __setLevelUpRng(fn: () => number): void {
  _rng = fn;
}
export function __resetLevelUpRng(): void {
  _rng = Math.random;
}

function genInstanceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface SaveStateData {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  exp: number;
  position: { x: number; y: number };
  flags: Record<string, boolean>;
  last_boss_attempt_date: string | null;
  // v2 additions (AP §11.1)
  inventory: InventoryItem[];
  equipment: EquipmentMap;
  lastLevelUpAt: number | null;
}

export interface SaveStateActions {
  setHp: (value: number) => void;
  setMp: (value: number) => void;
  gainExp: (amount: number) => void;
  setPosition: (x: number, y: number) => void;
  setFlag: (key: string, value: boolean) => void;
  setLastBossAttemptDate: (iso: string) => void;
  // v2 actions
  addInventoryItem: (item: InventoryItem) => void;
  equipItem: (slot: EquipmentSlot, instanceId: string) => void;
  unequipItem: (slot: EquipmentSlot) => void;
  reset: () => void;
}

export type SaveStateStore = SaveStateData & SaveStateActions;

const INITIAL_STATE: SaveStateData = {
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  level: 1,
  exp: 0,
  position: { x: 0, y: 0 },
  flags: {},
  last_boss_attempt_date: null,
  inventory: [],
  equipment: { ...EMPTY_EQUIPMENT },
  lastLevelUpAt: null,
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Additive migration v1 → v2 — inject inventory/equipment/lastLevelUpAt when absent. */
function migrate(persisted: unknown, version: number): SaveStateData {
  const base = (
    persisted && typeof persisted === 'object' ? persisted : {}
  ) as Partial<SaveStateData>;
  if (version < 2) {
    return {
      ...INITIAL_STATE,
      ...base,
      inventory: Array.isArray(base.inventory) ? base.inventory : [],
      equipment:
        base.equipment && typeof base.equipment === 'object'
          ? { ...EMPTY_EQUIPMENT, ...base.equipment }
          : { ...EMPTY_EQUIPMENT },
      lastLevelUpAt: typeof base.lastLevelUpAt === 'number' ? base.lastLevelUpAt : null,
    };
  }
  return { ...INITIAL_STATE, ...base };
}

export const useSaveState = create<SaveStateStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setHp: (value) => set((state) => ({ hp: clamp(value, 0, state.maxHp) })),

      setMp: (value) => set((state) => ({ mp: clamp(value, 0, state.maxMp) })),

      gainExp: (amount) => {
        if (amount <= 0) return;
        const startLevel = get().level;
        let { exp, level } = get();
        exp += amount;
        let threshold = thresholdForLevel(level);
        // Drops collected per level crossed (AP §11.2 CL6bis).
        const grants: Array<{
          newLevel: number;
          itemId: string | null;
          instance: InventoryItem | null;
        }> = [];
        while (exp >= threshold) {
          exp -= threshold;
          level += 1;
          const dropped = rollDrop({ pool: ITEM_REGISTRY, level, rng: _rng });
          if (dropped) {
            const instance: InventoryItem = {
              instanceId: genInstanceId(),
              itemId: dropped.id,
              acquiredAt: Date.now(),
            };
            grants.push({ newLevel: level, itemId: dropped.id, instance });
          } else {
            // AP E14 — empty drop pool for this level. Level still awarded.
            console.warn(`[SaveState] LEVEL_UP ${level}: no eligible items in pool`);
            grants.push({ newLevel: level, itemId: null, instance: null });
          }
          threshold = thresholdForLevel(level);
        }
        const newInstances = grants
          .map((g) => g.instance)
          .filter((i): i is InventoryItem => i !== null);
        set((state) => ({
          exp,
          level,
          inventory:
            newInstances.length > 0 ? [...state.inventory, ...newInstances] : state.inventory,
          lastLevelUpAt: level > startLevel ? Date.now() : state.lastLevelUpAt,
        }));
        // Emit after commit so listeners see the updated inventory.
        for (const grant of grants) {
          eventBus.emit('LEVEL_UP', {
            newLevel: grant.newLevel,
            grantedItemId: grant.itemId,
          });
        }
      },

      setPosition: (x, y) => set({ position: { x, y } }),

      setFlag: (key, value) => set((state) => ({ flags: { ...state.flags, [key]: value } })),

      setLastBossAttemptDate: (iso) => set({ last_boss_attempt_date: iso }),

      addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),

      equipItem: (slot, instanceId) => {
        const state = get();
        const owned = state.inventory.find((i) => i.instanceId === instanceId);
        if (!owned) {
          throw new InvalidEquipError(
            `[SaveState] equipItem: instanceId="${instanceId}" not in inventory`
          );
        }
        // AP §11.1: each ItemDef is locked to one slot. The caller is responsible
        // for matching, but guard here so a UI bug can't silently misfile an item.
        // (ItemDef lookup lives in data layer — we only have instanceId + itemId here.)
        set({ equipment: { ...state.equipment, [slot]: instanceId } });
      },

      unequipItem: (slot) => {
        const current = get().equipment[slot];
        if (current === null) return; // AP E13: noop
        set((state) => ({ equipment: { ...state.equipment, [slot]: null } }));
      },

      reset: () => set({ ...INITIAL_STATE, equipment: { ...EMPTY_EQUIPMENT } }),
    }),
    {
      name: SAVE_STATE_KEY,
      // HmacStorage wraps localStorage — signs when SessionKey set,
      // passes through plain when ephemeral (ISP Step 9.5).
      storage: createJSONStorage(() => createHmacStorage(localStorage)),
      version: SCHEMA_VERSION,
      migrate,
    }
  )
);
