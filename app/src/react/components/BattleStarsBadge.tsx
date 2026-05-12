/**
 * Sprint F — Battle Stars HUD badge.
 *
 * Displays current Battle Stars currency. Mounts in MainMenu header
 * (Task 11). Reads `battleStars` from SaveState as source of truth so
 * the badge stays in sync with engine increments (DailyRewardEngine
 * Task 5) without needing direct event subscription.
 *
 * Tooltip teases the Phase 3 shop where Battle Stars will be spendable.
 *
 * TODO Sprint F polish: "+N" floater animation on BATTLE_STARS_EARNED
 * deferred — current ship is static-count + tooltip per spec §5 #14.
 */

import { useSaveState } from '@/persistence/SaveStateStore';

export function BattleStarsBadge() {
  const count = useSaveState((s) => s.battleStars);
  return (
    <div
      data-testid="battle-stars-badge"
      title="Battle Stars — Sắp ra mắt Cửa Hàng!"
      className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold text-yellow-300 ring-1 ring-yellow-500/40"
    >
      <span aria-hidden="true">⭐</span>
      <span>{count}</span>
    </div>
  );
}
