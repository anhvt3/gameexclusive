import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  useSaveState,
  thresholdForLevel,
  SAVE_STATE_KEY,
  SCHEMA_VERSION,
  InvalidEquipError,
  __setLevelUpRng,
  __resetLevelUpRng,
  LOOT_JAR_THRESHOLD,
} from './SaveStateStore';
import { EMPTY_EQUIPMENT, type InventoryItem } from '@/types/item';
import { ROSTER_CAP } from '@/types/pet';
import { eventBus } from '@bus/EventBus';
import { dailyAnchor, weeklyAnchor } from '@/domain/QuestCycle';

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

  it('SCHEMA_VERSION is at v8 (Sprint F Task 6 daily reward fields)', () => {
    expect(SCHEMA_VERSION).toBe(9);
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
    expect(SCHEMA_VERSION).toBe(9);
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
    expect(SCHEMA_VERSION).toBe(9);
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

describe('SaveState v5 migration', () => {
  it('migrates a v4 snapshot to v5 with empty ownedPets', async () => {
    const v4Save = {
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
        defeatedBossIds: ['forest-boss'],
        claimedChestIds: [],
        currentZoneId: null,
      },
      version: 4,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v4Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(SCHEMA_VERSION).toBe(9);
    expect(s.ownedPets).toEqual([]);
    // v4 fields preserved
    expect(s.defeatedBossIds).toEqual(['forest-boss']);
    expect(s.active_pet_instance_id).toBe('inst_pet_xyz');
    expect(s.hp).toBe(80);
  });

  it('is idempotent on a v5 snapshot with non-empty ownedPets', async () => {
    const v5Save = {
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
        defeatedBossIds: [],
        claimedChestIds: [],
        currentZoneId: null,
        ownedPets: [
          {
            instanceId: 'inst-1',
            petCodename: 'bunbleaf',
            rarity: 'rare',
            level: 3,
            xp: 10,
            capturedAt: 1000,
          },
        ],
      },
      version: 5,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v5Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.ownedPets).toHaveLength(1);
    expect(s.ownedPets[0]!.petCodename).toBe('bunbleaf');
  });

  it('chains v3 → v4 → v5 from a fresh v3 snapshot', async () => {
    const v3Save = {
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
        active_pet_instance_id: null,
      },
      version: 3,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v3Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(SCHEMA_VERSION).toBe(9);
    expect(s.ownedPets).toEqual([]);
    expect(s.defeatedBossIds).toEqual([]); // v3→v4 step also fired
  });
});

describe('SaveState v5 actions', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('addPet mints an instance and pushes to ownedPets', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'rare');
    expect(inst.petCodename).toBe('bunbleaf');
    expect(inst.rarity).toBe('rare');
    expect(inst.level).toBe(1);
    expect(inst.xp).toBe(0);
    expect(useSaveState.getState().ownedPets).toContainEqual(inst);
  });

  it('addPet auto-equips when active_pet_instance_id is null', () => {
    expect(useSaveState.getState().active_pet_instance_id).toBeNull();
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    expect(useSaveState.getState().active_pet_instance_id).toBe(inst.instanceId);
  });

  it('addPet does not auto-equip when a pet is already active', () => {
    const first = useSaveState.getState().addPet('bunbleaf', 'common');
    const second = useSaveState.getState().addPet('pyropup', 'rare');
    expect(useSaveState.getState().active_pet_instance_id).toBe(first.instanceId);
    expect(second.instanceId).not.toBe(first.instanceId);
  });

  it('removePet returns true and unequips when removing the active pet', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    const removed = useSaveState.getState().removePet(inst.instanceId);
    expect(removed).toBe(true);
    expect(useSaveState.getState().ownedPets).toHaveLength(0);
    expect(useSaveState.getState().active_pet_instance_id).toBeNull();
  });

  it('removePet returns false on unknown id and does not mutate state', () => {
    expect(useSaveState.getState().removePet('does-not-exist')).toBe(false);
  });

  it('hasPetAtCap reports false until ROSTER_CAP pets are owned', () => {
    expect(useSaveState.getState().hasPetAtCap()).toBe(false);
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    expect(useSaveState.getState().hasPetAtCap()).toBe(true);
  });

  it('findOwnedPet returns the pet by instanceId or null', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'epic');
    expect(useSaveState.getState().findOwnedPet(inst.instanceId)?.rarity).toBe('epic');
    expect(useSaveState.getState().findOwnedPet('nope')).toBeNull();
  });

  it('reset() zeroes ownedPets and active_pet_instance_id', () => {
    useSaveState.getState().addPet('bunbleaf', 'rare');
    useSaveState.getState().reset();
    expect(useSaveState.getState().ownedPets).toEqual([]);
    expect(useSaveState.getState().active_pet_instance_id).toBeNull();
  });
});

