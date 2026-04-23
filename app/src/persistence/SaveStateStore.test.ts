import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  useSaveState,
  thresholdForLevel,
  SAVE_STATE_KEY,
  SCHEMA_VERSION,
  InvalidEquipError,
  __setLevelUpRng,
  __resetLevelUpRng,
} from './SaveStateStore';
import { EMPTY_EQUIPMENT, type InventoryItem } from '@/types/item';
import { eventBus } from '@bus/EventBus';

beforeEach(() => {
  localStorage.clear();
  useSaveState.getState().reset();
  eventBus.clear();
  // Force a deterministic drop (first eligible item) so gainExp tests
  // that cross thresholds don't flake on Math.random.
  __setLevelUpRng(() => 0);
});

afterEach(() => {
  __resetLevelUpRng();
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

  it('SCHEMA_VERSION is at v2 (Step 22.7 inventory bump)', () => {
    expect(SCHEMA_VERSION).toBe(2);
  });
});

describe('SaveStateStore — Step 22.7 inventory + equipment (v2)', () => {
  const sampleItem: InventoryItem = {
    instanceId: 'uuid-apprentice-hat',
    itemId: 'hat-apprentice-01',
    acquiredAt: 1_700_000_000_000,
  };

  it('initial state ships empty inventory + all slots null', () => {
    const s = useSaveState.getState();
    expect(s.inventory).toEqual([]);
    expect(s.equipment).toEqual(EMPTY_EQUIPMENT);
    expect(s.lastLevelUpAt).toBeNull();
  });

  it('addInventoryItem appends without mutating existing array', () => {
    const before = useSaveState.getState().inventory;
    useSaveState.getState().addInventoryItem(sampleItem);
    const after = useSaveState.getState().inventory;
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(sampleItem);
    expect(after).not.toBe(before); // new array reference
  });

  it('equipItem happy path sets instanceId on slot', () => {
    useSaveState.getState().addInventoryItem(sampleItem);
    useSaveState.getState().equipItem('hat', sampleItem.instanceId);
    expect(useSaveState.getState().equipment.hat).toBe(sampleItem.instanceId);
  });

  it('equipItem with unknown instanceId throws InvalidEquipError (AP E12)', () => {
    expect(() => useSaveState.getState().equipItem('hat', 'ghost-id')).toThrow(InvalidEquipError);
  });

  it('equipItem replaces previous slot occupant without mutating inventory', () => {
    const other: InventoryItem = {
      instanceId: 'uuid-fire-hat',
      itemId: 'hat-fire-01',
      acquiredAt: 1_700_000_000_100,
    };
    useSaveState.getState().addInventoryItem(sampleItem);
    useSaveState.getState().addInventoryItem(other);
    useSaveState.getState().equipItem('hat', sampleItem.instanceId);
    useSaveState.getState().equipItem('hat', other.instanceId);
    const s = useSaveState.getState();
    expect(s.equipment.hat).toBe(other.instanceId);
    expect(s.inventory).toHaveLength(2); // both still owned
  });

  it('unequipItem on empty slot → noop (AP E13)', () => {
    expect(() => useSaveState.getState().unequipItem('wand')).not.toThrow();
    expect(useSaveState.getState().equipment.wand).toBeNull();
  });

  it('unequipItem clears the slot', () => {
    useSaveState.getState().addInventoryItem(sampleItem);
    useSaveState.getState().equipItem('hat', sampleItem.instanceId);
    useSaveState.getState().unequipItem('hat');
    expect(useSaveState.getState().equipment.hat).toBeNull();
  });

  it('reset() restores empty inventory + equipment', () => {
    useSaveState.getState().addInventoryItem(sampleItem);
    useSaveState.getState().equipItem('hat', sampleItem.instanceId);
    useSaveState.getState().reset();
    const s = useSaveState.getState();
    expect(s.inventory).toEqual([]);
    expect(s.equipment).toEqual(EMPTY_EQUIPMENT);
  });
});

describe('SaveStateStore — Step 22.8 level-up reward drop', () => {
  it('gainExp without crossing threshold → no inventory grant, no LEVEL_UP', () => {
    const seen: Array<{ newLevel: number; grantedItemId: string | null }> = [];
    eventBus.on('LEVEL_UP', (p) => seen.push(p));
    useSaveState.getState().gainExp(50);
    expect(useSaveState.getState().inventory).toEqual([]);
    expect(seen).toEqual([]);
  });

  it('gainExp crossing one threshold → 1 item granted, 1 LEVEL_UP emitted', () => {
    const seen: Array<{ newLevel: number; grantedItemId: string | null }> = [];
    eventBus.on('LEVEL_UP', (p) => seen.push(p));
    useSaveState.getState().gainExp(100); // L1 → L2
    const s = useSaveState.getState();
    expect(s.level).toBe(2);
    expect(s.inventory).toHaveLength(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.newLevel).toBe(2);
    expect(seen[0]!.grantedItemId).toBe(s.inventory[0]!.itemId);
    expect(s.lastLevelUpAt).not.toBeNull();
  });

  it('multi-level jump grants one item per level crossed', () => {
    const seen: Array<{ newLevel: number; grantedItemId: string | null }> = [];
    eventBus.on('LEVEL_UP', (p) => seen.push(p));
    useSaveState.getState().gainExp(1000); // L1 → ~L3 or L4
    const s = useSaveState.getState();
    expect(s.level).toBeGreaterThanOrEqual(3);
    expect(s.inventory.length).toBe(s.level - 1);
    expect(seen).toHaveLength(s.level - 1);
    // Levels strictly increasing and matching the final level
    expect(seen.map((g) => g.newLevel)).toEqual(
      Array.from({ length: s.level - 1 }, (_, i) => i + 2)
    );
  });

  it('inventory items receive unique instanceIds', () => {
    useSaveState.getState().gainExp(2000);
    const ids = useSaveState.getState().inventory.map((i) => i.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rng=0 deterministically picks first eligible item', () => {
    useSaveState.getState().gainExp(100);
    // At level 2, filterByLevel includes minLevel ≤ 2: all L1/L2 items.
    // First eligible in registry order is 'hat-apprentice-01'.
    expect(useSaveState.getState().inventory[0]!.itemId).toBe('hat-apprentice-01');
  });
});

describe('SaveStateStore — v1 → v2 migration', () => {
  it('v1 save survives bump with defaults injected for new fields', async () => {
    // Seed a v1-shaped persisted blob that predates Step 22.7
    const v1Save = {
      state: {
        hp: 73,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        level: 3,
        exp: 120,
        position: { x: 100, y: 200 },
        flags: { tutorial_completed: true },
        last_boss_attempt_date: '2026-04-20',
      },
      version: 1,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v1Save));
    await useSaveState.persist.rehydrate();

    const s = useSaveState.getState();
    // Core fields preserved
    expect(s.hp).toBe(73);
    expect(s.exp).toBe(120);
    expect(s.level).toBe(3);
    expect(s.flags.tutorial_completed).toBe(true);
    expect(s.last_boss_attempt_date).toBe('2026-04-20');
    // v2 fields defaulted
    expect(s.inventory).toEqual([]);
    expect(s.equipment).toEqual(EMPTY_EQUIPMENT);
    expect(s.lastLevelUpAt).toBeNull();
  });
});
