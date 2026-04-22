import { describe, it, expect } from 'vitest';
import {
  todayIso,
  canAttemptBoss,
  BOSS_VICTORY_EXP,
  BOSS_HP_SCALE,
  BOSS_PENDING_FLAG,
} from './BossQuest';

describe('BossQuest — daily gating', () => {
  it('todayIso formats YYYY-MM-DD with zero-padded month + day', () => {
    expect(todayIso(new Date(2026, 0, 3))).toBe('2026-01-03');
    expect(todayIso(new Date(2026, 10, 30))).toBe('2026-11-30');
  });

  it('null last-attempt → can attempt', () => {
    expect(canAttemptBoss(null, '2026-04-22')).toBe(true);
  });

  it('attempted today → blocked', () => {
    expect(canAttemptBoss('2026-04-22', '2026-04-22')).toBe(false);
  });

  it('attempted yesterday → unlocked next day', () => {
    expect(canAttemptBoss('2026-04-21', '2026-04-22')).toBe(true);
  });

  it('constants match AP spec', () => {
    expect(BOSS_VICTORY_EXP).toBe(500);
    expect(BOSS_HP_SCALE).toBe(5);
    expect(BOSS_PENDING_FLAG).toBe('boss_pending');
  });
});