describe('gainExp propagates to active pet', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('active pet gains 100% of hero XP', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    expect(inst.xp).toBe(0);
    useSaveState.getState().gainExp(20);
    const after = useSaveState.getState().findOwnedPet(inst.instanceId);
    expect(after!.xp).toBe(20);
  });

  it('active pet levels up alongside hero with multi-level cascade', () => {
    useSaveState.setState({ level: 5 }); // hero already at 5 so cap is high
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    const events: Array<{ petInstanceId: string; newLevel: number; evolved: boolean }> = [];
    const off = eventBus.on('PET_LEVEL_UP', (p) => events.push(p));
    useSaveState.getState().gainExp(150); // 50 → lvl 2 (xp 0), 100 → lvl 3 (xp 0)
    off();
    const after = useSaveState.getState().findOwnedPet(inst.instanceId);
    expect(after!.level).toBe(3);
    expect(events).toHaveLength(2);
  });

  it('inactive pets do not gain XP', () => {
    const a = useSaveState.getState().addPet('bunbleaf', 'common');
    const b = useSaveState.getState().addPet('pyropup', 'common');
    // a is auto-equipped; b is inactive
    useSaveState.getState().gainExp(20);
    const aAfter = useSaveState.getState().findOwnedPet(a.instanceId);
    const bAfter = useSaveState.getState().findOwnedPet(b.instanceId);
    expect(aAfter!.xp).toBe(20);
    expect(bAfter!.xp).toBe(0);
  });

  it('pet level capped at hero level', () => {
    useSaveState.setState({ level: 2 });
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    useSaveState.getState().gainExp(99_999);
    const after = useSaveState.getState().findOwnedPet(inst.instanceId);
    expect(after!.level).toBe(2);
  });

  it('PET_LEVEL_UP at lvl 10 carries evolved=true', () => {
    useSaveState.setState({ level: 11 });
    useSaveState.getState().addPet('bunbleaf', 'common', 9, 0);
    const events: Array<{ petInstanceId: string; newLevel: number; evolved: boolean }> = [];
    const off = eventBus.on('PET_LEVEL_UP', (p) => events.push(p));
    useSaveState.getState().gainExp(50 * 9); // exactly threshold for level 9 → 10
    off();
    expect(events).toHaveLength(1);
    expect(events[0]!.newLevel).toBe(10);
    expect(events[0]!.evolved).toBe(true);
  });

  it('no PET_LEVEL_UP when no active pet', () => {
    const events: Array<{ petInstanceId: string; newLevel: number; evolved: boolean }> = [];
    const off = eventBus.on('PET_LEVEL_UP', (p) => events.push(p));
    useSaveState.getState().gainExp(100);
    off();
    expect(events).toEqual([]);
  });
});

