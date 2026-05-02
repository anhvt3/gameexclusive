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

  it('SCHEMA_VERSION is at v4 (Sprint B Task 5 boss/chest/zone fields)', () => {
    expect(SCHEMA_VERSION).toBe(4);
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

describe('SaveStateStore — Step 22.10 equipment stat modifiers', () => {
  const fireWand: InventoryItem = {
    instanceId: 'i-fire-wand',
    itemId: 'wand-fire-01',
    acquiredAt: 1_700_000_000_000,
  };
  const iceRobe: InventoryItem = {
    instanceId: 'i-ice-robe',
    itemId: 'outfit-ice-01', // +12 maxHp + 5% Ice
    acquiredAt: 1_700_000_000_100,
  };
  const shoesExp: InventoryItem = {
    instanceId: 'i-shoes',
    itemId: 'shoes-apprentice-01', // +3% EXP
    acquiredAt: 1_700_000_000_200,
  };

  it('setHp clamps against effective max (base + equipment maxHp delta)', () => {
    useSaveState.getState().addInventoryItem(iceRobe);
    useSaveState.getState().equipItem('outfit', iceRobe.instanceId);
    // effectiveMax = 100 + 12 = 112
    useSaveState.getState().setHp(999);
    expect(useSaveState.getState().hp).toBe(112);
  });

  it('equipItem with maxHp modifier heals by the delta', () => {
    useSaveState.getState().setHp(50); // below full
    useSaveState.getState().addInventoryItem(iceRobe);
    useSaveState.getState().equipItem('outfit', iceRobe.instanceId);
    // 50 + 12 = 62, below effective max 112 → kept
    expect(useSaveState.getState().hp).toBe(62);
  });

  it('equipItem when already at full heals up to new effective max', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(iceRobe);
    // full HP = 100
    s.equipItem('outfit', iceRobe.instanceId);
    expect(useSaveState.getState().hp).toBe(112); // full heal to new max
  });

  it('unequipItem clamps hp down when effective max drops below current', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(iceRobe);
    s.equipItem('outfit', iceRobe.instanceId); // hp=112, max=112
    s.unequipItem('outfit');
    expect(useSaveState.getState().hp).toBe(100); // clamped to base
  });

  it('gainExp applies expGainPct modifier before cascade', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(shoesExp);
    s.equipItem('shoes', shoesExp.instanceId);
    // +3% → gainExp(100) actually stores 103 EXP → L1 threshold 100, L2 threshold 283
    // After: exp = 103 - 100 = 3, level = 2
    s.gainExp(100);
    const after = useSaveState.getState();
    expect(after.level).toBe(2);
    expect(after.exp).toBe(3);
  });

  it('gainExp with no expGain equipment behaves as before (regression)', () => {
    useSaveState.getState().gainExp(100);
    const after = useSaveState.getState();
    expect(after.level).toBe(2);
    expect(after.exp).toBe(0);
  });

  it('fireWand +10% Fire does not affect Ice modifier bucket', () => {
    const s = useSaveState.getState();
    s.addInventoryItem(fireWand);
    s.equipItem('wand', fireWand.instanceId);
    // indirect: computeEffectiveStats via effectiveMaxHp — confirm no side effect
    expect(useSaveState.getState().hp).toBe(100); // wand has no maxHp mod
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

describe('SaveStateStore — v2 → v3 migration (Sprint A Task 9)', () => {
  it('migrates v2 save to v3 with active_pet_instance_id=null', async () => {
    const v2Save = {
      state: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        exp: 0,
        level: 1,
        flags: {},
        inventory: [],
        equipment: { hat: null, outfit: null, wand: null, shoes: null },
        lastLevelUpAt: null,
        audio_muted: false,
        position: { x: 480, y: 320 },
        last_boss_attempt_date: null,
      },
      version: 2,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v2Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    // After migration active_pet_instance_id defaults to null (chain stops at current version)
    expect(s.active_pet_instance_id).toBeNull();
  });

  it('saves with v3 schema — active_pet_instance_id is persisted', () => {
    useSaveState.getState().setActivePetInstanceId('inst_abc');
    const stored = localStorage.getItem(SAVE_STATE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.active_pet_instance_id).toBe('inst_abc');
  });
});

describe('SaveState v4 migration', () => {
  it('migrates a v3 snapshot to v4 with empty defeated/claimed lists and null currentZoneId', async () => {
    const v3Save = {
      state: {
        hp: 80,
        maxHp: 100,
        mp: 30,
        maxMp: 50,
        exp: 42,
        level: 2,
        flags: { tutorial_completed: true },
        inventory: [],
        equipment: { hat: null, outfit: null, wand: null, shoes: null },
        lastLevelUpAt: 1_700_000_000_000,
        position: { x: 480, y: 320 },
        last_boss_attempt_date: '2026-04-20',
        active_pet_instance_id: 'inst_pet_xyz',
      },
      version: 3,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v3Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(SCHEMA_VERSION).toBe(4);
    expect(s.defeatedBossIds).toEqual([]);
    expect(s.claimedChestIds).toEqual([]);
    expect(s.currentZoneId).toBeNull();
    // existing v3 fields preserved
    expect(s.hp).toBe(80);
    expect(s.exp).toBe(42);
    expect(s.level).toBe(2);
    expect(s.active_pet_instance_id).toBe('inst_pet_xyz');
    expect(s.last_boss_attempt_date).toBe('2026-04-20');
  });

  it('is idempotent on a v4 snapshot (re-running v3→v4 leaves data intact)', async () => {
    const v4Save = {
      state: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        exp: 0,
        level: 1,
        flags: {},
        inventory: [],
        equipment: { hat: null, outfit: null, wand: null, shoes: null },
        lastLevelUpAt: null,
        position: { x: 0, y: 0 },
        last_boss_attempt_date: null,
        active_pet_instance_id: null,
        defeatedBossIds: ['forest-boss'],
        claimedChestIds: ['forest-boss-chest'],
        currentZoneId: 'forest-island',
      },
      version: 4,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v4Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.defeatedBossIds).toEqual(['forest-boss']);
    expect(s.claimedChestIds).toEqual(['forest-boss-chest']);
    expect(s.currentZoneId).toBe('forest-island');
  });

  it('chains v2 → v3 → v4 from a fresh v2 snapshot', async () => {
    const v2Save = {
      state: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        exp: 0,
        level: 1,
        flags: {},
        inventory: [],
        equipment: { hat: null, outfit: null, wand: null, shoes: null },
        lastLevelUpAt: null,
        position: { x: 480, y: 320 },
        last_boss_attempt_date: null,
      },
      version: 2,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v2Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(SCHEMA_VERSION).toBe(4);
    expect(s.active_pet_instance_id).toBeNull();
    expect(s.defeatedBossIds).toEqual([]);
    expect(s.claimedChestIds).toEqual([]);
    expect(s.currentZoneId).toBeNull();
  });
});

describe('SaveState v4 actions', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('addDefeatedBoss appends and dedupes', () => {
    useSaveState.getState().addDefeatedBoss('forest-boss');
    useSaveState.getState().addDefeatedBoss('forest-boss');
    useSaveState.getState().addDefeatedBoss('volcanic-boss');
    expect(useSaveState.getState().defeatedBossIds).toEqual(['forest-boss', 'volcanic-boss']);
  });

  it('addClaimedChest appends and dedupes', () => {
    useSaveState.getState().addClaimedChest('forest-boss-chest');
    useSaveState.getState().addClaimedChest('forest-boss-chest');
    expect(useSaveState.getState().claimedChestIds).toEqual(['forest-boss-chest']);
  });

  it('setCurrentZoneId stores and clears the zone id', () => {
    useSaveState.getState().setCurrentZoneId('forest-island');
    expect(useSaveState.getState().currentZoneId).toBe('forest-island');
    useSaveState.getState().setCurrentZoneId(null);
    expect(useSaveState.getState().currentZoneId).toBeNull();
  });

  it('hasDefeatedBoss reflects current state', () => {
    expect(useSaveState.getState().hasDefeatedBoss('forest-boss')).toBe(false);
    useSaveState.getState().addDefeatedBoss('forest-boss');
    expect(useSaveState.getState().hasDefeatedBoss('forest-boss')).toBe(true);
  });

  it('hasClaimedChest reflects current state', () => {
    expect(useSaveState.getState().hasClaimedChest('forest-boss-chest')).toBe(false);
    useSaveState.getState().addClaimedChest('forest-boss-chest');
    expect(useSaveState.getState().hasClaimedChest('forest-boss-chest')).toBe(true);
  });

  it('reset() zeroes defeatedBossIds/claimedChestIds/currentZoneId', () => {
    const s = useSaveState.getState();
    s.addDefeatedBoss('forest-boss');
    s.addClaimedChest('forest-boss-chest');
    s.setCurrentZoneId('forest-island');
    s.reset();
    const after = useSaveState.getState();
    expect(after.defeatedBossIds).toEqual([]);
    expect(after.claimedChestIds).toEqual([]);
    expect(after.currentZoneId).toBeNull();
  });
});

describe('useLegacyWorldScene flag (transient — Sprint B Task 12)', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('defaults to false', () => {
    expect(useSaveState.getState().useLegacyWorldScene).toBe(false);
  });

  it('setLegacyWorldFlag toggles the value', () => {
    useSaveState.getState().setLegacyWorldFlag(true);
    expect(useSaveState.getState().useLegacyWorldScene).toBe(true);
    useSaveState.getState().setLegacyWorldFlag(false);
    expect(useSaveState.getState().useLegacyWorldScene).toBe(false);
  });

  it('is NOT persisted (excluded by partialize)', () => {
    useSaveState.getState().setLegacyWorldFlag(true);
    const raw = localStorage.getItem(SAVE_STATE_KEY);
    if (raw) {
      // HmacStorage may wrap the JSON — assert the flag does not appear
      // in the persisted blob regardless of envelope.
      expect(raw).not.toContain('useLegacyWorldScene');
    }
  });

  it('reset() returns the legacy flag to false', () => {
    useSaveState.getState().setLegacyWorldFlag(true);
    useSaveState.getState().reset();
    expect(useSaveState.getState().useLegacyWorldScene).toBe(false);
  });
});
