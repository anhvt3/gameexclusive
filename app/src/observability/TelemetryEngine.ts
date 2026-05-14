import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { trackShopPurchase, trackBreedingStart, trackBreedingHatch } from './Telemetry';

/**
 * Phase 4 — Telemetry observer (mirror DailyRewardEngine pattern from Sprint F).
 *
 * Listens existing EventBus events + invokes Telemetry.trackX. Pure
 * observer — never mutates state, never blocks the originating action.
 *
 * `breeding_rush` NOT here — performBreedingRush calls trackBreedingRush
 * directly because the action has all the context (timeRemainingMs etc.).
 */
export class TelemetryEngine {
  private subscriptions: Array<() => void> = [];

  start(): void {
    if (this.subscriptions.length > 0) return;

    this.subscriptions.push(
      eventBus.on('SHOP_PURCHASE_COMPLETED', (p) => {
        const battleStarsAfter = useSaveState.getState().battleStars;
        void trackShopPurchase({
          itemId: p.itemId,
          priceCharged: p.priceCharged,
          battleStarsAfter,
        });
      }),
      eventBus.on('BREEDING_STARTED', (p) => {
        const chamber = useSaveState.getState().breedingChamber;
        if (!chamber) return;
        void trackBreedingStart({
          parentA: p.parentA,
          parentB: p.parentB,
          offspringRarity: p.expectedRarity,
          costPaid: chamber.costBattleStars,
          hatchAt: chamber.hatchAt,
        });
      }),
      eventBus.on('EGG_HATCHED', (p) => {
        void trackBreedingHatch({
          offspringInstanceId: p.offspringInstanceId,
          offspringRarity: p.rarity,
          wasRushed: p.wasRushed ?? false,
        });
      })
    );
  }

  stop(): void {
    this.subscriptions.forEach((off) => off());
    this.subscriptions = [];
  }
}
