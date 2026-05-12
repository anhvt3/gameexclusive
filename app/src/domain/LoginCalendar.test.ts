import { describe, it, expect } from 'vitest';
import { evaluateLoginClaimable, computeNewStreak } from './LoginCalendar';
import { dailyAnchor } from './QuestCycle';

const DAY_MS = 24 * 60 * 60 * 1000;
// 2026-05-07 12:00 UTC = 2026-05-07 19:00 UTC+7 (Thursday)
const NOW = Date.UTC(2026, 4, 7, 12, 0, 0);
const TODAY_ANCHOR = dailyAnchor(NOW);

describe('computeNewStreak', () => {
  it('returns 1 for first-ever (lastAnchor=0)', () => {
    expect(computeNewStreak(0, 0, TODAY_ANCHOR)).toBe(1);
  });

  it('returns prev+1 when consecutive (today = last + 1 day)', () => {
    expect(computeNewStreak(TODAY_ANCHOR - DAY_MS, 5, TODAY_ANCHOR)).toBe(6);
  });

  it('resets to 1 when streak broken (gap > 1 day)', () => {
    expect(computeNewStreak(TODAY_ANCHOR - 3 * DAY_MS, 10, TODAY_ANCHOR)).toBe(1);
  });

  it('resets to 1 even if gap is exactly 2 days', () => {
    expect(computeNewStreak(TODAY_ANCHOR - 2 * DAY_MS, 7, TODAY_ANCHOR)).toBe(1);
  });
});

describe('evaluateLoginClaimable', () => {
  it('claimable=true on first-ever (lastAnchor=0)', () => {
    const info = evaluateLoginClaimable(0, 0, NOW);
    expect(info.claimable).toBe(true);
    expect(info.newStreak).toBe(1);
    expect(info.todayDayOfCycle).toBe(1);
    expect(info.reward).toEqual({ kind: 'item', rarity: 'common', qty: 1 });
  });

  it('claimable=false when already claimed today', () => {
    const info = evaluateLoginClaimable(TODAY_ANCHOR, 3, NOW);
    expect(info.claimable).toBe(false);
  });

  it('claimable=true the next day; streak increments; cycle advances', () => {
    const info = evaluateLoginClaimable(TODAY_ANCHOR - DAY_MS, 3, NOW);
    expect(info.claimable).toBe(true);
    expect(info.newStreak).toBe(4);
    expect(info.todayDayOfCycle).toBe(4);
    // streak 4 → multiplier 1.2; day-4 base = 50 stars → 60
    expect(info.reward).toEqual({ kind: 'stars', amount: 60 });
  });

  it('day-7 reward at streak 7 with ×1.5 multiplier', () => {
    const info = evaluateLoginClaimable(TODAY_ANCHOR - DAY_MS, 6, NOW);
    expect(info.newStreak).toBe(7);
    expect(info.todayDayOfCycle).toBe(7);
    expect(info.reward).toEqual({ kind: 'mixed', rarity: 'rare', starsBonus: 150 });
  });

  it('cycle wraps at day 8 (streak 8 → cycle position 1)', () => {
    const info = evaluateLoginClaimable(TODAY_ANCHOR - DAY_MS, 7, NOW);
    expect(info.newStreak).toBe(8);
    expect(info.todayDayOfCycle).toBe(1);
    // streak 8 → still ×1.5 (between 7 and 30)
    expect(info.reward).toEqual({ kind: 'item', rarity: 'common', qty: 2 });
  });

  it('streak break resets cycle to day 1 with mult 1.0', () => {
    const info = evaluateLoginClaimable(TODAY_ANCHOR - 5 * DAY_MS, 4, NOW);
    expect(info.newStreak).toBe(1);
    expect(info.todayDayOfCycle).toBe(1);
    expect(info.reward).toEqual({ kind: 'item', rarity: 'common', qty: 1 });
  });
});
