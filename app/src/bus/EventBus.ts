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

// Discriminated union — extend in ISP Step 1
export type GameEvent =
  | { type: 'OPEN_QUIZ'; payload: { lo_id: number; monster_id: number | null } }
  | { type: 'QUIZ_RESULT'; payload: { correct: boolean; timeSpent: number; attempts: number } }
  | { type: 'ENTER_COMBAT'; payload: { monster_id: number } }
  | { type: 'EXIT_COMBAT'; payload: { won: boolean; exp_gained: number } };

// Strip `type` field and map to payload type
type EventMap = {
  [E in GameEvent as E['type']]: E['payload'];
};

type Unsubscribe = () => void;

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
      // TODO Phase 5: report to Sentry
    }
  }

  /**
   * Remove ALL listeners. Use only in tests or full app shutdown.
   */
  clear(): void {
    this.emitter.all.clear();
  }
}

export const eventBus = new TypedEventBus();
export type { Unsubscribe };
