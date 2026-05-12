import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DailyRewardEngine } from './DailyRewardEngine';
import { eventBus } from '@/bus/EventBus';
import { useSaveState, LOOT_JAR_THRESHOLD } from '@/persistence/SaveStateStore';

describe('DailyRewardEngine', () => {
  let engine: DailyRewardEngine;

  beforeEach(() => {
    useSaveState.getState().reset();
    engine = new DailyRewardEngine();
    engine.start();
  });

  afterEach(() => {
    engine.stop();
  });

  it('grants 5 * heroLevel battle stars on EXIT_COMBAT won=true', () => {
    // Hero starts at level 1 via reset
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(useSaveState.getState().battleStars).toBe(5);
  });

  it('grants 0 stars on EXIT_COMBAT won=false', () => {
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: 1 });
    expect(useSaveState.getState().battleStars).toBe(0);
  });

  it('emits BATTLE_STARS_EARNED with amount + total on win', () => {
    const received: Array<{ amount: number; total: number }> = [];
    const off = eventBus.on('BATTLE_STARS_EARNED', (p) => received.push(p));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(received).toEqual([{ amount: 5, total: 5 }]);
    off();
  });

  it('does NOT emit BATTLE_STARS_EARNED on loss', () => {
    const received: unknown[] = [];
    const off = eventBus.on('BATTLE_STARS_EARNED', (p) => received.push(p));
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: 1 });
    expect(received).toHaveLength(0);
    off();
  });

  it('increments lootJarBattlesSinceLast on win', () => {
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(1);
  });

  it('does NOT increment lootJarBattlesSinceLast on loss', () => {
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: 1 });
    expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(0);
  });

  it('emits LOOT_JAR_READY at threshold (3rd win)', () => {
    const received: Array<{ battlesSince: number }> = [];
    const off = eventBus.on('LOOT_JAR_READY', (p) => received.push(p));
    // first 2 wins: no emit
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(received).toHaveLength(0);
    // 3rd win: emit fires
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(received).toEqual([{ battlesSince: LOOT_JAR_THRESHOLD }]);
    off();
  });

  it('scales earn formula with hero level', () => {
    useSaveState.setState({ level: 7 });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(useSaveState.getState().battleStars).toBe(35);
  });

  it('stop() removes listener so further events are ignored', () => {
    engine.stop();
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(useSaveState.getState().battleStars).toBe(0);
    expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(0);
  });

  it('start() is idempotent (calling twice does not double-fire)', () => {
    engine.start();
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 100, monster_id: 1 });
    expect(useSaveState.getState().battleStars).toBe(5); // not 10
  });
});
