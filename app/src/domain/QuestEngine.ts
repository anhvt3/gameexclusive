/**
 * QuestEngine — centralized event listener that translates Sprint A-C
 * GameEvent emits into QUEST_PROGRESS deltas. Reads the catalog from
 * data/staticConfig/quests; matchers declare which payload shapes
 * count as progress. Pure-TS lifecycle (no Phaser/React/DOM).
 *
 * Lifecycle:
 *   const engine = new QuestEngine();
 *   engine.start();   // subscribes once per unique source-event-type
 *   ... gameplay ...
 *   engine.stop();    // unsubscribes
 *
 * start() is idempotent — repeated calls do not double-subscribe.
 */

import { eventBus } from '@/bus/EventBus';
import { QUESTS } from '@data/staticConfig/quests';
import type { QuestSourceEvent } from '@/types/quest';
import { useSaveState } from '@/persistence/SaveStateStore';

export class QuestEngine {
  private subscriptions: Array<() => void> = [];
  private running = false;

  start(): void {
    if (this.running) return;
    const sources = new Set<QuestSourceEvent>(QUESTS.map((q) => q.source));
    for (const source of sources) {
      const off = eventBus.on(source as never, (payload: unknown) => {
        this.handleEvent(source, payload);
      });
      this.subscriptions.push(off);
    }
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    for (const off of this.subscriptions) off();
    this.subscriptions = [];
    this.running = false;
  }

  private handleEvent(source: QuestSourceEvent, payload: unknown): void {
    const matching = QUESTS.filter((q) => q.source === source);
    const state = useSaveState.getState();
    for (const quest of matching) {
      if (state.claimedRewards.includes(quest.id)) continue;
      const current = state.questProgress[quest.id] ?? 0;
      if (current >= quest.target) continue;

      const delta = quest.match(payload as never);
      if (delta <= 0) continue;

      useSaveState.getState().incrementQuestProgress(quest.id, delta);
      eventBus.emit('QUEST_PROGRESS', { questId: quest.id, delta });
    }
  }
}
