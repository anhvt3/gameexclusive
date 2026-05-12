import { eventBus } from '@/bus/EventBus';
import { LOOT_JAR_THRESHOLD, useSaveState } from '@/persistence/SaveStateStore';

/**
 * Sprint F — DailyRewardEngine
 *
 * Observer engine that translates EXIT_COMBAT wins into Battle Stars
 * earnings + Loot Jar counter ticks. Mirrors the Sprint D QuestEngine
 * lifecycle (start / stop with subscription bookkeeping).
 *
 * Spec deviation (Task 5): spec §4.3 read `p.combatLevel` from payload,
 * but EXIT_COMBAT carries no combatLevel field. Engine reads hero level
 * from SaveState instead. Earn formula: 5 * heroLevel battle stars.
 */
export class DailyRewardEngine {
  private subscriptions: Array<() => void> = [];

  start(): void {
    if (this.subscriptions.length > 0) return; // idempotent
    this.subscriptions.push(eventBus.on('EXIT_COMBAT', (p) => this.handleExitCombat(p)));
  }

  stop(): void {
    this.subscriptions.forEach((off) => off());
    this.subscriptions = [];
  }

  private handleExitCombat(p: {
    won: boolean;
    exp_gained: number;
    monster_id: number | null;
  }): void {
    if (!p.won) return;

    const state = useSaveState.getState();
    const heroLevel = state.level;

    // 1. Battle Stars earn
    const earned = 5 * heroLevel;
    state.addBattleStars(earned);
    const total = useSaveState.getState().battleStars; // re-read after action
    eventBus.emit('BATTLE_STARS_EARNED', { amount: earned, total });

    // 2. Loot Jar counter
    state.incrementLootJarCounter();
    const newCount = useSaveState.getState().lootJarBattlesSinceLast;
    if (newCount >= LOOT_JAR_THRESHOLD) {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: newCount });
    }
  }
}
