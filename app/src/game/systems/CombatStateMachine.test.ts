import { describe, it, expect } from 'vitest';
import {
  COMBAT_STATES,
  type CombatState,
  type CombatEvent,
  nextCombatState,
  isTerminal,
} from './CombatStateMachine';

describe('CombatStateMachine — state transitions (AP CL3)', () => {
  it('exports 9 states including INIT, PLAYER_TURN, VICTORY, DEFEAT', () => {
    expect(COMBAT_STATES).toContain('INIT');
    expect(COMBAT_STATES).toContain('PLAYER_TURN');
    expect(COMBAT_STATES).toContain('SELECT_SPELL');
    expect(COMBAT_STATES).toContain('QUIZ_GATE');
    expect(COMBAT_STATES).toContain('RESOLVE_DAMAGE');
    expect(COMBAT_STATES).toContain('MONSTER_TURN');
    expect(COMBAT_STATES).toContain('MONSTER_ATTACK');
    expect(COMBAT_STATES).toContain('VICTORY');
    expect(COMBAT_STATES).toContain('DEFEAT');
  });

  it('INIT + START → PLAYER_TURN', () => {
    expect(nextCombatState('INIT', { type: 'START' })).toBe('PLAYER_TURN');
  });

  it('PLAYER_TURN + CLICK_SPELL → SELECT_SPELL', () => {
    expect(nextCombatState('PLAYER_TURN', { type: 'CLICK_SPELL', spellId: 'fire_blast' })).toBe(
      'SELECT_SPELL'
    );
  });

  it('SELECT_SPELL + OPEN_QUIZ → QUIZ_GATE', () => {
    expect(nextCombatState('SELECT_SPELL', { type: 'OPEN_QUIZ' })).toBe('QUIZ_GATE');
  });

  it('QUIZ_GATE + QUIZ_CORRECT → RESOLVE_DAMAGE', () => {
    expect(nextCombatState('QUIZ_GATE', { type: 'QUIZ_CORRECT' })).toBe('RESOLVE_DAMAGE');
  });

  it('QUIZ_GATE + QUIZ_WRONG → MONSTER_TURN (skip player damage)', () => {
    expect(nextCombatState('QUIZ_GATE', { type: 'QUIZ_WRONG' })).toBe('MONSTER_TURN');
  });

  it('RESOLVE_DAMAGE (side=monster, hp>0) → MONSTER_TURN', () => {
    expect(
      nextCombatState('RESOLVE_DAMAGE', {
        type: 'DAMAGE_APPLIED',
        side: 'monster',
        remainingHp: 25,
      })
    ).toBe('MONSTER_TURN');
  });

  it('RESOLVE_DAMAGE (side=monster, hp<=0) → VICTORY', () => {
    expect(
      nextCombatState('RESOLVE_DAMAGE', {
        type: 'DAMAGE_APPLIED',
        side: 'monster',
        remainingHp: 0,
      })
    ).toBe('VICTORY');
  });

  it('RESOLVE_DAMAGE (side=player, hp>0) → PLAYER_TURN', () => {
    expect(
      nextCombatState('RESOLVE_DAMAGE', {
        type: 'DAMAGE_APPLIED',
        side: 'player',
        remainingHp: 60,
      })
    ).toBe('PLAYER_TURN');
  });

  it('RESOLVE_DAMAGE (side=player, hp<=0) → DEFEAT', () => {
    expect(
      nextCombatState('RESOLVE_DAMAGE', {
        type: 'DAMAGE_APPLIED',
        side: 'player',
        remainingHp: 0,
      })
    ).toBe('DEFEAT');
  });

  it('MONSTER_TURN + MONSTER_ACT → MONSTER_ATTACK', () => {
    expect(nextCombatState('MONSTER_TURN', { type: 'MONSTER_ACT' })).toBe('MONSTER_ATTACK');
  });

  it('MONSTER_ATTACK + HIT_RESOLVED → RESOLVE_DAMAGE', () => {
    expect(nextCombatState('MONSTER_ATTACK', { type: 'HIT_RESOLVED' })).toBe('RESOLVE_DAMAGE');
  });
});

describe('CombatStateMachine — invalid transitions throw', () => {
  it('INIT + CLICK_SPELL throws', () => {
    expect(() => nextCombatState('INIT', { type: 'CLICK_SPELL', spellId: 'x' })).toThrow();
  });

  it('PLAYER_TURN + QUIZ_CORRECT throws (skipping SELECT_SPELL)', () => {
    expect(() => nextCombatState('PLAYER_TURN', { type: 'QUIZ_CORRECT' })).toThrow();
  });

  it('VICTORY + any event throws (terminal)', () => {
    expect(() => nextCombatState('VICTORY', { type: 'START' })).toThrow();
    expect(() => nextCombatState('VICTORY', { type: 'MONSTER_ACT' })).toThrow();
  });

  it('DEFEAT + any event throws (terminal)', () => {
    expect(() => nextCombatState('DEFEAT', { type: 'START' })).toThrow();
  });

  it('error message includes current state + event type', () => {
    try {
      nextCombatState('INIT', { type: 'CLICK_SPELL', spellId: 'x' });
    } catch (e) {
      expect((e as Error).message).toContain('INIT');
      expect((e as Error).message).toContain('CLICK_SPELL');
    }
  });
});

