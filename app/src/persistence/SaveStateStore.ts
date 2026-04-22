/**
 * SaveStateStore — ISP v1.1 Step 9
 *
 * Zustand store with localStorage persist middleware.
 * Single source of truth (AP §7.7) for Player HP/MP/EXP/Level/Position/Flags.
 *
 * Level formula (AP CL6):
 *   thresholdForLevel(N) = floor(100 × N^1.5)  — exp to go from L(N) → L(N+1)
 *
 * Schema version = 1. Phase 3 migration will bump + register migrators.
 *
 * HMAC signing (ISP v1.1 Step 9.5) will wrap this store later.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const SAVE_STATE_KEY = 'game_ss3_save_v1';
export const SCHEMA_VERSION = 1;

export function thresholdForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
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
}

export interface SaveStateActions {
  setHp: (value: number) => void;
  setMp: (value: number) => void;
  gainExp: (amount: number) => void;
  setPosition: (x: number, y: number) => void;
  setFlag: (key: string, value: boolean) => void;
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
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
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

      reset: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: SAVE_STATE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
    }
  )
);