describe('SaveState v6 migration', () => {
  it('migrates v5 → v6 with empty quest fields', async () => {
    const v5Save = {
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
        defeatedBossIds: [],
        claimedChestIds: [],
        currentZoneId: null,
        ownedPets: [],
      },
      version: 5,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v5Save));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.questProgress).toEqual({});
    expect(s.claimedRewards).toEqual([]);
    expect(s.questCycleAnchors).toEqual({ dailyEpochUtc7: 0, weeklyEpochUtc7: 0 });
  });

  it('idempotent on v6 — non-empty fields preserved', async () => {
    const v6Snapshot = {
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
        defeatedBossIds: [],
        claimedChestIds: [],
        currentZoneId: null,
        ownedPets: [],
        questProgress: { 'daily-combat-3': 2 },
        claimedRewards: ['main-level-5'],
        questCycleAnchors: { dailyEpochUtc7: 1700000000000, weeklyEpochUtc7: 1699000000000 },
      },
      version: 6,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(v6Snapshot));
    await useSaveState.persist.rehydrate();
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(2);
    expect(useSaveState.getState().claimedRewards).toEqual(['main-level-5']);
  });
});

describe('SaveState v6 quest actions', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('incrementQuestProgress adds delta and clamps at target', () => {
    useSaveState.getState().incrementQuestProgress('daily-combat-3', 2);
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(2);
    useSaveState.getState().incrementQuestProgress('daily-combat-3', 5); // overflow target=3
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(3);
  });

  it('incrementQuestProgress no-op when quest already claimed', () => {
    useSaveState.setState({ claimedRewards: ['daily-combat-3'] });
    useSaveState.getState().incrementQuestProgress('daily-combat-3', 1);
    expect(useSaveState.getState().questProgress['daily-combat-3'] ?? 0).toBe(0);
  });

  it('incrementQuestProgress no-op for unknown quest id', () => {
    useSaveState.getState().incrementQuestProgress('nonexistent-quest', 1);
    expect(useSaveState.getState().questProgress['nonexistent-quest'] ?? 0).toBe(0);
  });

  it('isQuestReady returns true only at target AND not claimed', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    expect(useSaveState.getState().isQuestReady('daily-combat-3')).toBe(true);
    useSaveState.setState({ claimedRewards: ['daily-combat-3'] });
    expect(useSaveState.getState().isQuestReady('daily-combat-3')).toBe(false);
  });

  it('isQuestReady returns false when below target', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 2 } });
    expect(useSaveState.getState().isQuestReady('daily-combat-3')).toBe(false);
  });

  it('claimQuestReward returns ItemDef on first call, null on second', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    const item1 = useSaveState.getState().claimQuestReward('daily-combat-3', 1);
    expect(item1).not.toBeNull();
    expect(useSaveState.getState().claimedRewards).toContain('daily-combat-3');
    const item2 = useSaveState.getState().claimQuestReward('daily-combat-3', 1);
    expect(item2).toBeNull();
  });

  it('claimQuestReward returns null when below target', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 2 } });
    const item = useSaveState.getState().claimQuestReward('daily-combat-3', 1);
    expect(item).toBeNull();
  });

  it('claimQuestReward mints inventory item on success', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    const before = useSaveState.getState().inventory.length;
    useSaveState.getState().claimQuestReward('daily-combat-3', 1);
    expect(useSaveState.getState().inventory.length).toBe(before + 1);
  });

  it('refreshCyclesIfNeeded resets daily progress when daily anchor expired', () => {
    const oldDaily = Date.UTC(2025, 0, 1, 0, 0); // ancient anchor
    const now = Date.UTC(2026, 4, 2, 5, 0);
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 2, 'weekly-combat-20': 5, 'main-level-5': 1 },
      claimedRewards: ['daily-quiz-5'],
      questCycleAnchors: { dailyEpochUtc7: oldDaily, weeklyEpochUtc7: weeklyAnchor(now) },
    });
    const result = useSaveState.getState().refreshCyclesIfNeeded(now);
    expect(result.dailyReset).toBe(true);
    expect(result.weeklyReset).toBe(false);
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBeUndefined();
    expect(useSaveState.getState().questProgress['weekly-combat-20']).toBe(5);
    expect(useSaveState.getState().questProgress['main-level-5']).toBe(1);
    expect(useSaveState.getState().claimedRewards).not.toContain('daily-quiz-5');
  });

  it('refreshCyclesIfNeeded does nothing when both anchors current', () => {
    const now = Date.UTC(2026, 4, 2, 5, 0);
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 2 },
      questCycleAnchors: {
        dailyEpochUtc7: dailyAnchor(now),
        weeklyEpochUtc7: weeklyAnchor(now),
      },
    });
    const result = useSaveState.getState().refreshCyclesIfNeeded(now);
    expect(result.dailyReset).toBe(false);
    expect(result.weeklyReset).toBe(false);
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(2);
  });

  it('reset() zeroes quest fields', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 1 },
      claimedRewards: ['weekly-pet-1'],
    });
    useSaveState.getState().reset();
    expect(useSaveState.getState().questProgress).toEqual({});
    expect(useSaveState.getState().claimedRewards).toEqual([]);
  });
});

