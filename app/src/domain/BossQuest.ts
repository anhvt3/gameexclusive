/**
 * BossQuest — ISP v1.1 Step 22.6.
 *
 * Pure daily-challenge gating: one attempt per calendar day against the
 * boss monster (AP §11 via Appendix A boss tier). Win or lose, the
 * attempt locks the day — keeps Prodigy-style retention loop without
 * encouraging grind.
 *
 * Date handling uses local-day ISO (YYYY-MM-DD) because "daily reset"
 * should match the student's wall clock, not UTC midnight mid-homework.
 */

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canAttemptBoss(
  lastAttemptDate: string | null,
  today: string = todayIso()
): boolean {
  if (!lastAttemptDate) return true;
  return lastAttemptDate !== today;
}

/** AP §11 hook — boss victory exp reward. Normal monsters pay baseHp. */
export const BOSS_VICTORY_EXP = 500;

/** HP scale applied on top of baseHp when CombatScene inits a boss fight. */
export const BOSS_HP_SCALE = 5;

/** SaveState flag used to request a boss combat from MainMenu → WorldScene. */
export const BOSS_PENDING_FLAG = 'boss_pending';
