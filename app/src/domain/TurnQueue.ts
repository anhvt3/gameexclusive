/**
 * TurnQueue — Sprint A pure FSM helper.
 *
 * Owns turn-order state for a single combat instance. Order at init:
 * hero(es) first, pet(s) next, monster(s) last (insertion order within
 * each group). next() walks the entities list, skipping any with hp ≤ 0,
 * and increments `generation` whenever it wraps around.
 *
 * 100% pure — no Phaser, no EventBus, no clock dependency.
 */

import type { CombatEntity, Faction } from '@/types/combat';

export interface TurnQueueState {
  entities: CombatEntity[];
  cursor: number;
  generation: number;
}

const KIND_ORDER: Record<CombatEntity['kind'], number> = {
  hero: 0,
  pet: 1,
  monster: 2,
};

export function init(entities: CombatEntity[]): TurnQueueState {
  const sorted = [...entities].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return { entities: sorted, cursor: 0, generation: 0 };
}

export function next(state: TurnQueueState): {
  state: TurnQueueState;
  actor: CombatEntity | null;
} {
  const { entities } = state;
  const total = entities.length;
  if (total === 0) {
    return { state, actor: null };
  }

  let cursor = state.cursor;
  let generation = state.generation;
  for (let visited = 0; visited < total; visited++) {
    const entity = entities[cursor]!;
    const nextCursor = (cursor + 1) % total;
    const nextGen = nextCursor === 0 ? generation + 1 : generation;
    if (entity.hp > 0) {
      return {
        state: { ...state, cursor: nextCursor, generation: nextGen },
        actor: entity,
      };
    }
    cursor = nextCursor;
    generation = nextGen;
  }
  return {
    state: { ...state, cursor, generation },
    actor: null,
  };
}

export function isFactionDead(state: TurnQueueState, faction: Faction): boolean {
  const members = state.entities.filter((e) => e.faction === faction);
  return members.length > 0 && members.every((e) => e.hp <= 0);
}
