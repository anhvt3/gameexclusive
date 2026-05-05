import { describe, expect, it } from 'vitest';
import { dailyAnchor, weeklyAnchor, needsRefresh, VIETNAM_UTC_OFFSET_MS } from './QuestCycle';

const HOUR = 60 * 60 * 1000;

describe('VIETNAM_UTC_OFFSET_MS', () => {
  it('equals +7 hours in milliseconds', () => {
    expect(VIETNAM_UTC_OFFSET_MS).toBe(7 * HOUR);
  });
});

describe('dailyAnchor', () => {
  it('returns the most recent UTC+7 midnight at-or-before now', () => {
    // Vietnam local: 2026-05-02 12:30 → previous midnight: 2026-05-02 00:00 UTC+7
    // = 2026-05-01 17:00 UTC
    const localNoon = Date.UTC(2026, 4, 2, 5, 30); // 2026-05-02 12:30 Vietnam = 05:30 UTC
    const anchor = dailyAnchor(localNoon);
    expect(anchor).toBe(Date.UTC(2026, 4, 1, 17, 0));
  });

  it('exact midnight boundary returns same instant', () => {
    // 2026-05-02 00:00 Vietnam = 2026-05-01 17:00 UTC
    const exact = Date.UTC(2026, 4, 1, 17, 0);
    expect(dailyAnchor(exact)).toBe(exact);
  });

  it('one ms before midnight returns previous midnight', () => {
    const justBefore = Date.UTC(2026, 4, 1, 16, 59, 59, 999);
    const expected = Date.UTC(2026, 3, 30, 17, 0); // previous day's midnight VN
    expect(dailyAnchor(justBefore)).toBe(expected);
  });

  it('handles year boundary (2026-12-31 22:00 Vietnam = 2026-12-31 15:00 UTC)', () => {
    const lateNye = Date.UTC(2026, 11, 31, 15, 0);
    expect(dailyAnchor(lateNye)).toBe(Date.UTC(2026, 11, 30, 17, 0));
    // 2027-01-01 00:30 Vietnam = 2026-12-31 17:30 UTC
    const earlyNyd = Date.UTC(2026, 11, 31, 17, 30);
    expect(dailyAnchor(earlyNyd)).toBe(Date.UTC(2026, 11, 31, 17, 0));
  });
});

describe('weeklyAnchor', () => {
  it('returns most recent UTC+7 Sunday-midnight at-or-before now', () => {
    // 2026-05-02 (Saturday) 12:00 Vietnam → previous Sunday-midnight =
    // 2026-04-26 00:00 Vietnam = 2026-04-25 17:00 UTC
    const sat = Date.UTC(2026, 4, 2, 5, 0);
    expect(weeklyAnchor(sat)).toBe(Date.UTC(2026, 3, 25, 17, 0));
  });

  it('on Sunday after midnight Vietnam, anchor is current Sunday-midnight', () => {
    // 2026-05-03 (Sunday) 06:00 Vietnam = 2026-05-02 23:00 UTC.
    // Anchor: Sunday 2026-05-03 00:00 Vietnam = 2026-05-02 17:00 UTC.
    const sundayMorning = Date.UTC(2026, 4, 2, 23, 0);
    expect(weeklyAnchor(sundayMorning)).toBe(Date.UTC(2026, 4, 2, 17, 0));
  });
});

describe('needsRefresh', () => {
  it('returns true when stored anchor is older than current cycle', () => {
    const now = Date.UTC(2026, 4, 2, 5, 30); // Vietnam noon
    const oldAnchor = Date.UTC(2026, 3, 30, 17, 0); // 2 days ago
    expect(needsRefresh(oldAnchor, now, 'daily')).toBe(true);
  });

  it('returns false when stored anchor matches current cycle', () => {
    const now = Date.UTC(2026, 4, 2, 5, 30);
    const currentAnchor = Date.UTC(2026, 4, 1, 17, 0); // today's midnight VN
    expect(needsRefresh(currentAnchor, now, 'daily')).toBe(false);
  });

  it('returns true on initial 0 anchor (first run)', () => {
    const now = Date.UTC(2026, 4, 2, 5, 30);
    expect(needsRefresh(0, now, 'daily')).toBe(true);
  });
});