describe('CombatStateMachine — isTerminal helper', () => {
  it('VICTORY is terminal', () => {
    expect(isTerminal('VICTORY')).toBe(true);
  });

  it('DEFEAT is terminal', () => {
    expect(isTerminal('DEFEAT')).toBe(true);
  });

  it('PLAYER_TURN not terminal', () => {
    expect(isTerminal('PLAYER_TURN')).toBe(false);
  });

  it('all non-terminal states return false', () => {
    const nonTerminal: CombatState[] = [
      'INIT',
      'PLAYER_TURN',
      'SELECT_SPELL',
      'QUIZ_GATE',
      'RESOLVE_DAMAGE',
      'MONSTER_TURN',
      'MONSTER_ATTACK',
    ];
    for (const s of nonTerminal) expect(isTerminal(s)).toBe(false);
  });
});

describe('CombatStateMachine — full happy path (player wins)', () => {
  it('runs 7-step transition: INIT→PLAYER_TURN→SELECT_SPELL→QUIZ_GATE→RESOLVE_DAMAGE→VICTORY', () => {
    const events: CombatEvent[] = [
      { type: 'START' },
      { type: 'CLICK_SPELL', spellId: 'fire_blast' },
      { type: 'OPEN_QUIZ' },
      { type: 'QUIZ_CORRECT' },
      { type: 'DAMAGE_APPLIED', side: 'monster', remainingHp: 0 },
    ];
    const expected: CombatState[] = [
      'PLAYER_TURN',
      'SELECT_SPELL',
      'QUIZ_GATE',
      'RESOLVE_DAMAGE',
      'VICTORY',
    ];

    let state: CombatState = 'INIT';
    for (let i = 0; i < events.length; i++) {
      state = nextCombatState(state, events[i]!);
      expect(state).toBe(expected[i]);
    }
    expect(isTerminal(state)).toBe(true);
  });
});

describe('CombatStateMachine — full defeat path (player loses)', () => {
  it('player wrong quiz → monster attacks → player HP 0 → DEFEAT', () => {
    const events: CombatEvent[] = [
      { type: 'START' },
      { type: 'CLICK_SPELL', spellId: 'fire_blast' },
      { type: 'OPEN_QUIZ' },
      { type: 'QUIZ_WRONG' }, // → MONSTER_TURN
      { type: 'MONSTER_ACT' }, // → MONSTER_ATTACK
      { type: 'HIT_RESOLVED' }, // → RESOLVE_DAMAGE
      { type: 'DAMAGE_APPLIED', side: 'player', remainingHp: 0 }, // → DEFEAT
    ];
    let state: CombatState = 'INIT';
    for (const ev of events) state = nextCombatState(state, ev);
    expect(state).toBe('DEFEAT');
    expect(isTerminal(state)).toBe(true);
  });
});

describe('CombatStateMachine — multi-round survival', () => {
  it('2 rounds: player hits (hp 20), monster hits (hp 60), player wins round 2', () => {
    let state: CombatState = 'INIT';
    const ev = (e: CombatEvent) => {
      state = nextCombatState(state, e);
    };

    // Round 1 — player hits monster (monster hp 40→20, survives)
    ev({ type: 'START' });
    ev({ type: 'CLICK_SPELL', spellId: 'fire_blast' });
    ev({ type: 'OPEN_QUIZ' });
    ev({ type: 'QUIZ_CORRECT' });
    ev({ type: 'DAMAGE_APPLIED', side: 'monster', remainingHp: 20 });
    expect(state).toBe('MONSTER_TURN');

    // Monster retaliates (player 100→60, survives)
    ev({ type: 'MONSTER_ACT' });
    ev({ type: 'HIT_RESOLVED' });
    ev({ type: 'DAMAGE_APPLIED', side: 'player', remainingHp: 60 });
    expect(state).toBe('PLAYER_TURN');

    // Round 2 — player finishes monster
    ev({ type: 'CLICK_SPELL', spellId: 'fire_blast' });
    ev({ type: 'OPEN_QUIZ' });
    ev({ type: 'QUIZ_CORRECT' });
    ev({ type: 'DAMAGE_APPLIED', side: 'monster', remainingHp: 0 });
    expect(state).toBe('VICTORY');
  });
});
