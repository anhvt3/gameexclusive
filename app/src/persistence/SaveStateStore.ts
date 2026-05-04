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
 *   v3 → +active_pet_instance_id (Sprint A Task 9 / PetEntityFactory)
 *   v4 → +defeatedBossIds, +claimedChestIds, +currentZoneId (Sprint B Task 5)
 *   v5 → +ownedPets[] (Sprint C Task 5 — pet roster, separate from inventory[])
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
import { ROSTER_CAP, type PetCodename, type PetInstance, type PetRarity } from '@/types/pet';
import { ITEM_REGISTRY } from '@data/staticConfig/items';
import { rollDrop } from '@domain/LevelUpReward';
import { computeEffectiveStats } from '@domain/EffectiveStats';
import { applyPetXp } from '@domain/PetLeveling';
import { eventBus } from '@bus/EventBus';

export const SAVE_STATE_KEY = 'game_ss3_save_v1';
export const SCHEMA_VERSION = 5;

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
  // v3 additions (Sprint A Task 9 / PetEntityFactory)
  active_pet_instance_id: string | null;
  // v4 additions (Sprint B Task 5 — boss-defeat persistence + zone resume)
  defeatedBossIds: string[];
  claimedChestIds: string[];
  currentZoneId: string | null;
  // Sprint B Task 12 — transient debug flag (NOT persisted). When true,
  // PreloadScene hands off to the legacy WorldScene; used by Phase 1 E2E
  // specs during the WorldMap/Zone migration.
  useLegacyWorldScene: boolean;
  // v5 additions (Sprint C Task 5 — pet roster persistence)
  ownedPets: PetInstance[];
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
  // v3 actions
  setActivePetInstanceId: (id: string | null) => void;
  // v4 actions
  addDefeatedBoss: (id: string) => void;
  addClaimedChest: (id: string) => void;
  setCurrentZoneId: (id: string | null) => void;
  hasDefeatedBoss: (id: string) => boolean;
  hasClaimedChest: (id: string) => boolean;
  // Sprint B Task 12 — transient debug flag setter
  setLegacyWorldFlag: (v: boolean) => void;
  // v5 actions (Sprint C Task 5 — pet roster)
  addPet: (codename: PetCodename, rarity: PetRarity, level?: number, xp?: number) => PetInstance;
  removePet: (instanceId: string) => boolean;
  hasPetAtCap: () => boolean;
  findOwnedPet: (instanceId: string) => PetInstance | null;
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
  active_pet_instance_id: null,
  defeatedBossIds: [],
  claimedChestIds: [],
  currentZoneId: null,
  useLegacyWorldScene: false,
  ownedPets: [],
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Read-side helper — returns the effective maxHp (base + equipment
 * maxHp deltas). Exported so CombatScene + HpBar can hit the same
 * canonical source without duplicating the CL7 fold.
 */
export function effectiveMaxHp(state: SaveStateData): number {
  const stats = computeEffectiveStats(state.equipment, state.inventory, ITEM_REGISTRY);
  return state.maxHp + stats.maxHpDelta;
}

/** Additive migration v1 → v2 → v3 → v4 → v5 — inject missing fields when absent. */
function migrate(persisted: unknown, version: number): SaveStateData {
  const base = (
    persisted && typeof persisted === 'object' ? persisted : {}
  ) as Partial<SaveStateData>;
  let s: SaveStateData = { ...INITIAL_STATE, ...base };
  if (version < 2) {
    s = {
      ...s,
      inventory: Array.isArray(base.inventory) ? base.inventory : [],
      equipment:
        base.equipment && typeof base.equipment === 'object'
          ? { ...EMPTY_EQUIPMENT, ...base.equipment }
          : { ...EMPTY_EQUIPMENT },
      lastLevelUpAt: typeof base.lastLevelUpAt === 'number' ? base.lastLevelUpAt : null,
    };
  }
  if (version < 3) {
    s = { ...s, active_pet_instance_id: null };
  }
  if (version < 4) {
    s = {
      ...s,
      defeatedBossIds: [],
      claimedChestIds: [],
      currentZoneId: null,
    };
  }
  if (version < 5) {
    s = { ...s, ownedPets: [] };
  }
  return s;
}

