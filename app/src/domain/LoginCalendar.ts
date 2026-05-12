import type { LoginDayReward } from '@/types/dailyReward';
import { dailyAnchor } from './QuestCycle';
import { streakMultiplier } from './StreakMultiplier';
import { LOGIN_CALENDAR_TEMPLATE, applyMultiplier } from '@/data/staticConfig/loginCalendar';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClaimableLoginInfo {
  /** True if today's UTC+7 anchor is strictly newer than `lastAnchorUtc7`. */
  claimable: boolean;
  /** Day-of-cycle 1..7 corresponding to `newStreak` modulo 7. */
  todayDayOfCycle: number;
  /** Reward template entry for `todayDayOfCycle` with streak multiplier applied. */
  reward: LoginDayReward;
  /** Streak after claim (computed regardless of `claimable`). */
  newStreak: number;
}

/**
 * Compute the new streak value if a claim were performed at `todayAnchor`.
 *
 * Rules (Q2 default — strict UTC+7 day):
 * - First-ever claim (lastAnchorUtc7 === 0) → streak 1
 * - Today is exactly lastAnchor + 1 day → streak = prev + 1
 * - Otherwise (gap >= 2 days or future-but-not-tomorrow) → streak resets to 1
 */
export function computeNewStreak(
  lastAnchorUtc7: number,
  loginStreak: number,
  todayAnchor: number
): number {
  if (lastAnchorUtc7 === 0) return 1;
  if (todayAnchor === lastAnchorUtc7 + DAY_MS) return loginStreak + 1;
  return 1;
}

/**
 * Pure read-only evaluation of whether the player can claim today's
 * login reward and what they would receive. No side effects — caller
 * orchestrates state mutation + event emit (deferred to Task 9 overlay
 * where SaveState v8 actions and `LOGIN_CLAIMED` event are available).
 */
export function evaluateLoginClaimable(
  lastAnchorUtc7: number,
  loginStreak: number,
  now: number
): ClaimableLoginInfo {
  const todayAnchor = dailyAnchor(now);
  const claimable = todayAnchor > lastAnchorUtc7;
  const newStreak = computeNewStreak(lastAnchorUtc7, loginStreak, todayAnchor);
  // Cycle position: 1..7 derived from streak. Streak 1 → day 1, …, streak 7 → day 7, streak 8 → day 1.
  const todayDayOfCycle = ((newStreak - 1) % 7) + 1;
  const baseReward = LOGIN_CALENDAR_TEMPLATE[todayDayOfCycle - 1]!;
  const mult = streakMultiplier(newStreak);
  const reward = applyMultiplier(baseReward, mult);
  return { claimable, todayDayOfCycle, reward, newStreak };
}