describe('SaveState v7 migration', () => {
  it('migrates v6 → v7 with default identity + settings fields', async () => {
    const v6 = {
      schemaVersion: 6,
      questProgress: {},
      claimedRewards: [],
      questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 },
      ownedPets: [],
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify({ state: v6, version: 6 }));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.playerName).toBeNull();
    expect(s.gender).toBe('male');
    expect(s.hairStyle).toBe('a');
    expect(s.hintDifficulty).toBe('medium');
  });

  it('idempotent on v7 — non-default values preserved', async () => {
    const v7 = {
      schemaVersion: 7,
      playerName: 'Minh',
      gender: 'male',
      hairStyle: 'c',
      hintDifficulty: 'hard',
      questProgress: {},
      claimedRewards: [],
      questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 },
      ownedPets: [],
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify({ state: v7, version: 7 }));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.playerName).toBe('Minh');
    expect(s.gender).toBe('male');
    expect(s.hairStyle).toBe('c');
    expect(s.hintDifficulty).toBe('hard');
  });
});

describe('SaveState v7 actions', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('setPlayerName persists string', () => {
    useSaveState.getState().setPlayerName('Linh');
    expect(useSaveState.getState().playerName).toBe('Linh');
  });

  it('setPlayerName(null) clears to placeholder state', () => {
    useSaveState.getState().setPlayerName('Linh');
    useSaveState.getState().setPlayerName(null);
    expect(useSaveState.getState().playerName).toBeNull();
  });

  it('setGender persists', () => {
    useSaveState.getState().setGender('female');
    expect(useSaveState.getState().gender).toBe('female');
  });

  it('setHairStyle persists', () => {
    useSaveState.getState().setHairStyle('c');
    expect(useSaveState.getState().hairStyle).toBe('c');
  });

  it('setHintDifficulty persists', () => {
    useSaveState.getState().setHintDifficulty('hard');
    expect(useSaveState.getState().hintDifficulty).toBe('hard');
  });

  it('reset() zeroes identity + settings to defaults', () => {
    const s = useSaveState.getState();
    s.setPlayerName('Minh');
    s.setGender('female');
    s.setHairStyle('d');
    s.setHintDifficulty('hard');
    s.reset();
    const after = useSaveState.getState();
    expect(after.playerName).toBeNull();
    expect(after.gender).toBe('male');
    expect(after.hairStyle).toBe('a');
    expect(after.hintDifficulty).toBe('medium');
  });
});

// ─── Sprint F — v8 daily reward fields ────────────────────────────────────────