export const useSaveState = create<SaveStateStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setHp: (value) => set((state) => ({ hp: clamp(value, 0, effectiveMaxHp(state)) })),

      setMp: (value) => set((state) => ({ mp: clamp(value, 0, state.maxMp) })),

      gainExp: (amount) => {
        if (amount <= 0) return;
        const currentState = get();
        const stats = computeEffectiveStats(
          currentState.equipment,
          currentState.inventory,
          ITEM_REGISTRY
        );
        // AP §11.3 CL7 — expGain modifier scales incoming EXP before
        // the level-up cascade rolls.
        const scaledAmount = Math.floor(amount * (1 + stats.expGainPct / 100));
        const startLevel = currentState.level;
        let { exp, level } = currentState;
        exp += scaledAmount;
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
        // Sprint C — propagate to active pet (after hero cascade settles)
        const stateAfterHero = get();
        const activeId = stateAfterHero.active_pet_instance_id;
        if (activeId) {
          const activePet = stateAfterHero.ownedPets.find((p) => p.instanceId === activeId);
          if (activePet) {
            // Cap uses the pre-cascade hero level so pets cannot ride a
            // single XP grant past the trainer's prior level — matches
            // the "pet capped at hero level" test contract.
            const result = applyPetXp(activePet, startLevel, scaledAmount);
            set((state) => ({
              ownedPets: state.ownedPets.map((p) => (p.instanceId === activeId ? result.pet : p)),
            }));
            for (const ev of result.levelUps) {
              eventBus.emit('PET_LEVEL_UP', {
                petInstanceId: activeId,
                newLevel: ev.newLevel,
                evolved: ev.evolved,
              });
            }
          }
        }
      },

      setPosition: (x, y) => set({ position: { x, y } }),

      setFlag: (key, value) => set((state) => ({ flags: { ...state.flags, [key]: value } })),

      setLastBossAttemptDate: (iso) => set({ last_boss_attempt_date: iso }),

      addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),

      setActivePetInstanceId: (id) => set({ active_pet_instance_id: id }),

      addDefeatedBoss: (id) =>
        set((s) =>
          s.defeatedBossIds.includes(id) ? s : { defeatedBossIds: [...s.defeatedBossIds, id] }
        ),

      addClaimedChest: (id) =>
        set((s) =>
          s.claimedChestIds.includes(id) ? s : { claimedChestIds: [...s.claimedChestIds, id] }
        ),

      setCurrentZoneId: (id) => set({ currentZoneId: id }),

      hasDefeatedBoss: (id) => get().defeatedBossIds.includes(id),

      hasClaimedChest: (id) => get().claimedChestIds.includes(id),

      setLegacyWorldFlag: (v) => set({ useLegacyWorldScene: v }),

      addPet: (codename, rarity, level = 1, xp = 0) => {
        const inst: PetInstance = {
          instanceId: genInstanceId(),
          petCodename: codename,
          rarity,
          level,
          xp,
          capturedAt: Date.now(),
        };
        set((state) => ({
          ownedPets: [...state.ownedPets, inst],
          active_pet_instance_id: state.active_pet_instance_id ?? inst.instanceId,
        }));
        return inst;
      },

      removePet: (instanceId) => {
        const state = get();
        const idx = state.ownedPets.findIndex((p) => p.instanceId === instanceId);
        if (idx === -1) return false;
        const newOwned = [...state.ownedPets];
        newOwned.splice(idx, 1);
        set({
          ownedPets: newOwned,
          active_pet_instance_id:
            state.active_pet_instance_id === instanceId ? null : state.active_pet_instance_id,
        });
        return true;
      },

      hasPetAtCap: () => get().ownedPets.length >= ROSTER_CAP,

      findOwnedPet: (instanceId) =>
        get().ownedPets.find((p) => p.instanceId === instanceId) ?? null,

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
        const maxBefore = effectiveMaxHp(state);
        const nextEquipment = { ...state.equipment, [slot]: instanceId };
        const maxAfter = effectiveMaxHp({ ...state, equipment: nextEquipment });
        const hpDelta = maxAfter - maxBefore;
        // AP §11.3 / ISP 22.10 — heal on equip when the swap raises max HP.
        // Keep hp when max shrinks until the next clamp (setHp) catches it.
        const nextHp =
          hpDelta > 0 ? Math.min(state.hp + hpDelta, maxAfter) : Math.min(state.hp, maxAfter);
        set({ equipment: nextEquipment, hp: nextHp });
      },

      unequipItem: (slot) => {
        const state = get();
        if (state.equipment[slot] === null) return; // AP E13: noop
        const nextEquipment = { ...state.equipment, [slot]: null };
        const maxAfter = effectiveMaxHp({ ...state, equipment: nextEquipment });
        set({ equipment: nextEquipment, hp: Math.min(state.hp, maxAfter) });
      },

      reset: () =>
        set({
          ...INITIAL_STATE,
          equipment: { ...EMPTY_EQUIPMENT },
          useLegacyWorldScene: false,
          ownedPets: [],
        }),
    }),
    {
      name: SAVE_STATE_KEY,
      // HmacStorage wraps localStorage — signs when SessionKey set,
      // passes through plain when ephemeral (ISP Step 9.5).
      storage: createJSONStorage(() => createHmacStorage(localStorage)),
      version: SCHEMA_VERSION,
      migrate,
      // Sprint B Task 12 — exclude the transient legacy-scene debug flag
      // from persistence so a page reload always falls back to the new
      // WorldMap/Zone chain. Everything else continues to persist as
      // before (empty exclusion list keeps v1–v4 fields intact).
      partialize: (state) => {
        const { useLegacyWorldScene: _omit, ...rest } = state;
        void _omit;
        return rest;
      },
    }
  )
);
