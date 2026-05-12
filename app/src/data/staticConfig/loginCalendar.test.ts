import { describe, it, expect } from 'vitest';
import { LOGIN_CALENDAR_TEMPLATE, applyMultiplier } from './loginCalendar';
import type { LoginDayReward } from '@/types/dailyReward';

describe('LOGIN_CALENDAR_TEMPLATE', () => {
  it('has exactly 7 entries', () => {
    expect(LOGIN_CALENDAR_TEMPLATE).toHaveLength(7);
  });

  it('day 4 (index 3) is 50 stars', () => {
    expect(LOGIN_CALENDAR_TEMPLATE[3]).toEqual({ kind: 'stars', amount: 50 });
  });

  it('day 7 (index 6) is mixed rare + 100 stars bonus', () => {
    expect(LOGIN_CALENDAR_TEMPLATE[6]).toEqual({
      kind: 'mixed',
      rarity: 'rare',
      starsBonus: 100,
    });
  });

  it('days 1/2/3/5/6 are common items qty 1', () => {
    for (const idx of [0, 1, 2, 4, 5]) {
      expect(LOGIN_CALENDAR_TEMPLATE[idx]).toEqual({ kind: 'item', rarity: 'common', qty: 1 });
    }
  });
});

describe('applyMultiplier', () => {
  it('multiplies stars amount and rounds', () => {
    const reward: LoginDayReward = { kind: 'stars', amount: 50 };
    expect(applyMultiplier(reward, 1.2)).toEqual({ kind: 'stars', amount: 60 });
    expect(applyMultiplier(reward, 1.5)).toEqual({ kind: 'stars', amount: 75 });
    expect(applyMultiplier(reward, 2.0)).toEqual({ kind: 'stars', amount: 100 });
  });

  it('multiplies mixed.starsBonus and rounds, leaves rarity', () => {
    const reward: LoginDayReward = { kind: 'mixed', rarity: 'rare', starsBonus: 100 };
    expect(applyMultiplier(reward, 1.5)).toEqual({
      kind: 'mixed',
      rarity: 'rare',
      starsBonus: 150,
    });
  });

  it('multiplies item.qty with floor of 1', () => {
    const reward: LoginDayReward = { kind: 'item', rarity: 'common', qty: 1 };
    expect(applyMultiplier(reward, 1.0)).toEqual({ kind: 'item', rarity: 'common', qty: 1 });
    expect(applyMultiplier(reward, 1.5)).toEqual({ kind: 'item', rarity: 'common', qty: 2 });
    expect(applyMultiplier(reward, 2.0)).toEqual({ kind: 'item', rarity: 'common', qty: 2 });
  });

  it('leaves identity at multiplier=1.0', () => {
    for (const reward of LOGIN_CALENDAR_TEMPLATE) {
      expect(applyMultiplier(reward, 1.0)).toEqual(reward);
    }
  });
});
