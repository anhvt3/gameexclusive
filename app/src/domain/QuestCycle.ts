/**
 * QuestCycle — UTC+7 (Vietnam) midnight + Sunday-midnight anchor math.
 *
 * Pure ms arithmetic (no Date object weirdness across DST since UTC+7
 * has no DST). All boundaries computed in epoch ms so tests can mock
 * Date.now() freely.
 */

export const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Most recent UTC+7 midnight at-or-before `now`. */
export function dailyAnchor(now: number): number {
  const local = now + VIETNAM_UTC_OFFSET_MS;
  const localMidnight = local - (local % DAY_MS);
  return localMidnight - VIETNAM_UTC_OFFSET_MS;
}

/** Most recent UTC+7 Sunday-midnight at-or-before `now`. */
export function weeklyAnchor(now: number): number {
  const local = now + VIETNAM_UTC_OFFSET_MS;
  const localMidnight = local - (local % DAY_MS);
  // Day of week in UTC+7 local frame: 0 = Sunday … 6 = Saturday.
  const dayOfWeek = new Date(localMidnight).getUTCDay();
  const sundayLocalMidnight = localMidnight - dayOfWeek * DAY_MS;
  return sundayLocalMidnight - VIETNAM_UTC_OFFSET_MS;
}

/**
 * True when the stored anchor is older than the current cycle for
 * `kind`. anchor=0 (never refreshed) always returns true.
 */
export function needsRefresh(anchor: number, now: number, kind: 'daily' | 'weekly'): boolean {
  const fn = kind === 'daily' ? dailyAnchor : weeklyAnchor;
  return fn(now) > anchor;
}
