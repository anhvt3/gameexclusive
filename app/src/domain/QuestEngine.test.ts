import { describe, expect, it, beforeEach } from 'vitest';
import { QuestEngine } from './QuestEngine';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('QuestEngine', () => {
  let engine: QuestEngine;
  beforeEach(() => {
    useSaveState.getState().reset();
    engine = new QuestEngine();
    engine.start();
  });

  function tearDown() {
    engine.stop();
  }

  it('translates EXIT_COMBAT(won=true) into questProgress increment for daily-combat-3', () => {
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(1);
    tearDown();
  });

  it('emits QUEST_PROGRESS on every translated event', () => {
    const events: Array<{ questId: string; delta: number }> = [];
    const off = eventBus.on('QUEST_PROGRESS', (p) => events.push(p));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 2 });
    off();
    // daily-combat-3 + weekly-combat-20 BOTH match EXIT_COMBAT.won
    expect(events.length).toBeGreaterThanOrEqual(2);
    tearDown();
  });

  it('skips quests already at target', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    const events: Array<{ questId: string; delta: number }> = [];
    const off = eventBus.on('QUEST_PROGRESS', (p) => events.push(p));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    off();
    const dailyEvents = events.filter((e) => e.questId === 'daily-combat-3');
    expect(dailyEvents).toHaveLength(0);
    tearDown();
  });

  it('skips quests already claimed', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 0 },
      claimedRewards: ['daily-combat-3'],
    });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3'] ?? 0).toBe(0);
    tearDown();
  });

  it('match returning 0 does not emit QUEST_PROGRESS', () => {
    const events: Array<{ questId: string; delta: number }> = [];
    const off = eventBus.on('QUEST_PROGRESS', (p) => events.push(p));
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: 1 });
    off();
    const combatEvents = events.filter(
      (e) => e.questId === 'daily-combat-3' || e.questId === 'weekly-combat-20'
    );
    expect(combatEvents).toHaveLength(0);
    tearDown();
  });

  it('LEVEL_UP increments main-level-5 only when newLevel >= 5', () => {
    eventBus.emit('LEVEL_UP', { newLevel: 4, grantedItemId: null });
    expect(useSaveState.getState().questProgress['main-level-5'] ?? 0).toBe(0);
    eventBus.emit('LEVEL_UP', { newLevel: 5, grantedItemId: null });
    expect(useSaveState.getState().questProgress['main-level-5']).toBe(1);
    tearDown();
  });

  it('PET_COLLECTED increments both weekly-pet-1 and main-pets-3', () => {
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: 'inst-a',
      petCodename: 'bunbleaf',
      rarity: 'common',
    });
    expect(useSaveState.getState().questProgress['weekly-pet-1']).toBe(1);
    expect(useSaveState.getState().questProgress['main-pets-3']).toBe(1);
    tearDown();
  });

  it('ENTER_ZONE increments daily-explore-1', () => {
    eventBus.emit('ENTER_ZONE', { zoneId: 'forest-island' });
    expect(useSaveState.getState().questProgress['daily-explore-1']).toBe(1);
    tearDown();
  });

  it('BOSS_DEFEATED with bossId=forest-boss increments main-boss-forest', () => {
    eventBus.emit('BOSS_DEFEATED', { bossId: 'forest-boss', zoneId: 'forest-island' });
    expect(useSaveState.getState().questProgress['main-boss-forest']).toBe(1);
    tearDown();
  });

  it('BOSS_DEFEATED with non-forest boss does not increment main-boss-forest', () => {
    eventBus.emit('BOSS_DEFEATED', { bossId: 'volcanic-boss', zoneId: 'volcanic-island' });
    expect(useSaveState.getState().questProgress['main-boss-forest'] ?? 0).toBe(0);
    tearDown();
  });

  it('stop() unsubscribes — events after stop do not increment', () => {
    engine.stop();
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3'] ?? 0).toBe(0);
  });

  it('start() called twice creates only one subscription per source-event', () => {
    engine.start();
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(1);
    tearDown();
  });
});
