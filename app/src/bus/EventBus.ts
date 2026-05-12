/**
 * Game_SS3_exclusive — Typed Event Bus
 *
 * HARNESS RULE (AP 7.4): Every `on()` MUST return a cleanup function.
 * This is code-enforced, not md-enforced — callers cannot forget to unsubscribe.
 *
 * API pattern:
 *   const off = bus.on('QUIZ_RESULT', (payload) => { ... });
 *   // later:
 *   off();
 *
 * Why: prevent memory leak bug (AP Risk R3). React useEffect returns off directly.
 *
 * NOTE: This is a seed/sample file to verify the harness setup.
 * Actual event types will be extended in ISP Step 1.
 */

import mitt from 'mitt';
import type { Emitter, Handler } from 'mitt';
import type { Element } from '@/types/element';
import type { PetCodename, PetRarity } from '@/types/pet';

// Discriminated union — extend in ISP Step 1
export type GameEvent =
  | { type: 'OPEN_QUIZ'; payload: { lo_id: number; monster_id: number | null } }
  | {
      type: 'QUIZ_RESULT';
      payload: { correct: boolean; timeSpent: number; attempts: number; lo_id?: number };
    }
  | { type: 'ENTER_COMBAT'; payload: { monster_id: number } }
  | {
      type: 'EXIT_COMBAT';
      payload: { won: boolean; exp_gained: number; monster_id: number | null };
    }
  | {
      type: 'LEVEL_UP';
      payload: { newLevel: number; grantedItemId: string | null };
    }
  | {
      type: 'TURN_RESOLVED';
      payload: {
        sourceId: string;
        targetIds: string[];
        action: 'spell' | 'pet-attack' | 'monster-attack';
        damage: number;
        isCrit: boolean;
        remainingHp: number;
      };
    }
  | {
      type: 'CAST_SPELL';
      payload: {
        element: Element;
        origin: { x: number; y: number };
        target: { x: number; y: number };
      };
    }
  | { type: 'ENTER_ZONE'; payload: { zoneId: string } }
  | { type: 'EXIT_ZONE'; payload: { zoneId: string; reason: 'retreat' | 'completed' } }
  | { type: 'BOSS_DEFEATED'; payload: { bossId: string; zoneId: string } }
  | {
      type: 'CHEST_OPENED';
      payload: {
        chestId: string;
        zoneId: string;
        items: ReadonlyArray<{ itemId: string; qty: number }>;
        label?: string; // NEW Sprint D — defaults to "Về Bản Đồ" in RewardChestOverlay
      };
    }
  | { type: 'LOCKED_ISLAND_HINT'; payload: { islandId: string } }
  | {
      type: 'PET_RESCUE_OFFERED';
      payload: { petCodename: PetCodename; rarity: PetRarity };
    }
  | {
      type: 'PET_COLLECTED';
      payload: {
        petInstanceId: string;
        petCodename: PetCodename;
        rarity: PetRarity;
      };
    }
  | {
      type: 'PET_RELEASED';
      payload: {
        petCodename: PetCodename;
        rarity: PetRarity;
        reason: 'rejected-offer' | 'roster-cap-replace' | 'manual';
      };
    }
  | {
      type: 'PET_LEVEL_UP';
      payload: { petInstanceId: string; newLevel: number; evolved: boolean };
    }
  | {
      type: 'QUEST_PROGRESS';
      payload: { questId: string; delta: number };
    }
  | {
      type: 'BATTLE_STARS_EARNED';
      payload: { amount: number; total: number };
    }
  | {
      type: 'LOOT_JAR_READY';
      payload: { battlesSince: number };
    }
  | {
      type: 'LOGIN_CLAIMED';
      payload: { dayOfCycle: number; streak: number; items: string[] };
    };

// Strip `type` field and map to payload type
type EventMap = {
  [E in GameEvent as E['type']]: E['payload'];
};

type Unsubscribe = () => void;

/**
 * Optional error reporter — injected by the observability layer (ISP Step 18.5).
 * Kept as a module-level slot so EventBus stays pure (no observability import).
 */
export type EventBusErrorReporter = (err: unknown, context: { eventType: string }) => void;
let errorReporter: EventBusErrorReporter | null = null;
export function setEventBusErrorReporter(reporter: EventBusErrorReporter | null): void {
  errorReporter = reporter;
}

class TypedEventBus {
  private emitter: Emitter<EventMap>;

  constructor() {
    this.emitter = mitt<EventMap>();
  }

  /**
   * Subscribe to an event. Returns a cleanup function.
   * HARNESS: always call the returned function on unmount/scene-shutdown.
   */
  on<K extends keyof EventMap>(type: K, handler: Handler<EventMap[K]>): Unsubscribe {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }

  /**
   * Emit an event. Listener errors are caught and logged (AP 7.1 R1 error boundary).
   */
  emit<K extends keyof EventMap>(type: K, payload: EventMap[K]): void {
    try {
      this.emitter.emit(type, payload);
    } catch (err) {
      console.error(`[EventBus] Listener error for "${String(type)}":`, err);
      errorReporter?.(err, { eventType: String(type) });
    }
  }

  /**
   * Remove ALL listeners. Use only in tests or full app shutdown.
   */
  clear(): void {
    this.emitter.all.clear();
  }

  /**
   * Count total registered listeners across all event types.
   * Test helper — verifies no leak after mount/unmount cycles.
   */
  getListenerCount(): number {
    let total = 0;
    for (const handlers of this.emitter.all.values()) {
      total += handlers.length;
    }
    return total;
  }
}

export const eventBus = new TypedEventBus();
export type { Unsubscribe };