describe('SaveState v8 migration', () => {
  it('migrates v7 → v8 with 4 new fields defaulting to 0', async () => {
    const v7Snapshot = {
      schemaVersion: 7,
      playerName: 'Minh',
      gender: 'male',
      hairStyle: 'a',
      hintDifficulty: 'medium',
      questProgress: {},
      claimedRewards: [],
      questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 },
      ownedPets: [],
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify({ state: v7Snapshot, version: 7 }));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.lastLoginAnchorUtc7).toBe(0);
    expect(s.loginStreak).toBe(0);
    expect(s.battleStars).toBe(0);
    expect(s.lootJarBattlesSinceLast).toBe(0);
    // pre-existing v7 fields preserved
    expect(s.playerName).toBe('Minh');
    expect(s.hintDifficulty).toBe('medium');
  });

  it('idempotent on v8 — non-zero values preserved through re-hydration', async () => {
    const v8Snapshot = {
      schemaVersion: 8,
      playerName: 'An',
      gender: 'female',
      hairStyle: 'b',
      hintDifficulty: 'easy',
      questProgress: {},
      claimedRewards: [],
      questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 },
      ownedPets: [],
      lastLoginAnchorUtc7: 9999,
      loginStreak: 3,
      battleStars: 42,
      lootJarBattlesSinceLast: 1,
    };
    localStorage.setItem(SAVE_STATE_KEY, JSON.stringify({ state: v8Snapshot, version: 8 }));
    await useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.lastLoginAnchorUtc7).toBe(9999);
    expect(s.loginStreak).toBe(3);
    expect(s.battleStars).toBe(42);
    expect(s.lootJarBattlesSinceLast).toBe(1);
  });
});

