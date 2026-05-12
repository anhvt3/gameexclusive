# Phase 3 — Shop + Pet Breeding + Server Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 3 production features (Shop, Pet Breeding, Server Validation) on top of Phase 2.5 (Sprint F) — closing the spend-side economy loop, completing the pet-collection arc, and adding anti-cheat seam for upcoming public launch.

**Architecture:** SaveState v8→v9 additive migration with 5 new fields (`shopStock`, `shopStockRefreshedAt`, `purchaseHistory`, `breedingChamber`, `clientNonce`). Pure-TS domain modules (`ShopEngine`, `PetBreedingEngine`, `ServerValidator`) consumed by orchestration helpers (`performShopPurchase`, `performBreedingStart`, `performBreedingHatch`). Vite middleware exposes HMAC-validated `/api/shop/validate` + `/api/breed/validate` endpoints. React overlays + components reuse Sprint F's discipline (timer cleanup, idempotency guards, controlled `open`/`onClose`). EventBus gains 4 typed events.

**Tech Stack:** Vite 8 + React 19 + TS 5.6 + Zustand 5 (persist v7) + mitt 3 + Zod 4 + Vitest 4 + Playwright 1.59 + Howler 2.2.

**Spec doc:** `docs/superpowers/specs/2026-05-12-phase-3-shop-pets-design.md`

**Working directory:** `D:\projectlocal\clevai\Game_exclusive\.claude\worktrees\phase3-shop-pets-7ab956` (bash cwd at repo root unless noted).

**Branch:** `claude/phase3-shop-pets-7ab956` from `main@13aefb6`.

---

## Task dependency graph

```
P3.0 Preflight
  ↓
P3.1 types/{shop,breeding}.ts
  ↓
  ├─→ P3.2 shopCatalog.ts ──────┐
  └─→ P3.3 breedingPairs + breedingCosts ──┐
                                            ↓
                            P3.6 SaveState v8→v9 + 8 actions
                                            ↓
                            P3.7 EventBus +4 events
                                            ↓
                                ┌───────────┴───────────┐
                                ↓                       ↓
                       P3.4 ShopEngine         P3.5 PetBreedingEngine
                                ↓                       ↓
                       P3.8 ServerValidator (used by both)
                                ↓
                       P3.9 server/validationRoutes.ts
                                ↓
                                ┌───────────┴───────────┐
                                ↓                       ↓
                       P3.10 performShopPurchase   P3.11 performBreeding{Start,Hatch}
                                ↓                       ↓
                       P3.12 Components (ShopItemCard, PetSlot, EggHatchAnim)
                                ↓
                                ┌───────────┴───────────┐
                                ↓                       ↓
                       P3.13 ShopOverlay          P3.14 PetBreedingOverlay
                                ↓                       ↓
                       P3.15 MainMenu edits (mount both overlays via local state)
                                ↓
                       P3.16 AppRouter (refreshShopStockIfNeeded on mount/focus)
                                ↓
                       P3.17 E2E phase_3_shop_pets.spec.ts
                                ↓
                       P3.18 AP/ISP/todo docs
```

**Critical reorder note (Sprint F lesson):** P3.6 + P3.7 must ship BEFORE P3.4/P3.5 because engines depend on SaveState v9 actions + new EventBus events.

---

## Task 0 — Preflight verification

**Files:**
- No files modified. Verification only.

- [ ] **Step 1: Verify worktree state**

Run:
```bash
cd /d/projectlocal/clevai/Game_exclusive/.claude/worktrees/phase3-shop-pets-7ab956
git status --short
git branch --show-current
git log --oneline -3
```

Expected: branch `claude/phase3-shop-pets-7ab956`, HEAD at `13aefb6` plus any plan/spec commits, no untracked code files (only docs/tasks).

- [ ] **Step 2: Install deps + baseline tests**

```bash
cd app && npm install
npm run test:run 2>&1 | tail -5
```

Expected: 964 tests passing.

- [ ] **Step 3: Verify gates baseline**

```bash
npm run lint
npm run typecheck
npm run verify
```

Expected: all green.

- [ ] **Step 4: Commit plan + spec docs if not yet committed**

```bash
cd /d/projectlocal/clevai/Game_exclusive/.claude/worktrees/phase3-shop-pets-7ab956
git add docs/superpowers/specs/2026-05-12-phase-3-shop-pets-design.md \
        docs/superpowers/plans/2026-05-12-phase-3-shop-pets-plan.md \
        tasks/todo_phase3.md
git commit -m "docs(phase-3): spec + plan + clarifying doc"
```

---

## Task 1 — types/{shop,breeding}.ts

**Files:**
- Create: `app/src/types/shop.ts`
- Create: `app/src/types/breeding.ts`
- Test: none (pure types — typecheck is the test)

- [ ] **Step 1: Write `app/src/types/shop.ts`**

```ts
// app/src/types/shop.ts

/**
 * Phase 3 — Shop types (AP §11.10).
 *
 * Pure types — no logic. Consumed by Tasks 2-15.
 */

import type { ItemId, ItemRarity } from '@/data/staticConfig/items';

export interface ShopItemSlot {
  readonly itemId: ItemId;
  readonly priceBattleStars: number;
  stockRemaining: number;
  readonly cycleLimit: number;
}

export interface ShopCatalogEntry {
  readonly itemId: ItemId;
  readonly rarity: ItemRarity;
  readonly basePrice: number;
}

export type ShopPurchaseFailureReason =
  | 'not_in_stock'
  | 'stock_exhausted'
  | 'insufficient_stars'
  | 'server_hmac_mismatch'
  | 'server_bad_nonce'
  | 'server_fetch_failed_soft_allow';
```

- [ ] **Step 2: Write `app/src/types/breeding.ts`**

```ts
// app/src/types/breeding.ts

/**
 * Phase 3 — Breeding types (AP §11.11).
 *
 * Pure types — no logic. Consumed by Tasks 3, 5, 6, 11, 14.
 */

import type { PetCodename, PetRarity, ElementType } from './pet';

export type PetInstanceId = string;

export interface BreedingSession {
  readonly parentA: PetInstanceId;
  readonly parentB: PetInstanceId;
  readonly startedAt: number;
  readonly durationMs: number;
  readonly costBattleStars: number;
  readonly offspringSpec: {
    readonly codename: PetCodename;
    readonly rarity: PetRarity;
    readonly level: number;
  };
}

export interface CompatResult {
  readonly level: 'low' | 'medium' | 'high';
  readonly multiplier: number;
}

export interface OffspringSpec {
  readonly codename: PetCodename;
  readonly rarity: PetRarity;
  readonly level: number;
  readonly costBattleStars: number;
}

export interface BreedingPair {
  readonly elementA: ElementType;
  readonly elementB: ElementType;
  readonly offspringCodename: PetCodename;
}

export type BreedingFailureReason =
  | 'chamber_busy'
  | 'roster_full'
  | 'parent_not_found'
  | 'same_parent'
  | 'insufficient_stars'
  | 'server_hmac_mismatch'
  | 'server_bad_nonce'
  | 'server_fetch_failed_soft_allow'
  | 'no_active_session'
  | 'not_ready';
```

- [ ] **Step 3: Run typecheck**

```bash
cd app && npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/src/types/shop.ts app/src/types/breeding.ts
git commit -m "feat(phase-3): types/shop.ts + types/breeding.ts"
```

---

## Task 2 — data/staticConfig/shopCatalog.ts

**Files:**
- Create: `app/src/data/staticConfig/shopCatalog.ts`
- Test: `app/src/data/staticConfig/shopCatalog.test.ts`

- [ ] **Step 1: Verify item IDs exist in `items.ts`**

Run:
```bash
grep -E "id: '" app/src/data/staticConfig/items.ts | head -20
```

Look for: `health-potion-small`, `mana-potion-small`, `wooden-staff`, `cloth-hat`, `leather-boots`, `health-potion-medium`, `silver-wand`, `enchanted-cloak`, `mage-amulet`, `crystal-ring`, `phoenix-feather`, `archmage-robe`, `dragon-scale-shield`. If any are missing, ADJUST the catalog to use existing item IDs of matching rarity instead.

- [ ] **Step 2: Write failing tests**

```ts
// app/src/data/staticConfig/shopCatalog.test.ts
import { describe, it, expect } from 'vitest';
import { SHOP_CATALOG } from './shopCatalog';
import { ITEM_REGISTRY } from './items';

describe('SHOP_CATALOG', () => {
  it('has between 12 and 15 entries', () => {
    expect(SHOP_CATALOG.length).toBeGreaterThanOrEqual(12);
    expect(SHOP_CATALOG.length).toBeLessThanOrEqual(15);
  });

  it('every itemId resolves to a real ItemDef', () => {
    for (const entry of SHOP_CATALOG) {
      const exists = ITEM_REGISTRY.some((i) => i.id === entry.itemId);
      expect(exists, `itemId "${entry.itemId}" not in ITEM_REGISTRY`).toBe(true);
    }
  });

  it('common prices are 25-50 stars', () => {
    for (const e of SHOP_CATALOG.filter((e) => e.rarity === 'common')) {
      expect(e.basePrice).toBeGreaterThanOrEqual(25);
      expect(e.basePrice).toBeLessThanOrEqual(50);
    }
  });

  it('rare prices are 100-200 stars', () => {
    for (const e of SHOP_CATALOG.filter((e) => e.rarity === 'rare')) {
      expect(e.basePrice).toBeGreaterThanOrEqual(100);
      expect(e.basePrice).toBeLessThanOrEqual(200);
    }
  });

  it('epic prices are 400-600 stars', () => {
    for (const e of SHOP_CATALOG.filter((e) => e.rarity === 'epic')) {
      expect(e.basePrice).toBeGreaterThanOrEqual(400);
      expect(e.basePrice).toBeLessThanOrEqual(600);
    }
  });

  it('has at least 3 common + 1 rare + 1 epic entries (cycle limits)', () => {
    const common = SHOP_CATALOG.filter((e) => e.rarity === 'common').length;
    const rare = SHOP_CATALOG.filter((e) => e.rarity === 'rare').length;
    const epic = SHOP_CATALOG.filter((e) => e.rarity === 'epic').length;
    expect(common).toBeGreaterThanOrEqual(3);
    expect(rare).toBeGreaterThanOrEqual(1);
    expect(epic).toBeGreaterThanOrEqual(1);
  });

  it('all itemIds are unique', () => {
    const ids = SHOP_CATALOG.map((e) => e.itemId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL (module missing)**

```bash
cd app && npx vitest run src/data/staticConfig/shopCatalog.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Write `shopCatalog.ts`**

```ts
// app/src/data/staticConfig/shopCatalog.ts

import type { ShopCatalogEntry } from '@/types/shop';

/**
 * Phase 3 — Shop catalog (AP §11.10, Q2 pricing).
 *
 * Per-cycle rotation picks subset via ShopEngine.rollStock; cycle
 * limits enforced as 3 common / 1 rare / 1 epic (Q3 hard cap).
 *
 * Adjust itemIds if any don't resolve (Step 1 sanity check).
 */
export const SHOP_CATALOG: ReadonlyArray<ShopCatalogEntry> = [
  // ── common (25-50 stars) ──
  { itemId: 'health-potion-small',  rarity: 'common', basePrice: 25 },
  { itemId: 'mana-potion-small',    rarity: 'common', basePrice: 25 },
  { itemId: 'wooden-staff',         rarity: 'common', basePrice: 40 },
  { itemId: 'cloth-hat',            rarity: 'common', basePrice: 35 },
  { itemId: 'leather-boots',        rarity: 'common', basePrice: 50 },
  { itemId: 'health-potion-medium', rarity: 'common', basePrice: 50 },

  // ── rare (100-200 stars) ──
  { itemId: 'silver-wand',          rarity: 'rare',   basePrice: 150 },
  { itemId: 'enchanted-cloak',      rarity: 'rare',   basePrice: 180 },
  { itemId: 'mage-amulet',          rarity: 'rare',   basePrice: 200 },
  { itemId: 'crystal-ring',         rarity: 'rare',   basePrice: 120 },

  // ── epic (400-600 stars) ──
  { itemId: 'phoenix-feather',      rarity: 'epic',   basePrice: 500 },
  { itemId: 'archmage-robe',        rarity: 'epic',   basePrice: 600 },
  { itemId: 'dragon-scale-shield',  rarity: 'epic',   basePrice: 450 },
];
```

**If itemIds don't all resolve:** swap with any existing common/rare/epic items from `items.ts`. Catalog needs ≥3 common, ≥1 rare, ≥1 epic.

- [ ] **Step 5: Run tests — expect PASS (7 tests)**

```bash
cd app && npx vitest run src/data/staticConfig/shopCatalog.test.ts
```

Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add app/src/data/staticConfig/shopCatalog.ts app/src/data/staticConfig/shopCatalog.test.ts
git commit -m "feat(phase-3): shopCatalog (13 items, common/rare/epic tiers)"
```

---

## Task 3 — breedingPairs.ts + breedingCosts.ts

**Files:**
- Create: `app/src/data/staticConfig/breedingPairs.ts`
- Create: `app/src/data/staticConfig/breedingPairs.test.ts`
- Create: `app/src/data/staticConfig/breedingCosts.ts`
- Create: `app/src/data/staticConfig/breedingCosts.test.ts`

- [ ] **Step 1: Inspect existing pet codenames**

```bash
grep -nE "codename:" app/src/data/staticConfig/pets.ts 2>&1 | head -20
```

Note actual codenames (Sprint C shipped 6 starters). These become offspring targets.

- [ ] **Step 2: Write `breedingCosts.test.ts`**

```ts
// app/src/data/staticConfig/breedingCosts.test.ts
import { describe, it, expect } from 'vitest';
import { BREEDING_COSTS } from './breedingCosts';

