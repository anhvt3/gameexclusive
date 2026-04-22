import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveState, thresholdForLevel, SAVE_STATE_KEY } from './SaveStateStore';

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
});

describe('thresholdForLevel (AP CL6)', () => {
  it('L1→L2 threshold = 100', () => {
    expect(thresholdForLevel(1)).toBe(100);
  });

  it('L10→L11 threshold ≈ 3162', () => {
    expect(thresholdForLevel(10)).toBeCloseTo(3162, -1);
  });

  it('higher level = higher threshold', () => {
    expect(thresholdForLevel(5)).toBeGreaterThan(thresholdForLevel(4));
  });
});

describe('SaveStateStore — initial state', () => {
  it('starts at level 1, full hp/mp, exp 0', () => {
    const s = useSaveState.getState();
    expect(s.level).toBe(1);
    expect(s.hp).toBe(s.maxHp);
    expect(s.mp).toBe(s.maxMp);
    expect(s.exp).toBe(0);
  });
});

describe('SaveStateStore — setHp clamping', () => {
  it('setHp(-10) clamps to 0', () => {
    useSaveState.getState().setHp(-10);
    expect(useSaveState.getState().hp).toBe(0);
  });

  it('setHp(99999) clamps to maxHp', () => {
    const { maxHp } = useSaveState.getState();
    useSaveState.getState().setHp(99999);
    expect(useSaveState.getState().hp).toBe(maxHp);
  });

  it('setMp(-1) clamps to 0', () => {
    useSaveState.getState().setMp(-1);
    expect(useSaveState.getState().mp).toBe(0);
  });
});

describe('SaveStateStore — gainExp + level up (CL6)', () => {
  it('gainExp(50) at L1 → exp=50, still L1', () => {
    useSaveState.getState().gainExp(50);
    const s = useSaveState.getState();
    expect(s.level).toBe(1);
    expect(s.exp).toBe(50);
  });

  it('gainExp(100) at L1 → exp=0, level=2', () => {
    useSaveState.getState().gainExp(100);
    const s = useSaveState.getState();
    expect(s.level).toBe(2);
    expect(s.exp).toBe(0);
  });

  it('gainExp(150) at L1 → exp=50, level=2 (overflow carries)', () => {
    useSaveState.getState().gainExp(150);
    const s = useSaveState.getState();
    expect(s.level).toBe(2);
    expect(s.exp).toBe(50);
  });

  it('gainExp can trigger multiple level-ups', () => {
    useSaveState.getState().gainExp(1000);
    expect(useSaveState.getState().level).toBeGreaterThanOrEqual(3);
  });
});

describe('SaveStateStore — position + flags', () => {
  it('setPosition updates x,y', () => {
    useSaveState.getState().setPosition(10, 20);
    expect(useSaveState.getState().position).toEqual({ x: 10, y: 20 });
  });

  it('setFlag + getFlag roundtrip', () => {
    useSaveState.getState().setFlag('tutorial_completed', true);
    expect(useSaveState.getState().flags.tutorial_completed).toBe(true);
  });
});

describe('SaveStateStore — persistence', () => {
  it('state written to localStorage after mutation', () => {
    useSaveState.getState().setHp(42);
    const raw = localStorage.getItem(SAVE_STATE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.hp).toBe(42);
  });

  it('reset() clears store state back to initial', () => {
    useSaveState.getState().setHp(10);
    useSaveState.getState().gainExp(1000);
    useSaveState.getState().reset();
    const s = useSaveState.getState();
    expect(s.level).toBe(1);
    expect(s.exp).toBe(0);
    expect(s.hp).toBe(s.maxHp);
  });

  it('version field included in persisted data', () => {
    useSaveState.getState().setHp(50);
    const raw = localStorage.getItem(SAVE_STATE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBeDefined();
  });
});
