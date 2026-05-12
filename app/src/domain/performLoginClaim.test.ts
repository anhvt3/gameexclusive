import { describe, it, expect, beforeEach } from 'vitest';
import { performLoginClaim } from './performLoginClaim';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import { dailyAnchor } from './QuestCycle';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 4, 7, 12, 0, 0);

describe('performLoginClaim', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  it('returns null when not claimable (already claimed today)', () => {
    const todayAnchor = dailyAnchor(NOW);
    useSaveState.getState().commitLoginClaim(todayAnchor, 1);
    const result = performLoginClaim(NOW, () => 0);
    expect(result).toBeNull();
  });

  it('claims first-ever login: streak 1, anchor set, day-1 item minted', () => {
    const result = performLoginClaim(NOW, () => 0);
    expect(result).not.toBeNull();
    expect(result?.dayOfCycle).toBe(1);
    expect(result?.streak).toBe(1);
    expect(useSaveState.getState().loginStreak).toBe(1);
    expect(useSaveState.getState().lastLoginAnchorUtc7).toBe(dailyAnchor(NOW));
    // Day-1 reward is `{ kind: 'item', rarity: 'common', qty: 1 }` → inventory gains 1 item
    expect(useSaveState.getState().inventory.length).toBe(1);
  });

  it('claims day-4 reward as battle stars (50 base × 1.2 streak = 60)', () => {
    const yesterdayAnchor = dailyAnchor(NOW) - DAY_MS;
    useSaveState.getState().commitLoginClaim(yesterdayAnchor, 3);
    const before = useSaveState.getState().battleStars;
    const result = performLoginClaim(NOW, () => 0);
    expect(result).not.toBeNull();
    expect(result?.dayOfCycle).toBe(4);
    expect(result?.streak).toBe(4);
    expect(useSaveState.getState().battleStars - before).toBe(60);
  });

  it('claims day-7 reward: rare item + 150 stars (100 base × 1.5)', () => {
    const yesterdayAnchor = dailyAnchor(NOW) - DAY_MS;
    useSaveState.getState().commitLoginClaim(yesterdayAnchor, 6);
    const before = useSaveState.getState().battleStars;
    const result = performLoginClaim(NOW, () => 0);
    expect(result?.dayOfCycle).toBe(7);
    expect(useSaveState.getState().battleStars - before).toBe(150);
    // Mixed → also adds 1 item to inventory (rare)
    expect(useSaveState.getState().inventory.length).toBeGreaterThanOrEqual(1);
  });

  it('emits LOGIN_CLAIMED on success', () => {
    const received: Array<{ dayOfCycle: number; streak: number; items: string[] }> = [];
    const off = eventBus.on('LOGIN_CLAIMED', (p) => received.push(p));
    performLoginClaim(NOW, () => 0);
    expect(received).toHaveLength(1);
    expect(received[0]?.dayOfCycle).toBe(1);
    expect(received[0]?.streak).toBe(1);
    off();
  });

  it('does NOT emit LOGIN_CLAIMED when not claimable', () => {
    const todayAnchor = dailyAnchor(NOW);
    useSaveState.getState().commitLoginClaim(todayAnchor, 1);
    const received: unknown[] = [];
    const off = eventBus.on('LOGIN_CLAIMED', (p) => received.push(p));
    performLoginClaim(NOW, () => 0);
    expect(received).toHaveLength(0);
    off();
  });

  it('streak break resets to day-1 mult 1.0', () => {
    const fiveDaysAgo = dailyAnchor(NOW) - 5 * DAY_MS;
    useSaveState.getState().commitLoginClaim(fiveDaysAgo, 4);
    performLoginClaim(NOW, () => 0);
    expect(useSaveState.getState().loginStreak).toBe(1);
  });
});
