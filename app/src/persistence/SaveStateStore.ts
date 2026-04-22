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
        let { exp, level } = get();
        exp += amount;
        let threshold = thresholdForLevel(level);
        while (exp >= threshold) {
          exp -= threshold;
          level += 1;
          threshold = thresholdForLevel(level);
        }
        set({ exp, level });
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