describe('Sprint F — v8 daily reward fields', () => {
  beforeEach(() => {
    localStorage.clear();
    useSaveState.getState().reset();
  });

  describe('addBattleStars', () => {
    it('adds positive amount to battleStars', () => {
      useSaveState.getState().addBattleStars(15);
      expect(useSaveState.getState().battleStars).toBe(15);
      useSaveState.getState().addBattleStars(10);
      expect(useSaveState.getState().battleStars).toBe(25);
    });

    it('no-op for amount === 0', () => {
      useSaveState.getState().addBattleStars(20);
      useSaveState.getState().addBattleStars(0);
      expect(useSaveState.getState().battleStars).toBe(20);
    });

    it('no-op for negative amount', () => {
      useSaveState.getState().addBattleStars(20);
      useSaveState.getState().addBattleStars(-5);
      expect(useSaveState.getState().battleStars).toBe(20);
    });
  });

  describe('incrementLootJarCounter', () => {
    it('starts at 0 after reset', () => {
      expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(0);
    });

    it('increments by 1 each call', () => {
      useSaveState.getState().incrementLootJarCounter();
      useSaveState.getState().incrementLootJarCounter();
      expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(2);
    });
  });

  describe('isLootJarReady', () => {
    it('LOOT_JAR_THRESHOLD is 3', () => {
      expect(LOOT_JAR_THRESHOLD).toBe(3);
    });

    it('false when counter < threshold', () => {
      for (let i = 0; i < LOOT_JAR_THRESHOLD - 1; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      expect(useSaveState.getState().isLootJarReady()).toBe(false);
    });

    it('true when counter === threshold', () => {
      for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      expect(useSaveState.getState().isLootJarReady()).toBe(true);
    });

    it('true when counter > threshold', () => {
      for (let i = 0; i < LOOT_JAR_THRESHOLD + 2; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      expect(useSaveState.getState().isLootJarReady()).toBe(true);
    });
  });

  describe('claimLootJar', () => {
    it('returns null when counter < threshold (not ready)', () => {
      useSaveState.getState().incrementLootJarCounter();
      useSaveState.getState().incrementLootJarCounter();
      const result = useSaveState.getState().claimLootJar(1);
      expect(result).toBeNull();
    });

    it('returns null when counter === 0', () => {
      const result = useSaveState.getState().claimLootJar(1);
      expect(result).toBeNull();
    });

    it('mints 3 items and resets counter when ready', () => {
      // Use a deterministic rng so rollDrop always picks an item
      const deterministicRng = () => 0;
      for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      const inventoryBefore = useSaveState.getState().inventory.length;
      const items = useSaveState.getState().claimLootJar(5, deterministicRng);
      expect(items).not.toBeNull();
      expect(items).toHaveLength(3);
      expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(0);
      // Inventory grew by 3
      expect(useSaveState.getState().inventory.length).toBe(inventoryBefore + 3);
    });

    it('each minted item has a valid itemId and instanceId', () => {
      const deterministicRng = () => 0;
      for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      const items = useSaveState.getState().claimLootJar(5, deterministicRng);
      expect(items).not.toBeNull();
      for (const item of items!) {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
      }
      // Verify inventory entries are properly linked
      const inventory = useSaveState.getState().inventory;
      const lastThree = inventory.slice(-3);
      for (const inv of lastThree) {
        expect(typeof inv.instanceId).toBe('string');
        expect(typeof inv.itemId).toBe('string');
        expect(typeof inv.acquiredAt).toBe('number');
      }
    });

    it('returns null again after claiming (counter reset to 0)', () => {
      const deterministicRng = () => 0;
      for (let i = 0; i < LOOT_JAR_THRESHOLD; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      useSaveState.getState().claimLootJar(5, deterministicRng);
      expect(useSaveState.getState().claimLootJar(5, deterministicRng)).toBeNull();
    });

    it('always returns exactly 3 items with default RNG (registry guarantee)', () => {
      for (let i = 0; i < 3; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      // Default rng = Math.random — relies on the production item registry
      // having common items at minLevel <= 1.
      const items = useSaveState.getState().claimLootJar(1);
      expect(items).not.toBeNull();
      expect(items).toHaveLength(3);
    });

    it('returns null gracefully when rollDrop has no eligible item (registry edge case)', () => {
      for (let i = 0; i < 3; i++) {
        useSaveState.getState().incrementLootJarCounter();
      }
      // Force rollDrop to fail by passing heroLevel = 0.
      // All common items in registry have minLevel >= 1, so rollDrop will return null.
      const items = useSaveState.getState().claimLootJar(0);
      // Should return null gracefully (not throw)
      expect(items).toBeNull();
      // Counter should NOT be reset on null return (player can retry)
      expect(useSaveState.getState().lootJarBattlesSinceLast).toBe(3);
    });
  });

  describe('commitLoginClaim + isLoginClaimable', () => {
    it('isLoginClaimable true when never claimed (anchor=0)', () => {
      expect(useSaveState.getState().isLoginClaimable()).toBe(true);
    });

    it('commitLoginClaim sets anchor + streak atomically', () => {
      const now = Date.now();
      const todayAnchor = dailyAnchor(now);
      useSaveState.getState().commitLoginClaim(todayAnchor, 1);
      expect(useSaveState.getState().lastLoginAnchorUtc7).toBe(todayAnchor);
      expect(useSaveState.getState().loginStreak).toBe(1);
    });

    it('isLoginClaimable false same day after commit', () => {
      const now = Date.now();
      const todayAnchor = dailyAnchor(now);
      useSaveState.getState().commitLoginClaim(todayAnchor, 1);
      expect(useSaveState.getState().isLoginClaimable(now)).toBe(false);
    });

    it('isLoginClaimable true after 1 day (yesterday anchor stored)', () => {
      const now = Date.now();
      const yesterdayAnchor = dailyAnchor(now) - 24 * 60 * 60 * 1000;
      useSaveState.getState().commitLoginClaim(yesterdayAnchor, 5);
      expect(useSaveState.getState().loginStreak).toBe(5);
      expect(useSaveState.getState().isLoginClaimable(now)).toBe(true);
    });

    it('commitLoginClaim updates streak correctly', () => {
      useSaveState.getState().commitLoginClaim(12345, 7);
      expect(useSaveState.getState().loginStreak).toBe(7);
      useSaveState.getState().commitLoginClaim(99999, 8);
      expect(useSaveState.getState().loginStreak).toBe(8);
    });
  });

  describe('reset', () => {
    it('clears all 4 v8 fields to 0', () => {
      useSaveState.getState().addBattleStars(99);
      useSaveState.getState().incrementLootJarCounter();
      useSaveState.getState().commitLoginClaim(1234567890, 7);
      useSaveState.getState().reset();
      const s = useSaveState.getState();
      expect(s.battleStars).toBe(0);
      expect(s.lootJarBattlesSinceLast).toBe(0);
      expect(s.lastLoginAnchorUtc7).toBe(0);
      expect(s.loginStreak).toBe(0);
    });
  });
});

describe('Phase 3 — v9 schema + actions', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  describe('v9 schema fields default values', () => {
    it('shopStock empty, refreshedAt 0, history empty', () => {
      const s = useSaveState.getState();
      expect(s.shopStock).toEqual([]);
      expect(s.shopStockRefreshedAt).toBe(0);
      expect(s.purchaseHistory).toEqual({});
    });

    it('breedingChamber null, clientNonce 0', () => {
      const s = useSaveState.getState();
      expect(s.breedingChamber).toBeNull();
      expect(s.clientNonce).toBe(0);
    });
  });

  describe('spendBattleStars', () => {
    it('subtracts when sufficient', () => {
      useSaveState.getState().addBattleStars(100);
      useSaveState.getState().spendBattleStars(30);
      expect(useSaveState.getState().battleStars).toBe(70);
    });

    it('throws when amount > balance', () => {
      useSaveState.getState().addBattleStars(10);
      expect(() => useSaveState.getState().spendBattleStars(20)).toThrow();
    });

    it('throws when amount <= 0', () => {
      useSaveState.getState().addBattleStars(50);
      expect(() => useSaveState.getState().spendBattleStars(0)).toThrow();
      expect(() => useSaveState.getState().spendBattleStars(-5)).toThrow();
    });
  });

  describe('refreshShopStockIfNeeded', () => {
    it('rolls stock when refreshedAt=0', () => {
      useSaveState.getState().refreshShopStockIfNeeded(Date.now());
      const s = useSaveState.getState();
      expect(s.shopStock.length).toBeGreaterThanOrEqual(3);
      expect(s.shopStockRefreshedAt).toBeGreaterThan(0);
    });

    it('no-op when same-day call after refresh', () => {
      const now = Date.now();
      useSaveState.getState().refreshShopStockIfNeeded(now);
      const beforeAnchor = useSaveState.getState().shopStockRefreshedAt;
      useSaveState.getState().refreshShopStockIfNeeded(now + 1000);
      expect(useSaveState.getState().shopStockRefreshedAt).toBe(beforeAnchor);
    });

    it('refreshes on cross-day boundary', () => {
      const now = Date.now();
      useSaveState.getState().refreshShopStockIfNeeded(now);
      const tomorrow = now + 25 * 60 * 60 * 1000;
      useSaveState.getState().refreshShopStockIfNeeded(tomorrow);
      expect(useSaveState.getState().shopStockRefreshedAt).toBe(dailyAnchor(tomorrow));
    });
  });

  describe('applyShopPurchase', () => {
    beforeEach(() => {
      useSaveState.getState().addBattleStars(500);
      useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    });

    it('mints item, spends stars, decrements stock, bumps history', () => {
      const slot = useSaveState.getState().shopStock[0]!;
      const beforeInv = useSaveState.getState().inventory.length;
      const beforeStars = useSaveState.getState().battleStars;
      useSaveState.getState().applyShopPurchase(slot.itemId, slot.priceBattleStars);
      const after = useSaveState.getState();
      expect(after.inventory.length).toBe(beforeInv + 1);
      expect(after.battleStars).toBe(beforeStars - slot.priceBattleStars);
      expect(after.purchaseHistory[slot.itemId]).toBe(1);
      const slotAfter = after.shopStock.find((s) => s.itemId === slot.itemId)!;
      expect(slotAfter.stockRemaining).toBe(slot.stockRemaining - 1);
    });
  });

  describe('startBreeding + clearBreeding', () => {
    it('startBreeding sets chamber + charges stars', () => {
      useSaveState.getState().addBattleStars(300);
      const session = {
        parentA: 'pet-a',
        parentB: 'pet-b',
        startedAt: Date.now(),
        durationMs: 0,
        costBattleStars: 200,
        offspringSpec: { codename: 'aquakit' as const, rarity: 'rare' as const, level: 5 },
      };
      useSaveState.getState().startBreeding(session);
      expect(useSaveState.getState().breedingChamber).toEqual(session);
      expect(useSaveState.getState().battleStars).toBe(100);
    });

    it('startBreeding throws when chamber busy', () => {
      useSaveState.getState().addBattleStars(300);
      const session = {
        parentA: 'a',
        parentB: 'b',
        startedAt: 0,
        durationMs: 0,
        costBattleStars: 50,
        offspringSpec: { codename: 'bunbleaf' as const, rarity: 'common' as const, level: 1 },
      };
      useSaveState.getState().startBreeding(session);
      expect(() => useSaveState.getState().startBreeding(session)).toThrow();
    });

    it('startBreeding throws when stars insufficient', () => {
      useSaveState.getState().addBattleStars(10);
      const session = {
        parentA: 'a',
        parentB: 'b',
        startedAt: 0,
        durationMs: 0,
        costBattleStars: 100,
        offspringSpec: { codename: 'bunbleaf' as const, rarity: 'common' as const, level: 1 },
      };
      expect(() => useSaveState.getState().startBreeding(session)).toThrow();
    });

    it('clearBreeding sets chamber to null', () => {
      useSaveState.getState().addBattleStars(300);
      useSaveState.getState().startBreeding({
        parentA: 'a',
        parentB: 'b',
        startedAt: 0,
        durationMs: 0,
        costBattleStars: 50,
        offspringSpec: { codename: 'bunbleaf' as const, rarity: 'common' as const, level: 1 },
      });
      useSaveState.getState().clearBreeding();
      expect(useSaveState.getState().breedingChamber).toBeNull();
    });
  });

  describe('bumpClientNonce', () => {
    it('increments by 1 each call', () => {
      useSaveState.getState().bumpClientNonce();
      useSaveState.getState().bumpClientNonce();
      expect(useSaveState.getState().clientNonce).toBe(2);
    });
  });

  describe('isShopStockFresh + isBreedingChamberBusy', () => {
    it('isShopStockFresh true after refresh', () => {
      useSaveState.getState().refreshShopStockIfNeeded(Date.now());
      expect(useSaveState.getState().isShopStockFresh()).toBe(true);
    });

    it('isShopStockFresh false on fresh state (refreshedAt=0)', () => {
      expect(useSaveState.getState().isShopStockFresh()).toBe(false);
    });

    it('isBreedingChamberBusy true after startBreeding', () => {
      useSaveState.getState().addBattleStars(100);
      useSaveState.getState().startBreeding({
        parentA: 'a',
        parentB: 'b',
        startedAt: 0,
        durationMs: 0,
        costBattleStars: 50,
        offspringSpec: { codename: 'bunbleaf' as const, rarity: 'common' as const, level: 1 },
      });
      expect(useSaveState.getState().isBreedingChamberBusy()).toBe(true);
    });

    it('isBreedingChamberBusy false when chamber null', () => {
      expect(useSaveState.getState().isBreedingChamberBusy()).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears all v9 fields', () => {
      useSaveState.getState().addBattleStars(100);
      useSaveState.getState().bumpClientNonce();
      useSaveState.getState().refreshShopStockIfNeeded(Date.now());
      useSaveState.getState().reset();
      const s = useSaveState.getState();
      expect(s.shopStock).toEqual([]);
      expect(s.shopStockRefreshedAt).toBe(0);
      expect(s.purchaseHistory).toEqual({});
      expect(s.breedingChamber).toBeNull();
      expect(s.clientNonce).toBe(0);
    });
  });
});