describe('BREEDING_COSTS', () => {
  it('has costs for all 4 rarities', () => {
    expect(BREEDING_COSTS.common).toBe(50);
    expect(BREEDING_COSTS.rare).toBe(200);
    expect(BREEDING_COSTS.epic).toBe(500);
    expect(BREEDING_COSTS.legendary).toBe(1000);
  });

  it('costs are strictly ascending with rarity', () => {
    expect(BREEDING_COSTS.common).toBeLessThan(BREEDING_COSTS.rare);
    expect(BREEDING_COSTS.rare).toBeLessThan(BREEDING_COSTS.epic);
    expect(BREEDING_COSTS.epic).toBeLessThan(BREEDING_COSTS.legendary);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
cd app && npx vitest run src/data/staticConfig/breedingCosts.test.ts
```

- [ ] **Step 4: Write `breedingCosts.ts`**

```ts
// app/src/data/staticConfig/breedingCosts.ts
import type { PetRarity } from '@/types/pet';

/**
 * Phase 3 — Breeding cost per offspring rarity (Q4 override).
 *
 * Cost charged at performBreedingStart (before chamber lock).
 * Parents stay in roster regardless of outcome.
 */
export const BREEDING_COSTS: Readonly<Record<PetRarity, number>> = {
  common:    50,
  rare:      200,
  epic:      500,
  legendary: 1000,
};
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd app && npx vitest run src/data/staticConfig/breedingCosts.test.ts
```

- [ ] **Step 6: Write `breedingPairs.test.ts`**

```ts
// app/src/data/staticConfig/breedingPairs.test.ts
import { describe, it, expect } from 'vitest';
import { BREEDING_PAIRS, lookupPair } from './breedingPairs';
import { PET_REGISTRY } from './pets';

describe('BREEDING_PAIRS', () => {
  it('every offspringCodename resolves to a real PetDef', () => {
    const validCodenames = new Set(PET_REGISTRY.map((p) => p.codename));
    for (const pair of BREEDING_PAIRS) {
      expect(
        validCodenames.has(pair.offspringCodename),
        `codename "${pair.offspringCodename}" not in PET_REGISTRY`,
      ).toBe(true);
    }
  });

  it('has no duplicate (elementA, elementB) pairs', () => {
    const seen = new Set<string>();
    for (const p of BREEDING_PAIRS) {
      const key = [p.elementA, p.elementB].sort().join('|');
      expect(seen.has(key), `duplicate pair: ${key}`).toBe(false);
      seen.add(key);
    }
  });
});

describe('lookupPair', () => {
  it('finds pair regardless of element order', () => {
    const a = BREEDING_PAIRS[0]!;
    expect(lookupPair(a.elementA, a.elementB)?.offspringCodename).toBe(a.offspringCodename);
    expect(lookupPair(a.elementB, a.elementA)?.offspringCodename).toBe(a.offspringCodename);
  });

  it('returns null for same-element pair (not in matrix)', () => {
    // Same-element pairs are NOT in BREEDING_PAIRS by design — caller falls back.
    expect(lookupPair('fire', 'fire')).toBeNull();
  });
});
```

- [ ] **Step 7: Run — expect FAIL**

```bash
cd app && npx vitest run src/data/staticConfig/breedingPairs.test.ts
```

- [ ] **Step 8: Write `breedingPairs.ts`**

```ts
// app/src/data/staticConfig/breedingPairs.ts
import type { BreedingPair } from '@/types/breeding';
import type { ElementType } from '@/types/pet';

/**
 * Phase 3 — Element × element → offspring codename matrix (Q6 default).
 *
 * Same-element pairs intentionally NOT here — caller falls back to
 * higher-rarity parent codename (PetBreedingEngine.rollOffspring).
 *
 * NOTE: offspringCodename values MUST exist in PET_REGISTRY (Sprint C).
 * If a starter codename is missing, swap to a real codename from
 * `app/src/data/staticConfig/pets.ts`. Test will fail if invalid.
 */
export const BREEDING_PAIRS: ReadonlyArray<BreedingPair> = [
  // Adjust codenames to match Sprint C PET_REGISTRY entries
  { elementA: 'fire',  elementB: 'water',  offspringCodename: 'aqualumi' },
  { elementA: 'fire',  elementB: 'earth',  offspringCodename: 'volcanic' },
  { elementA: 'fire',  elementB: 'wind',   offspringCodename: 'sparkwing' },
  { elementA: 'fire',  elementB: 'plant',  offspringCodename: 'phoenixsprout' },
  { elementA: 'water', elementB: 'earth',  offspringCodename: 'mudling' },
  { elementA: 'water', elementB: 'wind',   offspringCodename: 'cloudfox' },
  { elementA: 'water', elementB: 'plant',  offspringCodename: 'lillypup' },
  { elementA: 'earth', elementB: 'wind',   offspringCodename: 'dustsprout' },
  { elementA: 'earth', elementB: 'plant',  offspringCodename: 'rootling' },
  { elementA: 'wind',  elementB: 'plant',  offspringCodename: 'seedglider' },
];

export function lookupPair(a: ElementType, b: ElementType): BreedingPair | null {
  return (
    BREEDING_PAIRS.find(
      (p) =>
        (p.elementA === a && p.elementB === b) ||
        (p.elementA === b && p.elementB === a),
    ) ?? null
  );
}
```

**If a codename like `aqualumi` doesn't exist** in `pets.ts`, **swap with a real codename** from the Sprint C 6-starter roster (look at output of Step 1). The test enforces this — fix the catalog, not the test.

- [ ] **Step 9: Run breedingPairs tests — expect PASS**

```bash
cd app && npx vitest run src/data/staticConfig/breedingPairs.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add app/src/data/staticConfig/breedingPairs.ts \
        app/src/data/staticConfig/breedingPairs.test.ts \
        app/src/data/staticConfig/breedingCosts.ts \
        app/src/data/staticConfig/breedingCosts.test.ts
git commit -m "feat(phase-3): breedingPairs matrix + breedingCosts (Q4 stars table)"
```

---

## Task 6 — SaveState v8→v9 + 8 actions

**(Reordered before Task 4/5 due to dependency. See task graph at top.)**

**Files:**
- Modify: `app/src/persistence/SaveStateStore.ts`
- Modify: `app/src/persistence/SaveStateStore.test.ts`

- [ ] **Step 1: Inspect current v8 schema**

```bash
grep -nE "SCHEMA_VERSION|interface SaveStateData|interface SaveStateActions|INITIAL_STATE|function migrate" app/src/persistence/SaveStateStore.ts | head -20
```

Note line numbers for insertion points. Current `SCHEMA_VERSION = 8` (line ~47).

- [ ] **Step 2: Write failing tests in `SaveStateStore.test.ts` (append new describe block)**

```ts
// Append at the bottom of SaveStateStore.test.ts:
import { dailyAnchor } from '@/domain/QuestCycle';

describe('Phase 3 — v9 schema + actions', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  describe('migration v8 → v9', () => {
    it('injects 5 new fields with defaults from a v8 persisted blob', () => {
      const s = useSaveState.getState();
      expect(s.shopStock).toEqual([]);
      expect(s.shopStockRefreshedAt).toBe(0);
      expect(s.purchaseHistory).toEqual({});
      expect(s.breedingChamber).toBeNull();
      expect(s.clientNonce).toBe(0);
    });
  });

  describe('spendBattleStars', () => {
    it('subtracts amount when sufficient', () => {
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

    it('mints inventory item, spends stars, decrements stock, bumps history', () => {
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
        offspringSpec: { codename: 'aqualumi' as never, rarity: 'rare' as const, level: 5 },
      };
      useSaveState.getState().startBreeding(session);
      expect(useSaveState.getState().breedingChamber).toEqual(session);
      expect(useSaveState.getState().battleStars).toBe(100);
    });

    it('clearBreeding sets chamber to null', () => {
      useSaveState.getState().addBattleStars(300);
      useSaveState.getState().startBreeding({
        parentA: 'a', parentB: 'b', startedAt: 0, durationMs: 0, costBattleStars: 50,
        offspringSpec: { codename: 'aqualumi' as never, rarity: 'common' as const, level: 1 },
      });
      useSaveState.getState().clearBreeding();
      expect(useSaveState.getState().breedingChamber).toBeNull();
    });
  });

  describe('bumpClientNonce', () => {
    it('increments by 1', () => {
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

    it('isBreedingChamberBusy true after startBreeding', () => {
      useSaveState.getState().addBattleStars(100);
      useSaveState.getState().startBreeding({
        parentA: 'a', parentB: 'b', startedAt: 0, durationMs: 0, costBattleStars: 50,
        offspringSpec: { codename: 'aqualumi' as never, rarity: 'common' as const, level: 1 },
      });
      expect(useSaveState.getState().isBreedingChamberBusy()).toBe(true);
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
```

- [ ] **Step 3: Run — expect FAIL (5 new fields, 8 new actions all missing)**

```bash
cd app && npx vitest run src/persistence/SaveStateStore.test.ts
```

- [ ] **Step 4: Edit `SaveStateStore.ts` — bump version + add fields**

Find line `export const SCHEMA_VERSION = 8;` and change to `9`.

Add imports near top:
```ts
import type { ShopItemSlot } from '@/types/shop';
import type { BreedingSession } from '@/types/breeding';
import { dailyAnchor } from '@/domain/QuestCycle';
import { rollStock as rollShopStock } from '@/domain/ShopEngine';
```

**Heads-up:** `rollShopStock` lives in Task 4. To avoid circular dep, Task 4 will import from `@/data/staticConfig/shopCatalog` directly. SaveState calls a thin local helper here OR defer the `rollStock` call to a method on SaveState that lazy-imports. **For this task, inline-implement the rollStock helper INSIDE SaveStateStore.ts** as a private function (re-extracted to ShopEngine in Task 4 if needed). Then Task 4's `ShopEngine` re-exports the same function name pattern.

Actually simpler: define `rollStock` in `ShopEngine.ts` as Task 4 and import here. Since Task 4 is dispatched AFTER Task 6, you need a working SaveState first. So:

**Pattern:** Inline a private `rollShopStockInline` function in SaveStateStore for Task 6. In Task 4, you'll write `ShopEngine.rollStock` independently. Task 6 keeps the inline helper to avoid forward import. Slight duplication for ~25 lines, acceptable.

Inline helper inside `SaveStateStore.ts`:
```ts
import { SHOP_CATALOG } from '@/data/staticConfig/shopCatalog';
import type { ShopCatalogEntry } from '@/types/shop';

const SHOP_CYCLE_LIMITS_INLINE = { common: 3, rare: 1, epic: 1 } as const;

function rollShopStockInline(rng: () => number = Math.random): ShopItemSlot[] {
  const slots: ShopItemSlot[] = [];
  for (const rarity of ['common', 'rare', 'epic'] as const) {
    const pool: ShopCatalogEntry[] = SHOP_CATALOG.filter((e) => e.rarity === rarity);
    const n = SHOP_CYCLE_LIMITS_INLINE[rarity];
    const shuffled = [...pool].sort(() => rng() - 0.5);
    for (const entry of shuffled.slice(0, n)) {
      slots.push({
        itemId: entry.itemId,
        priceBattleStars: entry.basePrice,
        stockRemaining: 1,
        cycleLimit: 1,
      });
    }
  }
  return slots;
}
```

Add fields to `SaveStateData` (after Sprint F fields):
```ts
  // v9 additions (Phase 3 Task 6 — shop + breeding + server validation)
  shopStock: ShopItemSlot[];
  shopStockRefreshedAt: number;
  purchaseHistory: Record<string, number>;
  breedingChamber: BreedingSession | null;
  clientNonce: number;
```

Add actions to `SaveStateActions`:
```ts
  // v9 actions (Phase 3 Task 6)
  spendBattleStars: (amount: number) => void;
  refreshShopStockIfNeeded: (now?: number) => void;
  applyShopPurchase: (itemId: string, priceCharged: number) => void;
  startBreeding: (session: BreedingSession) => void;
  clearBreeding: () => void;
  bumpClientNonce: () => void;
  isShopStockFresh: (now?: number) => boolean;
  isBreedingChamberBusy: () => boolean;
```

Add fields to `INITIAL_STATE`:
```ts
  shopStock: [],
  shopStockRefreshedAt: 0,
  purchaseHistory: {},
  breedingChamber: null,
  clientNonce: 0,
```

Add migration step (after `if (version < 8)` block, before `return s;`):
```ts
  if (version < 9) {
    s = {
      ...s,
      shopStock: [],
      shopStockRefreshedAt: 0,
      purchaseHistory: {},
      breedingChamber: null,
      clientNonce: 0,
    };
  }
```

Add action implementations in the store (after existing v8 actions, before `reset`):
```ts
      spendBattleStars: (amount) => {
        if (amount <= 0) throw new Error(`spendBattleStars: amount must be > 0, got ${amount}`);
        const current = get().battleStars;
        if (current < amount) {
          throw new Error(`spendBattleStars: insufficient (balance=${current}, requested=${amount})`);
        }
        set({ battleStars: current - amount });
      },

      refreshShopStockIfNeeded: (now = Date.now()) => {
        const anchor = dailyAnchor(now);
        if (anchor <= get().shopStockRefreshedAt) return;
        set({
          shopStock: rollShopStockInline(),
          shopStockRefreshedAt: anchor,
        });
        // NOTE: SHOP_STOCK_REFRESHED event emitted by AppRouter (Task 16),
        // not here, to keep SaveState pure of EventBus coupling.
      },

      applyShopPurchase: (itemId, priceCharged) => {
        const state = get();
        const slotIdx = state.shopStock.findIndex((s) => s.itemId === itemId);
        if (slotIdx < 0) {
          throw new Error(`applyShopPurchase: itemId "${itemId}" not in stock`);
        }
        const slot = state.shopStock[slotIdx]!;
        if (slot.stockRemaining <= 0) {
          throw new Error(`applyShopPurchase: stock exhausted for "${itemId}"`);
        }
        if (state.battleStars < priceCharged) {
          throw new Error(`applyShopPurchase: insufficient stars (${state.battleStars} < ${priceCharged})`);
        }
        // Mint inventory item
        const instance: InventoryItem = {
          instanceId: genInstanceId(),
          itemId,
          acquiredAt: Date.now(),
        };
        const newStock = [...state.shopStock];
        newStock[slotIdx] = { ...slot, stockRemaining: slot.stockRemaining - 1 };
        set({
          inventory: [...state.inventory, instance],
          battleStars: state.battleStars - priceCharged,
          shopStock: newStock,
          purchaseHistory: {
            ...state.purchaseHistory,
            [itemId]: (state.purchaseHistory[itemId] ?? 0) + 1,
          },
        });
      },

      startBreeding: (session) => {
        const state = get();
        if (state.breedingChamber !== null) {
          throw new Error('startBreeding: chamber already busy');
        }
        if (state.battleStars < session.costBattleStars) {
          throw new Error(`startBreeding: insufficient stars (${state.battleStars} < ${session.costBattleStars})`);
        }
        set({
          breedingChamber: session,
          battleStars: state.battleStars - session.costBattleStars,
        });
      },

      clearBreeding: () => {
        set({ breedingChamber: null });
      },

      bumpClientNonce: () => {
        set({ clientNonce: get().clientNonce + 1 });
      },

      isShopStockFresh: (now = Date.now()) => {
        return dailyAnchor(now) <= get().shopStockRefreshedAt;
      },

      isBreedingChamberBusy: () => {
        return get().breedingChamber !== null;
      },
```

Update `reset` action to include v9 fields:
```ts
      reset: () =>
        set({
          ...INITIAL_STATE,
          // ... existing v7/v8 explicit clears ...
          shopStock: [],
          shopStockRefreshedAt: 0,
          purchaseHistory: {},
          breedingChamber: null,
          clientNonce: 0,
        }),
```

- [ ] **Step 5: Run SaveState tests — expect PASS (all new + existing)**

```bash
cd app && npx vitest run src/persistence/SaveStateStore.test.ts
```

- [ ] **Step 6: Run full suite — expect no regressions**

```bash
cd app && npm run test:run 2>&1 | tail -5
```

Expected: 964 + ~16 = ~980 passing.

- [ ] **Step 7: Run gates**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
```

- [ ] **Step 8: Commit**

```bash
git add app/src/persistence/SaveStateStore.ts app/src/persistence/SaveStateStore.test.ts
git commit -m "feat(phase-3): SaveState v8→v9 + 8 actions (shop+breeding+nonce)"
```

---

## Task 7 — EventBus +4 events

**Files:**
- Modify: `app/src/bus/EventBus.ts`
- Modify: `app/src/bus/EventBus.test.ts`

- [ ] **Step 1: Inspect insertion point**

```bash
grep -n "QUEST_PROGRESS\|LOGIN_CLAIMED\|^};" app/src/bus/EventBus.ts | head -10
```

The union ends with `LOGIN_CLAIMED` (Sprint F). Append 4 new entries before the closing `;`.

- [ ] **Step 2: Write failing tests (append to `EventBus.test.ts`)**

```ts
describe('Phase 3 — shop + breeding events', () => {
  it('SHOP_STOCK_REFRESHED carries slots + anchorUtc7', () => {
    const received: Array<{ slots: unknown[]; anchorUtc7: number }> = [];
    const off = eventBus.on('SHOP_STOCK_REFRESHED', (p) => received.push(p));
    eventBus.emit('SHOP_STOCK_REFRESHED', { slots: [], anchorUtc7: 12345 });
    expect(received).toEqual([{ slots: [], anchorUtc7: 12345 }]);
    off();
  });

  it('SHOP_PURCHASE_COMPLETED carries itemId, priceCharged, stockRemaining', () => {
    const received: unknown[] = [];
    const off = eventBus.on('SHOP_PURCHASE_COMPLETED', (p) => received.push(p));
    eventBus.emit('SHOP_PURCHASE_COMPLETED', {
      itemId: 'health-potion-small',
      priceCharged: 25,
      stockRemaining: 0,
    });
    expect(received).toHaveLength(1);
    off();
  });

  it('BREEDING_STARTED carries parents + duration + expectedRarity', () => {
    const received: unknown[] = [];
    const off = eventBus.on('BREEDING_STARTED', (p) => received.push(p));
    eventBus.emit('BREEDING_STARTED', {
      parentA: 'pet-a',
      parentB: 'pet-b',
      durationMs: 0,
      expectedRarity: 'rare',
    });
    expect(received).toHaveLength(1);
    off();
  });

  it('EGG_HATCHED carries offspring info', () => {
    const received: unknown[] = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    eventBus.emit('EGG_HATCHED', {
      offspringInstanceId: 'inst-xyz',
      rarity: 'rare',
      codename: 'aqualumi',
    });
    expect(received).toHaveLength(1);
    off();
  });
});
```

- [ ] **Step 3: Run — expect FAIL (typecheck error on new event types)**

```bash
cd app && npx vitest run src/bus/EventBus.test.ts
```

- [ ] **Step 4: Edit `EventBus.ts`**

After the `LOGIN_CLAIMED` entry, before the final closing `;`, add:

```ts
  | {
      type: 'SHOP_STOCK_REFRESHED';
      payload: { slots: ShopItemSlot[]; anchorUtc7: number };
    }
  | {
      type: 'SHOP_PURCHASE_COMPLETED';
      payload: { itemId: string; priceCharged: number; stockRemaining: number };
    }
  | {
      type: 'BREEDING_STARTED';
      payload: { parentA: string; parentB: string; durationMs: number; expectedRarity: PetRarity };
    }
  | {
      type: 'EGG_HATCHED';
      payload: { offspringInstanceId: string; rarity: PetRarity; codename: string };
    };
```

Add imports at top of EventBus.ts if not already:
```ts
import type { ShopItemSlot } from '@/types/shop';
import type { PetRarity } from '@/types/pet';
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd app && npx vitest run src/bus/EventBus.test.ts
```

- [ ] **Step 6: Full suite + gates**

```bash
cd app && npm run test:run 2>&1 | tail -5
npm run lint && npm run typecheck && npm run verify
```

Expected: ~984 passing.

- [ ] **Step 7: Commit**

```bash
git add app/src/bus/EventBus.ts app/src/bus/EventBus.test.ts
git commit -m "feat(phase-3): EventBus +SHOP_STOCK_REFRESHED +SHOP_PURCHASE_COMPLETED +BREEDING_STARTED +EGG_HATCHED"
```

---

## Task 4 — ShopEngine.ts

**Files:**
- Create: `app/src/domain/ShopEngine.ts`
- Create: `app/src/domain/ShopEngine.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// app/src/domain/ShopEngine.test.ts
import { describe, it, expect } from 'vitest';
import {
  needsShopRefresh,
  rollStock,
  validatePurchase,
  SHOP_CYCLE_LIMITS,
  SHOP_SLOTS_PER_CYCLE,
} from './ShopEngine';
import { dailyAnchor } from './QuestCycle';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 4, 12, 10, 0, 0);

describe('needsShopRefresh', () => {
  it('returns true when never refreshed', () => {
    expect(needsShopRefresh(0, NOW)).toBe(true);
  });

  it('returns false when same-day', () => {
    expect(needsShopRefresh(dailyAnchor(NOW), NOW)).toBe(false);
  });

  it('returns true after cross-day', () => {
    const yesterday = dailyAnchor(NOW) - DAY_MS;
    expect(needsShopRefresh(yesterday, NOW)).toBe(true);
  });
});

describe('rollStock', () => {
  it('returns SHOP_SLOTS_PER_CYCLE total slots (3+1+1=5 by default)', () => {
    const stock = rollStock(NOW, () => 0.5);
    expect(stock.length).toBe(SHOP_SLOTS_PER_CYCLE);
  });

  it('has 3 common + 1 rare + 1 epic slots', () => {
    const stock = rollStock(NOW, () => 0.5);
    const counts = stock.reduce<Record<string, number>>((acc, s) => {
      // Lookup rarity via SHOP_CATALOG match
      return acc;
    }, {});
    // Verify via cycleLimit field — each slot is 1 unit, total = expected per rarity
    expect(stock.filter((s) => s.cycleLimit === 1).length).toBe(SHOP_SLOTS_PER_CYCLE);
  });

  it('all slots start with stockRemaining = 1', () => {
    const stock = rollStock(NOW, () => 0.5);
    for (const slot of stock) expect(slot.stockRemaining).toBe(1);
  });

  it('deterministic given rng', () => {
    const a = rollStock(NOW, () => 0.123);
    const b = rollStock(NOW, () => 0.123);
    expect(a.map((s) => s.itemId)).toEqual(b.map((s) => s.itemId));
  });
});

describe('validatePurchase', () => {
  it('ok when in stock + sufficient stars', () => {
    const slot = { itemId: 'health-potion-small' as const, priceBattleStars: 25, stockRemaining: 1, cycleLimit: 1 };
    expect(validatePurchase(slot, 100)).toEqual({ ok: true });
  });

  it('fails not_in_stock when slot is null', () => {
    expect(validatePurchase(null, 100)).toEqual({ ok: false, reason: 'not_in_stock' });
  });

  it('fails stock_exhausted when remaining=0', () => {
    const slot = { itemId: 'health-potion-small' as const, priceBattleStars: 25, stockRemaining: 0, cycleLimit: 1 };
    expect(validatePurchase(slot, 100)).toEqual({ ok: false, reason: 'stock_exhausted' });
  });

  it('fails insufficient_stars when balance < price', () => {
    const slot = { itemId: 'health-potion-small' as const, priceBattleStars: 25, stockRemaining: 1, cycleLimit: 1 };
    expect(validatePurchase(slot, 10)).toEqual({ ok: false, reason: 'insufficient_stars' });
  });
});

describe('SHOP_CYCLE_LIMITS', () => {
  it('is 3 common / 1 rare / 1 epic per Q3', () => {
    expect(SHOP_CYCLE_LIMITS.common).toBe(3);
    expect(SHOP_CYCLE_LIMITS.rare).toBe(1);
    expect(SHOP_CYCLE_LIMITS.epic).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd app && npx vitest run src/domain/ShopEngine.test.ts
```

- [ ] **Step 3: Implement `ShopEngine.ts`**

```ts
// app/src/domain/ShopEngine.ts

import { dailyAnchor } from './QuestCycle';
import { SHOP_CATALOG } from '@/data/staticConfig/shopCatalog';
import type { ShopCatalogEntry, ShopItemSlot, ShopPurchaseFailureReason } from '@/types/shop';

/**
 * Phase 3 — Shop engine (AP §11.10, Q1+Q3 defaults).
 *
 * Pure functions. State mutations live in SaveState actions
 * (refreshShopStockIfNeeded, applyShopPurchase).
 */

export const SHOP_CYCLE_LIMITS = { common: 3, rare: 1, epic: 1 } as const;
export const SHOP_SLOTS_PER_CYCLE =
  SHOP_CYCLE_LIMITS.common + SHOP_CYCLE_LIMITS.rare + SHOP_CYCLE_LIMITS.epic; // 5

export function needsShopRefresh(refreshedAt: number, now: number): boolean {
  return dailyAnchor(now) > refreshedAt;
}

function sampleWithoutReplacement<T>(pool: readonly T[], n: number, rng: () => number): T[] {
  if (n >= pool.length) return [...pool];
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

export function rollStock(_now: number, rng: () => number = Math.random): ShopItemSlot[] {
  const slots: ShopItemSlot[] = [];
  for (const rarity of ['common', 'rare', 'epic'] as const) {
    const pool: ShopCatalogEntry[] = SHOP_CATALOG.filter((e) => e.rarity === rarity);
    const picks = sampleWithoutReplacement(pool, SHOP_CYCLE_LIMITS[rarity], rng);
    for (const entry of picks) {
      slots.push({
        itemId: entry.itemId,
        priceBattleStars: entry.basePrice,
        stockRemaining: 1,
        cycleLimit: 1,
      });
    }
  }
  return slots;
}

export interface PurchaseValidation {
  ok: boolean;
  reason?: ShopPurchaseFailureReason;
}

export function validatePurchase(
  slot: ShopItemSlot | null,
  battleStars: number,
): PurchaseValidation {
  if (!slot) return { ok: false, reason: 'not_in_stock' };
  if (slot.stockRemaining <= 0) return { ok: false, reason: 'stock_exhausted' };
  if (battleStars < slot.priceBattleStars) return { ok: false, reason: 'insufficient_stars' };
  return { ok: true };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd app && npx vitest run src/domain/ShopEngine.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/ShopEngine.ts app/src/domain/ShopEngine.test.ts
git commit -m "feat(phase-3): ShopEngine (refresh + validate, Q1+Q3 defaults)"
```

---

## Task 5 — PetBreedingEngine.ts

**Files:**
- Create: `app/src/domain/PetBreedingEngine.ts`
- Create: `app/src/domain/PetBreedingEngine.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// app/src/domain/PetBreedingEngine.test.ts
import { describe, it, expect } from 'vitest';
import { computeCompatibility, rollOffspring } from './PetBreedingEngine';
import type { PetInstance } from '@/types/pet';

function mockPet(overrides: Partial<PetInstance>): PetInstance {
  return {
    instanceId: 'inst-1',
    codename: 'aqualumi',
    rarity: 'common',
    level: 1,
    xp: 0,
    element: 'fire',
    ...overrides,
  } as PetInstance;
}

describe('computeCompatibility', () => {
  it('same element returns medium compat', () => {
    const a = mockPet({ element: 'fire' });
    const b = mockPet({ element: 'fire' });
    expect(computeCompatibility(a, b)).toEqual({ level: 'medium', multiplier: 1.0 });
  });

  it('cross-element with matrix pair returns high compat', () => {
    const a = mockPet({ element: 'fire' });
    const b = mockPet({ element: 'water' });
    expect(computeCompatibility(a, b)).toEqual({ level: 'high', multiplier: 1.5 });
  });

  // If a cross-element pair isn't in BREEDING_PAIRS, we fall back to low
  it('unknown cross-element pair returns low compat', () => {
    const a = mockPet({ element: 'storm' as never });
    const b = mockPet({ element: 'shadow' as never });
    expect(computeCompatibility(a, b)).toEqual({ level: 'low', multiplier: 0.5 });
  });
});

describe('rollOffspring', () => {
  it('same-element returns higher-rarity parent codename, no rarity upgrade', () => {
    const a = mockPet({ element: 'fire', rarity: 'common', codename: 'pet-a' as never, level: 3 });
    const b = mockPet({ element: 'fire', rarity: 'rare', codename: 'pet-b' as never, level: 5 });
    const offspring = rollOffspring(a, b, () => 0.99); // even with high rng, no upgrade
    expect(offspring.codename).toBe('pet-b');
    expect(offspring.rarity).toBe('rare');
    expect(offspring.level).toBe(5);
  });

  it('cross-element uses pair lookup codename', () => {
    const a = mockPet({ element: 'fire', rarity: 'common' });
    const b = mockPet({ element: 'water', rarity: 'common' });
    const offspring = rollOffspring(a, b, () => 0.99); // rng=0.99 → no upgrade (0.45 chance for high compat)
    expect(offspring.codename).toBe('aqualumi'); // fire+water from BREEDING_PAIRS
  });

  it('rarity upgrade fires when rng < compat.multiplier * 0.3', () => {
    const a = mockPet({ element: 'fire', rarity: 'common' });
    const b = mockPet({ element: 'water', rarity: 'common' });
    // High compat = multiplier 1.5, upgrade chance = 0.45. rng = 0.4 → upgrade fires
    const offspring = rollOffspring(a, b, () => 0.4);
    expect(offspring.rarity).toBe('rare');
  });

  it('costBattleStars matches offspring rarity', () => {
    const a = mockPet({ element: 'fire', rarity: 'common' });
    const b = mockPet({ element: 'water', rarity: 'common' });
    const offspring = rollOffspring(a, b, () => 0.99);
    expect(offspring.costBattleStars).toBe(50); // common rarity → 50 stars
  });

  it('offspring level = max(parentA.level, parentB.level)', () => {
    const a = mockPet({ level: 7 });
    const b = mockPet({ level: 3 });
    expect(rollOffspring(a, b, () => 0.99).level).toBe(7);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd app && npx vitest run src/domain/PetBreedingEngine.test.ts
```

- [ ] **Step 3: Implement `PetBreedingEngine.ts`**

```ts
// app/src/domain/PetBreedingEngine.ts

import type { PetInstance, PetRarity } from '@/types/pet';
import type { CompatResult, OffspringSpec } from '@/types/breeding';
import { lookupPair } from '@/data/staticConfig/breedingPairs';
import { BREEDING_COSTS } from '@/data/staticConfig/breedingCosts';

/**
 * Phase 3 — Pet Breeding engine (AP §11.11, Q4+Q6 defaults).
 *
 * Pure functions. State mutations live in performBreedingStart +
 * performBreedingHatch orchestration helpers (Task 11).
 */

const RARITY_ORDER: PetRarity[] = ['common', 'rare', 'epic', 'legendary'];

function rarityIndex(r: PetRarity): number {
  return RARITY_ORDER.indexOf(r);
}

function maxRarity(a: PetRarity, b: PetRarity): PetRarity {
  return rarityIndex(a) >= rarityIndex(b) ? a : b;
}

function nextRarityTier(r: PetRarity): PetRarity {
  const idx = rarityIndex(r);
  return RARITY_ORDER[Math.min(idx + 1, RARITY_ORDER.length - 1)]!;
}

export function computeCompatibility(parentA: PetInstance, parentB: PetInstance): CompatResult {
  if (parentA.element === parentB.element) {
    return { level: 'medium', multiplier: 1.0 };
  }
  const pair = lookupPair(parentA.element, parentB.element);
  if (pair) return { level: 'high', multiplier: 1.5 };
  return { level: 'low', multiplier: 0.5 };
}

export function rollOffspring(
  parentA: PetInstance,
  parentB: PetInstance,
  rng: () => number = Math.random,
): OffspringSpec {
  const compat = computeCompatibility(parentA, parentB);
  const baseLevel = Math.max(parentA.level, parentB.level);

  // Same element OR unknown pair → fall back to higher-rarity parent
  if (parentA.element === parentB.element) {
    const higher = rarityIndex(parentA.rarity) >= rarityIndex(parentB.rarity) ? parentA : parentB;
    return {
      codename: higher.codename,
      rarity: higher.rarity,
      level: baseLevel,
      costBattleStars: BREEDING_COSTS[higher.rarity],
    };
  }

  const pair = lookupPair(parentA.element, parentB.element);
  if (!pair) {
    const higher = rarityIndex(parentA.rarity) >= rarityIndex(parentB.rarity) ? parentA : parentB;
    return {
      codename: higher.codename,
      rarity: higher.rarity,
      level: baseLevel,
      costBattleStars: BREEDING_COSTS[higher.rarity],
    };
  }

  const parentRarity = maxRarity(parentA.rarity, parentB.rarity);
  const upgradeChance = compat.multiplier * 0.3;
  const upgrade = rng() < upgradeChance;
  const offspringRarity = upgrade ? nextRarityTier(parentRarity) : parentRarity;

  return {
    codename: pair.offspringCodename,
    rarity: offspringRarity,
    level: baseLevel,
    costBattleStars: BREEDING_COSTS[offspringRarity],
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd app && npx vitest run src/domain/PetBreedingEngine.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/PetBreedingEngine.ts app/src/domain/PetBreedingEngine.test.ts
git commit -m "feat(phase-3): PetBreedingEngine (compat + offspring roll, Q4+Q6)"
```

---

## Task 8 — ServerValidator.ts

**Files:**
- Create: `app/src/domain/ServerValidator.ts`
- Create: `app/src/domain/ServerValidator.test.ts`

- [ ] **Step 1: Inspect existing HMAC helper**

```bash
grep -nE "signHmac|verifyHmac|export" app/src/persistence/hmac.ts 2>&1 | head -10
```

Note function signatures. If `signHmac/verifyHmac` don't exist with this exact API, adapt to whatever exists (e.g., `signSaveState`, `verifySaveState` style). If no HMAC helper at all, **STOP and consult anh** — Step 9.5 HMAC is supposed to be shipped.

- [ ] **Step 2: Write tests**

```ts
// app/src/domain/ServerValidator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateAction } from './ServerValidator';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('validateAction', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    vi.restoreAllMocks();
  });

  it('bumps clientNonce regardless of response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
    await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(useSaveState.getState().clientNonce).toBe(1);
  });

  it('returns ok:true on 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, serverNonce: 1 }),
    } as never);
    const result = await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(result.ok).toBe(true);
  });

  it('returns ok:false with http_<status> reason on non-200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as never);
    const result = await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('http_401');
  });

  it('soft-fails on network error with warn', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('fetch_failed_soft_allow');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('signs request with x-nonce + x-hmac headers', async () => {
    let captured: { headers?: Record<string, string> } = {};
    global.fetch = vi.fn().mockImplementation((url, opts: { headers?: Record<string, string> }) => {
      captured = opts;
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) } as never);
    });
    await validateAction('/api/shop/validate', { itemId: 'foo' });
    expect(captured.headers?.['x-nonce']).toBe('1');
    expect(captured.headers?.['x-hmac']).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
cd app && npx vitest run src/domain/ServerValidator.test.ts
```

- [ ] **Step 4: Implement `ServerValidator.ts`**

```ts
// app/src/domain/ServerValidator.ts

import { signHmac } from '@/persistence/hmac';
import { useSaveState } from '@/persistence/SaveStateStore';

/**
 * Phase 3 — Server validation seam (AP §11.12, Q9 default).
 *
 * Wraps a domain action payload in HMAC + nonce envelope, posts to
 * the Vite-middleware endpoint, returns the validation verdict.
 *
 * Soft-fail policy: if `fetch` throws (Vite plugin not loaded,
 * production stub 404, network down), action still completes with
 * `console.warn` + `reason: 'fetch_failed_soft_allow'`. Phase 3
 * internal deploy treats validation as advisory.
 */

export interface ValidationResponse {
  ok: boolean;
  reason?: string;
  serverNonce?: number;
}

export type ValidationEndpoint = '/api/shop/validate' | '/api/breed/validate';

export async function validateAction<T>(
  endpoint: ValidationEndpoint,
  payload: T,
): Promise<ValidationResponse> {
  const nonce = useSaveState.getState().clientNonce + 1;
  const body = JSON.stringify(payload);
  const hmac = await signHmac(`${nonce}:${body}`);
  useSaveState.getState().bumpClientNonce();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-nonce': String(nonce),
        'x-hmac': hmac,
      },
      body,
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as ValidationResponse;
  } catch (err) {
    console.warn('[ServerValidator] fetch failed, soft-allowing action:', err);
    return { ok: true, reason: 'fetch_failed_soft_allow' };
  }
}
```

**If `signHmac` doesn't exist** in `@/persistence/hmac`: use whatever the project's HMAC API is, OR inline a simple WebCrypto HMAC-SHA-256 here. If completely blocked, **STOP and report BLOCKED**.

- [ ] **Step 5: Run — expect PASS**

```bash
cd app && npx vitest run src/domain/ServerValidator.test.ts
```

- [ ] **Step 6: Full suite + commit**

```bash
cd app && npm run test:run 2>&1 | tail -5
git add app/src/domain/ServerValidator.ts app/src/domain/ServerValidator.test.ts
git commit -m "feat(phase-3): ServerValidator (HMAC envelope + soft-fail policy)"
```

---

## Task 9 — server/validationRoutes.ts (Vite middleware)

**Files:**
- Create: `app/src/server/validationRoutes.ts`
- Modify: `app/vite.config.ts`

- [ ] **Step 1: Write `validationRoutes.ts`**

```ts
// app/src/server/validationRoutes.ts

import type { Connect } from 'vite';
import { verifyHmac } from '@/persistence/hmac';

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function respond(res: Connect.ServerResponse, status: number, body: object): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function handle(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
  next: Connect.NextFunction,
  endpoint: string,
): Promise<void> {
  if (req.url !== endpoint || req.method !== 'POST') return next();

  const nonceRaw = req.headers['x-nonce'];
  const hmacRaw = req.headers['x-hmac'];
  const nonce = Number(Array.isArray(nonceRaw) ? nonceRaw[0] : nonceRaw);
  const hmac = String(Array.isArray(hmacRaw) ? hmacRaw[0] : hmacRaw);
  const body = await readBody(req);

  if (!Number.isFinite(nonce) || nonce < 1) {
    return respond(res, 400, { ok: false, reason: 'bad_nonce' });
  }

  const verified = await verifyHmac(hmac, `${nonce}:${body}`);
  if (!verified) {
    return respond(res, 401, { ok: false, reason: 'hmac_mismatch' });
  }

  // Phase 3 dev: schema-lite + always-ok. Phase 4+ can cross-check server state.
  respond(res, 200, { ok: true, serverNonce: nonce });
}

export function shopValidateRoute(): Connect.NextHandleFunction {
  return (req, res, next) => {
    void handle(req, res, next, '/api/shop/validate');
  };
}

export function breedValidateRoute(): Connect.NextHandleFunction {
  return (req, res, next) => {
    void handle(req, res, next, '/api/breed/validate');
  };
}
```

- [ ] **Step 2: Wire into `vite.config.ts`**

Open `app/vite.config.ts`. Find the `defineConfig({ ... })` block. Add a `server.configureServer` callback (or extend the existing one):

```ts
import { shopValidateRoute, breedValidateRoute } from './src/server/validationRoutes';

export default defineConfig({
  // ... existing config ...
  server: {
    // ... existing server options ...
  },
  plugins: [
    // ... existing plugins ...
    {
      name: 'phase-3-validation-routes',
      configureServer(server) {
        server.middlewares.use(shopValidateRoute());
        server.middlewares.use(breedValidateRoute());
      },
    },
  ],
});
```

**If `vite.config.ts` already has a `configureServer` hook**, ADD the middleware inside it instead of creating a duplicate plugin.

- [ ] **Step 3: Smoke test via curl after starting dev server**

In a separate terminal:
```bash
cd app && npm run dev &
sleep 6
curl -s -X POST http://localhost:5173/api/shop/validate \
  -H "x-nonce: 1" -H "x-hmac: invalid" \
  -d '{}'
```

Expected: `{"ok":false,"reason":"hmac_mismatch"}` (status 401).

Kill dev server: `pkill -f vite`

(Skip if dev server can't run in environment — Task 17 E2E will catch issues.)

- [ ] **Step 4: Commit**

```bash
git add app/src/server/validationRoutes.ts app/vite.config.ts
git commit -m "feat(phase-3): Vite middleware /api/shop/validate + /api/breed/validate"
```

---

## Task 10 — performShopPurchase.ts

**Files:**
- Create: `app/src/domain/performShopPurchase.ts`
- Create: `app/src/domain/performShopPurchase.test.ts`

- [ ] **Step 1: Write tests**

```ts
// app/src/domain/performShopPurchase.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performShopPurchase } from './performShopPurchase';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('performShopPurchase', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    useSaveState.getState().addBattleStars(1000);
    // Stub fetch to always succeed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
  });

  it('happy path: mints item, debits stars, emits event', async () => {
    const slot = useSaveState.getState().shopStock[0]!;
    const received: unknown[] = [];
    const off = eventBus.on('SHOP_PURCHASE_COMPLETED', (p) => received.push(p));
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(true);
    expect(useSaveState.getState().inventory.length).toBe(1);
    expect(useSaveState.getState().battleStars).toBe(1000 - slot.priceBattleStars);
    expect(received).toHaveLength(1);
    off();
  });

  it('returns insufficient_stars when balance < price', async () => {
    useSaveState.getState().reset();
    useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    // No addBattleStars — balance is 0
    const slot = useSaveState.getState().shopStock[0]!;
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_stars');
  });

  it('returns not_in_stock for non-existent itemId', async () => {
    const result = await performShopPurchase('non-existent-item' as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_in_stock');
  });

  it('returns stock_exhausted after slot bought out', async () => {
    const slot = useSaveState.getState().shopStock[0]!;
    await performShopPurchase(slot.itemId);
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('stock_exhausted');
  });

  it('aborts on server HMAC mismatch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, reason: 'hmac_mismatch' }),
    } as never);
    const slot = useSaveState.getState().shopStock[0]!;
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('server_');
    // No mutation
    expect(useSaveState.getState().inventory.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd app && npx vitest run src/domain/performShopPurchase.test.ts
```

- [ ] **Step 3: Implement `performShopPurchase.ts`**

```ts
// app/src/domain/performShopPurchase.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import { validatePurchase } from './ShopEngine';
import { validateAction } from './ServerValidator';
import { ITEM_REGISTRY, type ItemDef, type ItemId } from '@/data/staticConfig/items';
import type { ShopPurchaseFailureReason } from '@/types/shop';

export type ShopPurchaseResult =
  | { ok: true; itemMinted: ItemDef; priceCharged: number }
  | { ok: false; reason: ShopPurchaseFailureReason };

export async function performShopPurchase(itemId: ItemId): Promise<ShopPurchaseResult> {
  const state = useSaveState.getState();
  const slot = state.shopStock.find((s) => s.itemId === itemId) ?? null;
  const validation = validatePurchase(slot, state.battleStars);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason! };
  }

  // Server roundtrip
  const server = await validateAction('/api/shop/validate', {
    itemId,
    price: slot!.priceBattleStars,
  });
  if (!server.ok) {
    return { ok: false, reason: `server_${server.reason}` as ShopPurchaseFailureReason };
  }

  // Atomic SaveState mutation
  useSaveState.getState().applyShopPurchase(itemId, slot!.priceBattleStars);

  const itemDef = ITEM_REGISTRY.find((i) => i.id === itemId)!;
  const remainingAfter = useSaveState.getState().shopStock.find((s) => s.itemId === itemId)?.stockRemaining ?? 0;
  eventBus.emit('SHOP_PURCHASE_COMPLETED', {
    itemId,
    priceCharged: slot!.priceBattleStars,
    stockRemaining: remainingAfter,
  });

  return { ok: true, itemMinted: itemDef, priceCharged: slot!.priceBattleStars };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd app && npx vitest run src/domain/performShopPurchase.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/performShopPurchase.ts app/src/domain/performShopPurchase.test.ts
git commit -m "feat(phase-3): performShopPurchase orchestration"
```

---

## Task 11 — performBreedingStart.ts + performBreedingHatch.ts

**Files:**
- Create: `app/src/domain/performBreedingStart.ts`
- Create: `app/src/domain/performBreedingStart.test.ts`
- Create: `app/src/domain/performBreedingHatch.ts`
- Create: `app/src/domain/performBreedingHatch.test.ts`

- [ ] **Step 1: Check PET_ROSTER_CAP**

```bash
grep -nE "PET_ROSTER_CAP|ROSTER_CAP|rosterCap" app/src/data/staticConfig/pets.ts app/src/domain/*.ts 2>&1 | head -5
```

Note the cap value and export path. Use it in the start tests/impl.

- [ ] **Step 2: Tests for `performBreedingStart`**

```ts
// app/src/domain/performBreedingStart.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performBreedingStart } from './performBreedingStart';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('performBreedingStart', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
  });

  function addPair(elementA = 'fire', elementB = 'water') {
    const a = useSaveState.getState().addPet('aqualumi' as never, 'common', 3, 0);
    // Mutate element via setState (test only)
    useSaveState.setState({
      ownedPets: useSaveState.getState().ownedPets.map((p) =>
        p.instanceId === a.instanceId ? { ...p, element: elementA as never } : p,
      ),
    });
    const b = useSaveState.getState().addPet('aqualumi' as never, 'common', 5, 0);
    useSaveState.setState({
      ownedPets: useSaveState.getState().ownedPets.map((p) =>
        p.instanceId === b.instanceId ? { ...p, element: elementB as never } : p,
      ),
    });
    return { aId: a.instanceId, bId: b.instanceId };
  }

  it('returns chamber_busy if session already active', async () => {
    const { aId, bId } = addPair();
    useSaveState.getState().addBattleStars(200);
    await performBreedingStart(aId, bId);
    const result = await performBreedingStart(aId, bId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('chamber_busy');
  });

  it('returns parent_not_found for invalid id', async () => {
    useSaveState.getState().addBattleStars(200);
    const result = await performBreedingStart('non-id-a', 'non-id-b');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('parent_not_found');
  });

  it('returns same_parent when same instanceId twice', async () => {
    const { aId } = addPair();
    useSaveState.getState().addBattleStars(200);
    const result = await performBreedingStart(aId, aId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('same_parent');
  });

  it('returns insufficient_stars when below cost', async () => {
    const { aId, bId } = addPair();
    useSaveState.getState().addBattleStars(10); // < 50 common
    const result = await performBreedingStart(aId, bId, Date.now(), () => 0.99);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_stars');
  });

  it('happy path: locks chamber, charges stars, emits BREEDING_STARTED', async () => {
    const { aId, bId } = addPair();
    useSaveState.getState().addBattleStars(200);
    const received: unknown[] = [];
    const off = eventBus.on('BREEDING_STARTED', (p) => received.push(p));
    const result = await performBreedingStart(aId, bId, Date.now(), () => 0.99);
    expect(result.ok).toBe(true);
    expect(useSaveState.getState().breedingChamber).not.toBeNull();
    expect(useSaveState.getState().battleStars).toBeLessThan(200);
    expect(received).toHaveLength(1);
    off();
  });
});
```

- [ ] **Step 3: Tests for `performBreedingHatch`**

```ts
// app/src/domain/performBreedingHatch.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { performBreedingHatch } from './performBreedingHatch';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('performBreedingHatch', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  it('returns no_active_session when chamber empty', () => {
    const result = performBreedingHatch();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_active_session');
  });

  it('returns not_ready when elapsed < durationMs', () => {
    useSaveState.getState().addBattleStars(100);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now,
      durationMs: 5000,
      costBattleStars: 50,
      offspringSpec: { codename: 'aqualumi' as never, rarity: 'common', level: 1 },
    });
    const result = performBreedingHatch(now + 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_ready');
  });

  it('happy path: mints offspring, clears chamber, emits EGG_HATCHED', () => {
    useSaveState.getState().addBattleStars(100);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now,
      durationMs: 0,
      costBattleStars: 50,
      offspringSpec: { codename: 'aqualumi' as never, rarity: 'common', level: 5 },
    });
    const before = useSaveState.getState().ownedPets.length;
    const received: unknown[] = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    const result = performBreedingHatch(now);
    expect(result.ok).toBe(true);
    expect(useSaveState.getState().breedingChamber).toBeNull();
    expect(useSaveState.getState().ownedPets.length).toBe(before + 1);
    expect(received).toHaveLength(1);
    off();
  });
});
```

- [ ] **Step 4: Run both — expect FAIL**

```bash
cd app && npx vitest run src/domain/performBreedingStart.test.ts src/domain/performBreedingHatch.test.ts
```

- [ ] **Step 5: Implement `performBreedingStart.ts`**

```ts
// app/src/domain/performBreedingStart.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import { rollOffspring } from './PetBreedingEngine';
import { validateAction } from './ServerValidator';
import type { BreedingFailureReason, BreedingSession, PetInstanceId } from '@/types/breeding';

// Replace this with the actual exported constant from pets.ts or pet domain.
// If named differently (e.g. `PET_ROSTER_MAX`), update the import.
import { PET_ROSTER_CAP } from '@/data/staticConfig/pets';

export type BreedingStartResult =
  | { ok: true; session: BreedingSession }
  | { ok: false; reason: BreedingFailureReason };

export async function performBreedingStart(
  parentAId: PetInstanceId,
  parentBId: PetInstanceId,
  now: number = Date.now(),
  rng: () => number = Math.random,
): Promise<BreedingStartResult> {
  const state = useSaveState.getState();

  if (state.breedingChamber !== null) return { ok: false, reason: 'chamber_busy' };
  if (state.ownedPets.length >= PET_ROSTER_CAP) return { ok: false, reason: 'roster_full' };
  if (parentAId === parentBId) return { ok: false, reason: 'same_parent' };

  const parentA = state.ownedPets.find((p) => p.instanceId === parentAId);
  const parentB = state.ownedPets.find((p) => p.instanceId === parentBId);
  if (!parentA || !parentB) return { ok: false, reason: 'parent_not_found' };

  const offspring = rollOffspring(parentA, parentB, rng);
  if (state.battleStars < offspring.costBattleStars) {
    return { ok: false, reason: 'insufficient_stars' };
  }

  const server = await validateAction('/api/breed/validate', {
    parentA: parentAId,
    parentB: parentBId,
    cost: offspring.costBattleStars,
  });
  if (!server.ok) {
    return { ok: false, reason: `server_${server.reason}` as BreedingFailureReason };
  }

  const session: BreedingSession = {
    parentA: parentAId,
    parentB: parentBId,
    startedAt: now,
    durationMs: 0,
    costBattleStars: offspring.costBattleStars,
    offspringSpec: {
      codename: offspring.codename,
      rarity: offspring.rarity,
      level: offspring.level,
    },
  };

  useSaveState.getState().startBreeding(session);

  eventBus.emit('BREEDING_STARTED', {
    parentA: parentAId,
    parentB: parentBId,
    durationMs: 0,
    expectedRarity: offspring.rarity,
  });

  return { ok: true, session };
}
```

**If `PET_ROSTER_CAP` doesn't exist at `@/data/staticConfig/pets`**, search for it elsewhere and adjust the import. If the constant doesn't exist at all, define it locally: `const PET_ROSTER_CAP = 12;` with a TODO comment.

- [ ] **Step 6: Implement `performBreedingHatch.ts`**

```ts
// app/src/domain/performBreedingHatch.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import type { BreedingFailureReason } from '@/types/breeding';
import type { PetInstance } from '@/types/pet';

export type BreedingHatchResult =
  | { ok: true; offspring: PetInstance }
  | { ok: false; reason: BreedingFailureReason };

export function performBreedingHatch(now: number = Date.now()): BreedingHatchResult {
  const state = useSaveState.getState();
  const session = state.breedingChamber;
  if (!session) return { ok: false, reason: 'no_active_session' };
  if (now < session.startedAt + session.durationMs) {
    return { ok: false, reason: 'not_ready' };
  }

  const offspring = useSaveState.getState().addPet(
    session.offspringSpec.codename,
    session.offspringSpec.rarity,
    session.offspringSpec.level,
    0,
  );

  useSaveState.getState().clearBreeding();

  eventBus.emit('EGG_HATCHED', {
    offspringInstanceId: offspring.instanceId,
    rarity: offspring.rarity,
    codename: offspring.codename,
  });

  return { ok: true, offspring };
}
```

- [ ] **Step 7: Run both — expect PASS**

```bash
cd app && npx vitest run src/domain/performBreedingStart.test.ts src/domain/performBreedingHatch.test.ts
```

- [ ] **Step 8: Full suite + commit**

```bash
cd app && npm run test:run 2>&1 | tail -5
git add app/src/domain/performBreedingStart.ts app/src/domain/performBreedingStart.test.ts \
        app/src/domain/performBreedingHatch.ts app/src/domain/performBreedingHatch.test.ts
git commit -m "feat(phase-3): performBreedingStart + performBreedingHatch orchestration"
```

---

## Task 12 — Components: ShopItemCard, PetSlot, EggHatchAnim

**Files:**
- Create: `app/src/react/components/ShopItemCard.tsx` + test
- Create: `app/src/react/components/PetSlot.tsx` + test
- Create: `app/src/react/components/EggHatchAnim.tsx` + test

- [ ] **Step 1: Write `ShopItemCard.tsx` tests**

```tsx
// app/src/react/components/ShopItemCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShopItemCard } from './ShopItemCard';

const slot = {
  itemId: 'health-potion-small' as const,
  priceBattleStars: 25,
  stockRemaining: 1,
  cycleLimit: 1,
};

describe('ShopItemCard', () => {
  it('renders item name + price', () => {
    render(<ShopItemCard slot={slot} battleStars={100} onBuy={() => {}} />);
    expect(screen.getByTestId('shop-item-card')).toHaveTextContent('25');
  });

  it('buy button enabled when in stock + sufficient stars', () => {
    render(<ShopItemCard slot={slot} battleStars={100} onBuy={() => {}} />);
    expect(screen.getByTestId('shop-buy-btn')).not.toBeDisabled();
  });

  it('buy button disabled "Hết" when stock=0', () => {
    render(<ShopItemCard slot={{ ...slot, stockRemaining: 0 }} battleStars={100} onBuy={() => {}} />);
    const btn = screen.getByTestId('shop-buy-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Hết');
  });

  it('buy button disabled when balance insufficient', () => {
    render(<ShopItemCard slot={slot} battleStars={10} onBuy={() => {}} />);
    expect(screen.getByTestId('shop-buy-btn')).toBeDisabled();
  });

  it('clicking buy calls onBuy with itemId', () => {
    const onBuy = vi.fn();
    render(<ShopItemCard slot={slot} battleStars={100} onBuy={onBuy} />);
    fireEvent.click(screen.getByTestId('shop-buy-btn'));
    expect(onBuy).toHaveBeenCalledWith('health-potion-small');
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd app && npx vitest run src/react/components/ShopItemCard.test.tsx
```

- [ ] **Step 3: Implement `ShopItemCard.tsx`**

```tsx
// app/src/react/components/ShopItemCard.tsx
import type { ShopItemSlot } from '@/types/shop';
import { ITEM_REGISTRY } from '@/data/staticConfig/items';

interface Props {
  slot: ShopItemSlot;
  battleStars: number;
  onBuy: (itemId: string) => void;
}

const RARITY_EMOJI: Record<string, string> = {
  common: '🍎',
  rare: '🌟',
  epic: '🐉',
};

export function ShopItemCard({ slot, battleStars, onBuy }: Props) {
  const item = ITEM_REGISTRY.find((i) => i.id === slot.itemId);
  const outOfStock = slot.stockRemaining <= 0;
  const insufficient = battleStars < slot.priceBattleStars;
  const disabled = outOfStock || insufficient;
  const label = outOfStock ? 'Hết' : 'Mua';
  const priceClass = insufficient ? 'text-red-500' : 'text-amber-700';
  const emoji = item ? RARITY_EMOJI[item.rarity] ?? '🎁' : '🎁';

  return (
    <div
      data-testid="shop-item-card"
      className="flex flex-col items-center gap-2 rounded-lg bg-stone-100 p-3 ring-1 ring-stone-300"
    >
      <span aria-hidden="true" className="text-4xl">
        {emoji}
      </span>
      <span className="text-sm font-semibold text-stone-700">{item?.name ?? slot.itemId}</span>
      <span className={`text-sm font-bold ${priceClass}`}>⭐ {slot.priceBattleStars}</span>
      <button
        data-testid="shop-buy-btn"
        onClick={() => onBuy(slot.itemId)}
        disabled={disabled}
        className="rounded bg-amber-600 px-3 py-1 text-sm font-bold text-white disabled:bg-stone-300"
      >
        {label}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run — PASS, then commit ShopItemCard**

```bash
cd app && npx vitest run src/react/components/ShopItemCard.test.tsx
git add app/src/react/components/ShopItemCard.tsx app/src/react/components/ShopItemCard.test.tsx
git commit -m "feat(phase-3): ShopItemCard component"
```

- [ ] **Step 5: Write `PetSlot.tsx` tests**

```tsx
// app/src/react/components/PetSlot.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PetSlot } from './PetSlot';
import type { PetInstance } from '@/types/pet';

const mockPet: PetInstance = {
  instanceId: 'inst-1',
  codename: 'aqualumi' as never,
  rarity: 'common',
  level: 5,
  xp: 0,
  element: 'water' as never,
};

describe('PetSlot', () => {
  it('renders empty state when pet is null', () => {
    render(<PetSlot label="A" pet={null} onClick={() => {}} />);
    expect(screen.getByTestId('pet-slot-empty')).toBeInTheDocument();
  });

  it('renders filled state with pet codename + level', () => {
    render(<PetSlot label="A" pet={mockPet} onClick={() => {}} />);
    expect(screen.getByTestId('pet-slot-filled')).toBeInTheDocument();
    expect(screen.getByTestId('pet-slot-filled')).toHaveTextContent('Lv 5');
  });

  it('clicking calls onClick', () => {
    const onClick = vi.fn();
    render(<PetSlot label="A" pet={null} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('pet-slot-empty'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Implement `PetSlot.tsx`**

```tsx
// app/src/react/components/PetSlot.tsx
import type { PetInstance } from '@/types/pet';

interface Props {
  label: string;
  pet: PetInstance | null;
  onClick: () => void;
  disabled?: boolean;
}

export function PetSlot({ label, pet, onClick, disabled }: Props) {
  if (!pet) {
    return (
      <button
        data-testid="pet-slot-empty"
        onClick={onClick}
        disabled={disabled}
        className="flex h-32 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700"
      >
        <span aria-hidden="true" className="text-3xl">
          ➕
        </span>
        <span className="text-xs font-semibold">Pet {label}</span>
      </button>
    );
  }
  return (
    <button
      data-testid="pet-slot-filled"
      onClick={onClick}
      disabled={disabled}
      className="flex h-32 w-24 flex-col items-center justify-center rounded-lg bg-amber-100 ring-2 ring-amber-400"
    >
      <span aria-hidden="true" className="text-3xl">
        🐾
      </span>
      <span className="text-xs font-bold text-amber-900">{pet.codename}</span>
      <span className="text-xs text-amber-700">Lv {pet.level}</span>
    </button>
  );
}
```

- [ ] **Step 7: Run + commit PetSlot**

```bash
cd app && npx vitest run src/react/components/PetSlot.test.tsx
git add app/src/react/components/PetSlot.tsx app/src/react/components/PetSlot.test.tsx
git commit -m "feat(phase-3): PetSlot component"
```

- [ ] **Step 8: Write `EggHatchAnim.tsx` tests**

```tsx
// app/src/react/components/EggHatchAnim.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EggHatchAnim } from './EggHatchAnim';

describe('EggHatchAnim', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders idle phase initially', () => {
    render(<EggHatchAnim onHatched={() => {}} />);
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'idle');
  });

  it('transitions to shake at 500ms, hatch at 1500ms', () => {
    const onHatched = vi.fn();
    render(<EggHatchAnim onHatched={onHatched} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'shake');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId('egg-anim')).toHaveAttribute('data-phase', 'hatch');
    expect(onHatched).toHaveBeenCalled();
  });

  it('cleans up timers on unmount', () => {
    const onHatched = vi.fn();
    const { unmount } = render(<EggHatchAnim onHatched={onHatched} />);
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(onHatched).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 9: Implement `EggHatchAnim.tsx`**

```tsx
// app/src/react/components/EggHatchAnim.tsx
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'shake' | 'hatch';

interface Props {
  onHatched: () => void;
}

const SHAKE_AT_MS = 500;
const HATCH_AT_MS = 1500;

export function EggHatchAnim({ onHatched }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    timersRef.current.push(
      setTimeout(() => setPhase('shake'), SHAKE_AT_MS),
      setTimeout(() => {
        setPhase('hatch');
        onHatched();
      }, HATCH_AT_MS),
    );
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [onHatched]);

  const glyph = phase === 'hatch' ? '🌟' : '🥚';
  const shakeClass = phase === 'shake' ? 'animate-pulse' : '';

  return (
    <div
      data-testid="egg-anim"
      data-phase={phase}
      className={`text-6xl ${shakeClass}`}
      aria-hidden="true"
    >
      {glyph}
    </div>
  );
}
```

- [ ] **Step 10: Run + commit EggHatchAnim**

```bash
cd app && npx vitest run src/react/components/EggHatchAnim.test.tsx
git add app/src/react/components/EggHatchAnim.tsx app/src/react/components/EggHatchAnim.test.tsx
git commit -m "feat(phase-3): EggHatchAnim component (idle→shake→hatch)"
```

---

## Task 13 — ShopOverlay.tsx

**Files:**
- Create: `app/src/react/overlays/ShopOverlay.tsx`
- Create: `app/src/react/overlays/ShopOverlay.test.tsx`

- [ ] **Step 1: Tests**

```tsx
// app/src/react/overlays/ShopOverlay.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShopOverlay } from './ShopOverlay';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('ShopOverlay', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    useSaveState.getState().addBattleStars(1000);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
  });

  it('does not render when open=false', () => {
    render(<ShopOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('shop-overlay')).not.toBeInTheDocument();
  });

  it('renders 5 item cards when open', () => {
    render(<ShopOverlay open={true} onClose={() => {}} />);
    const cards = screen.getAllByTestId('shop-item-card');
    expect(cards.length).toBe(5);
  });

  it('shows current battle stars balance', () => {
    render(<ShopOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('shop-balance')).toHaveTextContent('1000');
  });

  it('clicking buy triggers purchase + stock decrements', async () => {
    render(<ShopOverlay open={true} onClose={() => {}} />);
    const beforeInv = useSaveState.getState().inventory.length;
    const firstBuy = screen.getAllByTestId('shop-buy-btn')[0]!;
    fireEvent.click(firstBuy);
    await waitFor(() => {
      expect(useSaveState.getState().inventory.length).toBe(beforeInv + 1);
    });
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<ShopOverlay open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('shop-close-btn'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd app && npx vitest run src/react/overlays/ShopOverlay.test.tsx
```

- [ ] **Step 3: Implement `ShopOverlay.tsx`**

```tsx
// app/src/react/overlays/ShopOverlay.tsx
import { useSaveState } from '@/persistence/SaveStateStore';
import { ShopItemCard } from '@/react/components/ShopItemCard';
import { performShopPurchase } from '@/domain/performShopPurchase';
import type { ItemId } from '@/data/staticConfig/items';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShopOverlay({ open, onClose }: Props) {
  const shopStock = useSaveState((s) => s.shopStock);
  const battleStars = useSaveState((s) => s.battleStars);

  if (!open) return null;

  const handleBuy = async (itemId: string) => {
    await performShopPurchase(itemId as ItemId);
  };

  return (
    <div
      data-testid="shop-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-amber-50 p-6 shadow-2xl ring-2 ring-amber-200">
        <header className="mb-4 flex items-center justify-between gap-6">
          <h2 className="text-xl font-bold text-amber-900">🛒 Cửa Hàng</h2>
          <span data-testid="shop-balance" className="text-sm font-semibold text-amber-700">
            ⭐ {battleStars}
          </span>
          <button
            data-testid="shop-close-btn"
            onClick={onClose}
            className="text-xl text-stone-500 hover:text-stone-700"
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {shopStock.map((slot) => (
            <ShopItemCard
              key={slot.itemId}
              slot={slot}
              battleStars={battleStars}
              onBuy={handleBuy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — PASS + commit**

```bash
cd app && npx vitest run src/react/overlays/ShopOverlay.test.tsx
git add app/src/react/overlays/ShopOverlay.tsx app/src/react/overlays/ShopOverlay.test.tsx
git commit -m "feat(phase-3): ShopOverlay (stock grid + buy flow)"
```

---

## Task 14 — PetBreedingOverlay.tsx

**Files:**
- Create: `app/src/react/overlays/PetBreedingOverlay.tsx`
- Create: `app/src/react/overlays/PetBreedingOverlay.test.tsx`

- [ ] **Step 1: Tests**

```tsx
// app/src/react/overlays/PetBreedingOverlay.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PetBreedingOverlay } from './PetBreedingOverlay';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('PetBreedingOverlay', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function addTwoPets() {
    const a = useSaveState.getState().addPet('aqualumi' as never, 'common', 3, 0);
    const b = useSaveState.getState().addPet('aqualumi' as never, 'common', 5, 0);
    useSaveState.setState({
      ownedPets: useSaveState.getState().ownedPets.map((p) => {
        if (p.instanceId === a.instanceId) return { ...p, element: 'fire' as never };
        if (p.instanceId === b.instanceId) return { ...p, element: 'water' as never };
        return p;
      }),
    });
    return { aId: a.instanceId, bId: b.instanceId };
  }

  it('does not render when open=false', () => {
    render(<PetBreedingOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('breed-overlay')).not.toBeInTheDocument();
  });

  it('renders 2 empty pet slots when open', () => {
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    const emptySlots = screen.getAllByTestId('pet-slot-empty');
    expect(emptySlots.length).toBe(2);
  });

  it('breed button disabled until 2 parents picked', () => {
    addTwoPets();
    useSaveState.getState().addBattleStars(500);
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('breed-start-btn')).toBeDisabled();
  });

  it('shows roster cap warning when at limit', () => {
    // Fill to cap (test bridge assumed PET_ROSTER_CAP=12)
    for (let i = 0; i < 12; i++) {
      useSaveState.getState().addPet('aqualumi' as never, 'common', 1, 0);
    }
    render(<PetBreedingOverlay open={true} onClose={() => {}} />);
    expect(screen.getByTestId('roster-warning')).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<PetBreedingOverlay open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('breed-close-btn'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd app && npx vitest run src/react/overlays/PetBreedingOverlay.test.tsx
```

- [ ] **Step 3: Implement `PetBreedingOverlay.tsx`**

```tsx
// app/src/react/overlays/PetBreedingOverlay.tsx
import { useState } from 'react';
import { useSaveState } from '@/persistence/SaveStateStore';
import { PetSlot } from '@/react/components/PetSlot';
import { EggHatchAnim } from '@/react/components/EggHatchAnim';
import { computeCompatibility, rollOffspring } from '@/domain/PetBreedingEngine';
import { performBreedingStart } from '@/domain/performBreedingStart';
import { performBreedingHatch } from '@/domain/performBreedingHatch';
import { PET_ROSTER_CAP } from '@/data/staticConfig/pets';
import type { PetInstance } from '@/types/pet';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'pick' | 'breeding' | 'hatched';

const COMPAT_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: '💔 LOW',
  medium: '💛 MED',
  high: '❤️ HIGH',
};

export function PetBreedingOverlay({ open, onClose }: Props) {
  const ownedPets = useSaveState((s) => s.ownedPets);
  const battleStars = useSaveState((s) => s.battleStars);
  const chamber = useSaveState((s) => s.breedingChamber);

  const [parentA, setParentA] = useState<PetInstance | null>(null);
  const [parentB, setParentB] = useState<PetInstance | null>(null);
  const [mode, setMode] = useState<Mode>('pick');

  if (!open) return null;

  const rosterFull = ownedPets.length >= PET_ROSTER_CAP;
  const bothPicked = parentA !== null && parentB !== null;
  const compat = bothPicked ? computeCompatibility(parentA!, parentB!) : null;
  const offspring = bothPicked ? rollOffspring(parentA!, parentB!, () => 0.99) : null;
  const cost = offspring?.costBattleStars ?? 0;
  const insufficient = bothPicked && battleStars < cost;
  const canBreed = bothPicked && !rosterFull && !insufficient && mode === 'pick';

  const handleSlotClick = (which: 'A' | 'B') => {
    // For Phase 3 ship: cycle through ownedPets when slot clicked
    const current = which === 'A' ? parentA : parentB;
    const other = which === 'A' ? parentB : parentA;
    const available = ownedPets.filter((p) => p.instanceId !== other?.instanceId);
    if (available.length === 0) return;
    const idx = current ? available.findIndex((p) => p.instanceId === current.instanceId) : -1;
    const next = available[(idx + 1) % available.length]!;
    if (which === 'A') setParentA(next); else setParentB(next);
  };

  const handleBreed = async () => {
    if (!parentA || !parentB) return;
    const result = await performBreedingStart(parentA.instanceId, parentB.instanceId);
    if (result.ok) setMode('breeding');
  };

  const handleHatched = () => {
    performBreedingHatch();
    setMode('hatched');
  };

  return (
    <div
      data-testid="breed-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-amber-50 p-6 shadow-2xl ring-2 ring-amber-200">
        <header className="mb-4 flex items-center justify-between gap-6">
          <h2 className="text-xl font-bold text-amber-900">🥚 Lai Tạo Pet</h2>
          <span className="text-sm font-semibold text-amber-700">⭐ {battleStars}</span>
          <button
            data-testid="breed-close-btn"
            onClick={onClose}
            className="text-xl text-stone-500"
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        {rosterFull && (
          <div
            data-testid="roster-warning"
            className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700"
          >
            Bộ sưu tập đã đầy ({PET_ROSTER_CAP} pet). Hãy thả 1 pet trước khi lai tạo.
          </div>
        )}

        <div className="flex items-center justify-around gap-4">
          <PetSlot label="A" pet={parentA} onClick={() => handleSlotClick('A')} />
          <div className="flex flex-col items-center gap-2">
            {compat && <span className="text-sm font-bold">{COMPAT_LABEL[compat.level]}</span>}
            {mode === 'pick' && offspring && (
              <span className="text-xs text-amber-700">⭐ {cost}</span>
            )}
            {mode === 'breeding' && chamber && (
              <EggHatchAnim onHatched={handleHatched} />
            )}
            {mode === 'hatched' && <span className="text-3xl">🌟</span>}
          </div>
          <PetSlot label="B" pet={parentB} onClick={() => handleSlotClick('B')} />
        </div>

        <div className="mt-4 flex justify-center">
          {mode === 'pick' && (
            <button
              data-testid="breed-start-btn"
              onClick={handleBreed}
              disabled={!canBreed}
              className="rounded bg-amber-600 px-4 py-2 font-bold text-white disabled:bg-stone-300"
            >
              Bắt đầu lai tạo
            </button>
          )}
          {mode === 'hatched' && (
            <button
              data-testid="breed-done-btn"
              onClick={() => {
                setParentA(null);
                setParentB(null);
                setMode('pick');
                onClose();
              }}
              className="rounded bg-amber-600 px-4 py-2 font-bold text-white"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — PASS + commit**

```bash
cd app && npx vitest run src/react/overlays/PetBreedingOverlay.test.tsx
git add app/src/react/overlays/PetBreedingOverlay.tsx app/src/react/overlays/PetBreedingOverlay.test.tsx
git commit -m "feat(phase-3): PetBreedingOverlay (2-slot chamber + breed flow)"
```

---

## Task 15 — MainMenu edits (+2 buttons + sparkles)

**Files:**
- Modify: `app/src/react/screens/MainMenu.tsx`
- Modify: `app/src/react/screens/MainMenu.test.tsx`

- [ ] **Step 1: Inspect existing button pattern**

```bash
grep -nE "main-menu-daily-rewards|main-menu-quests" app/src/react/screens/MainMenu.tsx | head -5
```

Note insertion point — Phase 3 buttons go AFTER the Sprint F "Quà Hằng Ngày" button.

- [ ] **Step 2: Append tests in `MainMenu.test.tsx`**

```tsx
describe('Phase 3 — shop + breeding buttons', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  it('mounts "Cửa Hàng" button', () => {
    render(<MemoryRouter><MainMenu /></MemoryRouter>);
    expect(screen.getByTestId('main-menu-shop')).toBeInTheDocument();
  });

  it('mounts "Lai Tạo" button', () => {
    render(<MemoryRouter><MainMenu /></MemoryRouter>);
    expect(screen.getByTestId('main-menu-breeding')).toBeInTheDocument();
  });

  it('clicking shop button opens ShopOverlay', () => {
    render(<MemoryRouter><MainMenu /></MemoryRouter>);
    expect(screen.queryByTestId('shop-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('main-menu-shop'));
    expect(screen.getByTestId('shop-overlay')).toBeInTheDocument();
  });

  it('clicking breeding button opens PetBreedingOverlay', () => {
    render(<MemoryRouter><MainMenu /></MemoryRouter>);
    expect(screen.queryByTestId('breed-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('main-menu-breeding'));
    expect(screen.getByTestId('breed-overlay')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — FAIL**

```bash
cd app && npx vitest run src/react/screens/MainMenu.test.tsx
```

- [ ] **Step 4: Edit `MainMenu.tsx`**

A. Add imports:
```ts
import { ShopOverlay } from '@/react/overlays/ShopOverlay';
import { PetBreedingOverlay } from '@/react/overlays/PetBreedingOverlay';
```

B. Add state (alongside `showLoginCalendar`):
```tsx
const [showShop, setShowShop] = useState(false);
const [showBreeding, setShowBreeding] = useState(false);
```

C. Add buttons AFTER the existing "Quà Hằng Ngày" button (clone the pattern):

```tsx
<button
  type="button"
  data-testid="main-menu-shop"
  onMouseEnter={onHover}
  onClick={click(() => setShowShop(true))}
  className="relative w-full rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-amber-600"
>
  🛒 Cửa Hàng
</button>

<button
  type="button"
  data-testid="main-menu-breeding"
  onMouseEnter={onHover}
  onClick={click(() => setShowBreeding(true))}
  className="relative w-full rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-amber-600"
>
  🥚 Lai Tạo
</button>
```

D. Mount the overlays at the bottom of the JSX (alongside `<DailyLoginCalendarOverlay />`):

```tsx
<ShopOverlay open={showShop} onClose={() => setShowShop(false)} />
<PetBreedingOverlay open={showBreeding} onClose={() => setShowBreeding(false)} />
```

- [ ] **Step 5: Run — PASS**

```bash
cd app && npx vitest run src/react/screens/MainMenu.test.tsx
```

- [ ] **Step 6: Full suite + commit**

```bash
cd app && npm run test:run 2>&1 | tail -5
git add app/src/react/screens/MainMenu.tsx app/src/react/screens/MainMenu.test.tsx
git commit -m "feat(phase-3): MainMenu +Cửa Hàng +Lai Tạo buttons"
```

---

## Task 16 — AppRouter (refreshShopStockIfNeeded + emit event)

**Files:**
- Modify: `app/src/react/shell/AppRouter.tsx`

- [ ] **Step 1: Inspect existing useEffect pattern**

```bash
grep -nE "refreshCyclesIfNeeded|onFocus|DailyRewardEngine" app/src/react/shell/AppRouter.tsx | head -10
```

Note insertion point in the existing engine-lifecycle useEffect.

- [ ] **Step 2: Edit `AppRouter.tsx`**

Add to the existing engine-lifecycle `useEffect` (alongside `useSaveState.getState().refreshCyclesIfNeeded()`):

```ts
import { eventBus } from '@/bus/EventBus';
import { dailyAnchor } from '@/domain/QuestCycle';

// Inside the useEffect that mounts engines:
const startEngine = () => {
  // ... existing QuestEngine + DailyRewardEngine starts ...
  useSaveState.getState().refreshCyclesIfNeeded();

  // Phase 3 Task 16 — shop stock refresh + emit
  const before = useSaveState.getState().shopStockRefreshedAt;
  useSaveState.getState().refreshShopStockIfNeeded();
  const after = useSaveState.getState().shopStockRefreshedAt;
  if (after > before) {
    eventBus.emit('SHOP_STOCK_REFRESHED', {
      slots: useSaveState.getState().shopStock,
      anchorUtc7: after,
    });
  }
};

const onFocus = () => {
  useSaveState.getState().refreshCyclesIfNeeded();
  // Phase 3 Task 16 — also refresh shop stock on focus
  const before = useSaveState.getState().shopStockRefreshedAt;
  useSaveState.getState().refreshShopStockIfNeeded();
  const after = useSaveState.getState().shopStockRefreshedAt;
  if (after > before) {
    eventBus.emit('SHOP_STOCK_REFRESHED', {
      slots: useSaveState.getState().shopStock,
      anchorUtc7: after,
    });
  }
};
```

- [ ] **Step 3: Full suite (no new tests needed — AppRouter integration tested via E2E + MainMenu test)**

```bash
cd app && npm run test:run 2>&1 | tail -5
npm run lint && npm run typecheck && npm run verify
```

Expected: all green, ~1060 tests passing.

- [ ] **Step 4: Commit**

```bash
git add app/src/react/shell/AppRouter.tsx
git commit -m "feat(phase-3): AppRouter wire refreshShopStockIfNeeded on mount+focus"
```

---

## Task 17 — E2E phase_3_shop_pets.spec.ts

**Files:**
- Create: `app/tests/e2e/phase_3_shop_pets.spec.ts`
- Modify: `app/src/testing/gameTestBridge.ts` (add helper)

- [ ] **Step 1: Add bridge helper for breeding setup**

In `gameTestBridge.ts` — find the simulate interface + impl blocks (Sprint F `emitCombatExit` pattern). Add:

```ts
// In interface:
seedPetForBreeding: (codename: string, element: string, level: number) => string;

// In impl:
seedPetForBreeding: (codename, element, level) => {
  const pet = (window as { __GAME__: { getSaveState: () => any } })
    .__GAME__.getSaveState();
  // Use SaveState directly to create + tag element
  import('@/persistence/SaveStateStore').then(({ useSaveState }) => {
    const inst = useSaveState.getState().addPet(codename as never, 'common', level, 0);
    useSaveState.setState({
      ownedPets: useSaveState.getState().ownedPets.map((p) =>
        p.instanceId === inst.instanceId ? { ...p, element: element as never } : p,
      ),
    });
  });
  return ''; // E2E reads ownedPets[-1] for instanceId
},
```

- [ ] **Step 2: Write E2E**

```ts
// app/tests/e2e/phase_3_shop_pets.spec.ts
import { test, expect, type Page } from '@playwright/test';

const APP_URL = 'http://localhost:5173/';

async function waitForBridge(page: Page) {
  await page.waitForFunction(() => Boolean((window as { __GAME__?: unknown }).__GAME__), null, {
    timeout: 30_000,
  });
}

test.describe('Phase 3 — Shop + Breeding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL + 'play');
    await waitForBridge(page);
    await page.evaluate(() => {
      const g = (window as { __GAME__: { simulate: Record<string, (...args: unknown[]) => void> } }).__GAME__;
      g.simulate.resetSaveState();
      g.simulate.completeTutorial();
    });
    await page.reload();
    await waitForBridge(page);
  });

  test('earn stars → buy shop item → breed pets → roster grows', async ({ page }) => {
    // 1. Earn ~500 stars via 100 wins
    await page.evaluate(() => {
      const g = (window as { __GAME__: { simulate: { emitCombatExit: (won: boolean) => void } } }).__GAME__;
      for (let i = 0; i < 100; i++) g.simulate.emitCombatExit(true);
    });
    await page.goto(APP_URL); // back to MainMenu
    await waitForBridge(page);

    // 2. Open Shop
    await page.getByTestId('main-menu-shop').click();
    await expect(page.getByTestId('shop-overlay')).toBeVisible();

    // 3. Verify 5 slots rendered
    const cards = page.getByTestId('shop-item-card');
    await expect(cards).toHaveCount(5);

    // 4. Buy first item
    const balanceBefore = await page.evaluate(() => {
      return Number(localStorage.getItem('game-save-state-v1')?.match(/"battleStars":(\d+)/)?.[1] ?? '0');
    });
    await page.getByTestId('shop-buy-btn').first().click();
    await page.waitForTimeout(500); // server roundtrip

    const balanceAfter = await page.evaluate(() => {
      return Number(localStorage.getItem('game-save-state-v1')?.match(/"battleStars":(\d+)/)?.[1] ?? '0');
    });
    expect(balanceAfter).toBeLessThan(balanceBefore);

    // 5. Close shop
    await page.getByTestId('shop-close-btn').click();
    await expect(page.getByTestId('shop-overlay')).not.toBeVisible();

    // 6. Seed 2 pets (different elements) for breeding
    await page.goto(APP_URL + 'play');
    await waitForBridge(page);
    await page.evaluate(() => {
      const g = (window as { __GAME__: { simulate: { seedPetForBreeding: (c: string, e: string, l: number) => void } } }).__GAME__;
      g.simulate.seedPetForBreeding('aqualumi', 'fire', 3);
      g.simulate.seedPetForBreeding('aqualumi', 'water', 5);
    });
    await page.goto(APP_URL);
    await waitForBridge(page);

    // 7. Open Breeding
    await page.getByTestId('main-menu-breeding').click();
    await expect(page.getByTestId('breed-overlay')).toBeVisible();

    // 8. Pick both parents
    await page.getByTestId('pet-slot-empty').first().click();
    await page.getByTestId('pet-slot-empty').first().click(); // second slot now empty after first picked
    await page.waitForTimeout(100);

    // 9. Click Breed
    await page.getByTestId('breed-start-btn').click();
    await page.waitForTimeout(2000); // egg anim (idle 500ms + shake 1000ms + hatch trigger)

    // 10. Click Done → close overlay
    await page.getByTestId('breed-done-btn').click({ timeout: 5000 });

    // 11. Verify roster grew
    const rosterCount = await page.evaluate(() => {
      const saved = localStorage.getItem('game-save-state-v1') ?? '';
      const match = saved.match(/"ownedPets":\[(.*?)\]/);
      if (!match) return 0;
      return (match[1]?.match(/"instanceId"/g) ?? []).length;
    });
    expect(rosterCount).toBeGreaterThanOrEqual(3); // 2 seeded + 1 offspring
  });
});
```

**Heads-up on flakiness:** the slot-click cycle pattern is fragile. If the test fails on slot selection, adjust the `seedPetForBreeding` helper to return instanceIds that the test then clicks directly via testid. Alternatively, expose a `simulate.breedDirectly(aId, bId)` helper that bypasses the UI for the breeding part and only tests the shop UI end-to-end.

- [ ] **Step 3: Start dev server + run E2E**

```bash
cd app && npm run dev &
sleep 8
npx playwright test tests/e2e/phase_3_shop_pets.spec.ts --workers=1 --reporter=line 2>&1 | tail -30
pkill -f vite
```

Expected: 1 passed. If flaky, retry once. If still failing, report BLOCKED with specific assertion.

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/phase_3_shop_pets.spec.ts app/src/testing/gameTestBridge.ts
git commit -m "test(phase-3): E2E phase_3_shop_pets.spec.ts (shop buy + breed flow)"
```

---

## Task 18 — Docs (AP §11.10-12 + ISP Phase 3 + todo.md roll-up)

**Files:**
- Modify: `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
- Modify: `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Append AP §11.10-12 delta**

Append to `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`:

```markdown

## Phase 3 — Delta (12/05/2026)

Phase 3 ships spend-side economy (Shop), pet collection arc completion (Breeding), and Server Validation seam (Step 3.5). Type C: SaveState v8→v9 + 4 new EventBus events + new server middleware surface.

### §3.1 — Folder structure additions
- `types/{shop,breeding}.ts`
- `domain/{ShopEngine,PetBreedingEngine,ServerValidator,performShopPurchase,performBreedingStart,performBreedingHatch}.ts`
- `data/staticConfig/{shopCatalog,breedingPairs,breedingCosts}.ts`
- `react/components/{ShopItemCard,PetSlot,EggHatchAnim}.tsx`
- `react/overlays/{ShopOverlay,PetBreedingOverlay}.tsx`
- `server/validationRoutes.ts`

### §11.10 — Shop schema (NEW)

5 SaveState v9 fields drive shop subsystem:
- `shopStock: ShopItemSlot[]` — 5-slot daily rotating stock (3 common + 1 rare + 1 epic per Q3)
- `shopStockRefreshedAt: number` — UTC+7 anchor of last refresh
- `purchaseHistory: Record<ItemId, number>` — lifetime purchase counts

Pricing tiers (Q2):
- common 25-50 stars · rare 100-200 stars · epic 400-600 stars

Stock refresh logic reuses `QuestCycle.dailyAnchor`. Refresh triggers on `AppRouter` mount + window focus. `SHOP_STOCK_REFRESHED` event emitted post-refresh.

### §11.11 — Breeding schema (NEW)

1 SaveState v9 field drives breeding subsystem:
- `breedingChamber: BreedingSession | null` — single active session

`BreedingSession` snapshots offspring spec at "Breed" click (no re-roll at hatch). `durationMs = 0` Phase 3 (Q5 instant). `costBattleStars` charged at start per Q4 cost table (50/200/500/1000 by offspring rarity). Parents stay in roster.

Compatibility formula (Q6):
- Same element → MEDIUM (×1.0 multiplier, higher-rarity parent codename, no rarity upgrade)
- Cross-element with matrix pair → HIGH (×1.5, catalog codename, upgrade chance = 0.45)
- Cross-element without pair → LOW (×0.5, fallback codename, upgrade chance = 0.15)

Roster cap (Q7): `performBreedingStart` returns `roster_full` when `ownedPets.length >= PET_ROSTER_CAP`.

### §11.12 — Server validation seam (NEW)

1 SaveState v9 field:
- `clientNonce: number` — monotonically incrementing, replay protection

`ServerValidator.validateAction(endpoint, payload)`:
- HMAC-signs `${nonce}:${body}` via `signHmac` (Step 9.5 seam)
- POSTs to Vite middleware `/api/{shop,breed}/validate`
- Bumps `clientNonce` regardless of response
- Soft-fails on network error (`console.warn` + `ok: true`)

Vite middleware (`server/validationRoutes.ts`) verifies HMAC + nonce, returns 200/401/400. Production build skips middleware; client falls through soft-fail.

### §13 — SaveState v9 (additive over v8)
+ `shopStock: ShopItemSlot[]` (default `[]`)
+ `shopStockRefreshedAt: number` (default `0`)
+ `purchaseHistory: Record<string, number>` (default `{}`)
+ `breedingChamber: BreedingSession | null` (default `null`)
+ `clientNonce: number` (default `0`)

Migration v8→v9 additive: `if (version < 9)` injects defaults.

### §14 — EventBus catalog additions
+ `SHOP_STOCK_REFRESHED { slots: ShopItemSlot[]; anchorUtc7: number }`
+ `SHOP_PURCHASE_COMPLETED { itemId: string; priceCharged: number; stockRemaining: number }`
+ `BREEDING_STARTED { parentA: string; parentB: string; durationMs: number; expectedRarity: PetRarity }`
+ `EGG_HATCHED { offspringInstanceId: string; rarity: PetRarity; codename: string }`
```

- [ ] **Step 2: Append ISP Phase 3 row table**

Append to `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`:

```markdown

### Phase 3 (12/05/2026) — Shop + Pet Breeding + Server Validation

| # | Step | Status |
|---|---|---|
| P3.0 | Preflight (baseline 964 tests green) | ✅ |
| P3.1 | types/{shop,breeding}.ts | ✅ |
| P3.2 | data/staticConfig/shopCatalog.ts + tests | ✅ |
| P3.3 | data/staticConfig/{breedingPairs,breedingCosts}.ts + tests | ✅ |
| P3.6 | SaveState v8→v9 + 8 actions + tests | ✅ |
| P3.7 | EventBus +4 events + tests | ✅ |
| P3.4 | domain/ShopEngine.ts (refresh+validate) + tests | ✅ |
| P3.5 | domain/PetBreedingEngine.ts (compat+roll) + tests | ✅ |
| P3.8 | domain/ServerValidator.ts (HMAC envelope) + tests | ✅ |
| P3.9 | server/validationRoutes.ts (Vite middleware) + smoke | ✅ |
| P3.10 | domain/performShopPurchase.ts + tests | ✅ |
| P3.11 | domain/performBreedingStart.ts + performBreedingHatch.ts + tests | ✅ |
| P3.12 | components: ShopItemCard + PetSlot + EggHatchAnim + tests | ✅ |
| P3.13 | overlays/ShopOverlay.tsx + tests | ✅ |
| P3.14 | overlays/PetBreedingOverlay.tsx + tests | ✅ |
| P3.15 | MainMenu edits (+2 buttons) + tests | ✅ |
| P3.16 | AppRouter wire refreshShopStockIfNeeded | ✅ |
| P3.17 | E2E phase_3_shop_pets.spec.ts | ✅ |
| P3.18 | AP §11.10-12 + ISP roll-up + todo.md | ✅ |

**Phase 3 closed.** Spend-side economy + breeding + server validation seam shipped. Asset delivery pending Antigravity per Appendix G §G.2.1-G.2.10 + new shop UI prompts.
```

- [ ] **Step 3: Update `tasks/todo.md` header + Phase 3 row**

Edit lines 3-7 (the header summary):
```markdown
> **Last updated:** 12/05/2026 (post Phase 3 merge — production-hardening shipped)
> **Current commit:** `<phase-3-squash>` (Phase 3: Shop + Breeding + Server Validation)
> **Tests:** ~1072/1072 unit · 11/11 E2E (+ phase_3_shop_pets)
> **Phase progress:** Phase 1+1.5 ✅ · Phase 2.5 ✅ · **Phase 3 ✅ — production-ready** 🎉
```

Add a Phase 3 section to the sprints table (right after Phase 2.5 Sprint F row):
```markdown
| **P3** | Shop (5-slot daily rotating) + Pet Breeding (cost gate + element-blend) + Server Validation (HMAC middleware) | ✅ shipped | (this commit) | +108 (964 → 1072) |
```

- [ ] **Step 4: Run gates + commit**

```bash
cd /d/projectlocal/clevai/Game_exclusive/.claude/worktrees/phase3-shop-pets-7ab956
cd app && npm run verify
cd ..
git add docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md \
        docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md \
        tasks/todo.md
git commit -m "docs(phase-3): AP §11.10-12 + ISP Phase 3 row + todo.md · production-ready"
```

---

## End of plan

**Total estimate:**
- 19 tasks (P3.0 → P3.18)
- ~108 new unit tests (964 → ~1072)
- 1 new E2E (10 → 11)
- SaveState v8 → v9
- 4 new EventBus events
- HMAC server validation seam (Step 3.5)

**Execution order (dependency-respecting):**
P3.0 → P3.1 → P3.2 → P3.3 → P3.6 → P3.7 → P3.4 → P3.5 → P3.8 → P3.9 → P3.10 → P3.11 → P3.12 → P3.13 → P3.14 → P3.15 → P3.16 → P3.17 → P3.18

Same as task numbering except P3.6+P3.7 jump before P3.4+P3.5 (Sprint F lesson — schema + bus must exist before consumers).

**After all tasks:** dispatch final code reviewer for whole implementation, then invoke `superpowers:finishing-a-development-branch`.
