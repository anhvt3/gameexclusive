/**
 * CombatStateMachine — AP v1.1 CL3 + ISP v1.1 Step 15
 *
 * Pure TypeScript finite state machine. No Phaser, no React, no side effects.
 * Integration with CombatScene + EventBus happens in Step 16.
 *
 * 9 states (core 7 per AP CL3 + SELECT_SPELL transient + terminals):
 *   INIT · PLAYER_TURN · SELECT_SPELL · QUIZ_GATE
 *   RESOLVE_DAMAGE · MONSTER_TURN · MONSTER_ATTACK
 *   VICTORY · DEFEAT  (terminals)
 *
 * Events carry minimal data; HP tracking lives in CombatScene context and
 * flows in via DAMAGE_APPLIED.side + DAMAGE_APPLIED.remainingHp.
 *
 * Invariants:
 *   - Only valid transitions allowed (throw on invalid)
 *   - Terminal states (VICTORY/DEFEAT) reject all events
 *   - `side` in DAMAGE_APPLIED = WHO WAS DAMAGED (victim)
 *     - side='monster' → player hit monster, check monster hp
 *     - side='player'  → monster hit player, check player hp
 */

export const COMBAT_STATES = [
  'INIT',
  'PLAYER_TURN',
  'SELECT_SPELL',
  'QUIZ_GATE',
  'RESOLVE_DAMAGE',
  'MONSTER_TURN',
  'MONSTER_ATTACK',
  'VICTORY',
  'DEFEAT',
] as const;

export type CombatState = (typeof COMBAT_STATES)[number];

export type CombatEvent =
  | { type: 'START' }
  | { type: 'CLICK_SPELL'; spellId: string }
  | { type: 'OPEN_QUIZ' }
  | { type: 'QUIZ_CORRECT' }
  | { type: 'QUIZ_WRONG' }
  | { type: 'DAMAGE_APPLIED'; side: 'player' | 'monster'; remainingHp: number }
  | { type: 'MONSTER_ACT' }
  | { type: 'HIT_RESOLVED' };

const TERMINAL_STATES: readonly CombatState[] = ['VICTORY', 'DEFEAT'];

export function isTerminal(state: CombatState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * Pure transition function. Throws on invalid (state, event) combination.
 */
export function nextCombatState(state: CombatState, event: CombatEvent): CombatState {
  switch (state) {
    case 'INIT':
      if (event.type === 'START') return 'PLAYER_TURN';
      break;

    case 'PLAYER_TURN':
      if (event.type === 'CLICK_SPELL') return 'SELECT_SPELL';
      break;

    case 'SELECT_SPELL':
      if (event.type === 'OPEN_QUIZ') return 'QUIZ_GATE';
      break;

    case 'QUIZ_GATE':
      if (event.type === 'QUIZ_CORRECT') return 'RESOLVE_DAMAGE';
      if (event.type === 'QUIZ_WRONG') return 'MONSTER_TURN';
      break;

    case 'RESOLVE_DAMAGE':
      if (event.type === 'DAMAGE_APPLIED') {
        if (event.remainingHp <= 0) {
          return event.side === 'monster' ? 'VICTORY' : 'DEFEAT';
        }
        return event.side === 'monster' ? 'MONSTER_TURN' : 'PLAYER_TURN';
      }
      break;

    case 'MONSTER_TURN':
      if (event.type === 'MONSTER_ACT') return 'MONSTER_ATTACK';
      break;

    case 'MONSTER_ATTACK':
      if (event.type === 'HIT_RESOLVED') return 'RESOLVE_DAMAGE';
      break;

    case 'VICTORY':
    case 'DEFEAT':
      // Terminal — fall through to throw
      break;
  }

  throw new Error(
    `[CombatStateMachine] Invalid transition: state="${state}" + event="${event.type}"`
  );
}
