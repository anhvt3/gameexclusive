# Phase 3 — Shop + Pet Breeding + Server Validation — Design Spec

**Phase:** 3 (post-Phase 2.5)
**Type:** C (Entity Schema v8→v9 + 4 new EventBus events + new server validation seam — POSUP+ARCH approval)
**Author:** Claude (`claude/phase3-shop-pets-7ab956`)
**Status:** Draft → đợi anh review (12/05/2026)
**Base:** `main` at `13aefb6` (Sprint F merged — Phase 2.5 COMPLETE, 964 unit + 10 E2E)
**Plan doc:** `tasks/todo_phase3.md` (Q1-Q10 batch-answered 12/05/2026)
**Appendix:** `docs/appendix_G_pet_breeding_prompts.md` (Antigravity breeding UI assets pre-specced)

---

## 1. Why this phase

Phase 2.5 shipped earn-side economy (Sprint F Battle Stars) but no spend-side outlet — học sinh thấy currency tăng mỗi trận thắng nhưng không tiêu được, tooltip "Sắp ra mắt Cửa Hàng!" đang neo niềm chờ đợi. Pet system (Sprint C) đã đẻ ra collection mechanic nhưng dừng ở rescue + leveling; Appendix G đã specced breeding chamber từ trước nhưng chưa wire.

Phase 3 đóng nốt 2 hệ kinh tế đó + ship server validation seam (CEO TODO #2) để chuẩn bị anti-cheat trước public launch.

**POSUP-approved decisions (12/05/2026, plan §7 Q1-Q10):**

- **Q1 — Shop stock:** Daily rotating, 4-6 items refresh mỗi UTC+7 midnight (reuse `QuestCycle.dailyAnchor`).
- **Q2 — Pricing:** Common 25-50 stars / Rare 100-200 stars / Epic 400-600 stars.
- **Q3 — Cycle limits:** Hard cap per cycle — 3 common / 1 rare / 1 epic per refresh window.
- **Q4 ⭐ ANH OVERRIDE:** Breeding **costs Battle Stars** (50 common offspring / 200 rare / 500 epic / 1000 legendary). Parents stay in roster.
- **Q5 — Breeding timer:** Instant (`durationMs = 0`, hatch animation 2s — Phase 4 polish có thể bump up).
- **Q6 — Offspring formula:** Element-blend matrix lookup (`breedingPairs.ts`).
- **Q7 — Roster cap:** Block breed if at cap; surface "release a pet first" UX.
- **Q8 — Validation scope:** Shop + breeding only (Sprint F retro-fit defer Phase 4).
- **Q9 — Server impl:** Vite middleware dev-mode + HMAC verify production stub.
- **Q10 — UI entry:** MainMenu buttons → overlays (no `/shop` or `/breeding` routes).

---

## 2. Goals

- Ship 4-6 item daily-rotating shop với `battleStars` purchase flow + UTC+7 refresh + hard cap per cycle + purchase history.
- Ship 2-slot breeding chamber với compatibility meter + element-blend offspring formula + battle-stars cost gate + roster cap precheck.
- Ship Vite middleware HMAC-validated server endpoints `/api/shop/validate` + `/api/breed/validate` cho dev + production stub.
- Migrate SaveState v8 → v9 với 5 new fields + ~8 new actions.
- Document toàn bộ trong **AP §11.10** (Shop) + **§11.11** (Breeding) + **§11.12** (Server validation) + **ISP** Phase 3 row table.
- 16 atomic tasks, TDD discipline per Sprint F pattern.

---

## 3. Non-goals

- **Real-money / IAP / paid currency** — Clevai students captive audience; battle stars only.
- **Multi-slot breeding (queue mode)** — single chamber Phase 3; queue defer to Phase 4 if demand.
- **Breeding timer with real-time wait** — Q5 instant for ship; 5-min timer Phase 4 polish.
- **Pet trading / gifting between accounts** — single-player only.
- **Shop bulk-buy / "buy 10"** — student clicks one at a time, prevents accidental sprees.
- **Shop discount / promo codes** — Phase 4+ event content.
- **Breeding inheritance of stats (HP/MP/attack)** — offspring uses base stats from breeding catalog only.
- **Retro-fit Sprint F login/jar claims to server validation** — Q8 narrowed to shop + breeding; Phase 4 retro if needed.
- **Real backend service** — Vite middleware is the validation surface (dev hot + production static stub).
- **Antigravity asset blocking ship** — emoji/Tailwind fallback acceptable per Sprint F pattern.
- **Item REGISTRY expansion** — shop sells from existing items; no new ItemDef entries this phase.
- **Pet REGISTRY expansion beyond Sprint C 6 starters** — offspring uses existing 6 codenames; element-blend resolves to one of them.

---

## 4. Architecture overview

### 4.1 SaveState v8 → v9

```ts
interface SaveStateV9 extends SaveStateV8 {
  // ── Shop System ────────────────────────────────────────────────
  /**
   * Active stock for current UTC+7 cycle. Refreshed on app mount /
   * window-focus when `shopStockRefreshedAt < dailyAnchor(now)`.
   * Empty array = needs refresh (first launch or migration).
   */
  shopStock: ShopItemSlot[];

  /** Anchor (epoch ms UTC+7 midnight) of last stock refresh. 0 = never. */
  shopStockRefreshedAt: number;

  /**
   * Lifetime purchase count per itemId. Drives "Đã mua X lần" UI
   * badge + analytics. Does NOT gate purchases (cycle limit lives on
   * ShopItemSlot.cycleLimit + decrements stockRemaining).
   */
  purchaseHistory: Record<ItemId, number>;

  // ── Pet Breeding System ────────────────────────────────────────
  /**
   * Single active breeding session. null = chamber idle. Phase 3
   * single-slot; multi-slot deferred to Phase 4 (Q5).
   *
   * Q5 default: durationMs = 0 (instant). startedAt timestamps the
   * "Breed" click so the hatch animation can compute elapsed.
   */
  breedingChamber: BreedingSession | null;

  // ── Server validation (Step 3.5) ───────────────────────────────
  /**
   * Monotonically incrementing client nonce. Server checks +1 per
   * request to detect replay. Resets to 0 only on full save reset.
   */
  clientNonce: number;
}

interface ShopItemSlot {
  readonly itemId: ItemId;
  readonly priceBattleStars: number;     // computed at refresh, locked for cycle
  stockRemaining: number;                // 0..cycleLimit; decrements on buy
  readonly cycleLimit: number;           // hard cap from Q3 (3 / 1 / 1 by rarity)
}

interface BreedingSession {
  readonly parentA: PetInstanceId;
  readonly parentB: PetInstanceId;
  readonly startedAt: number;            // epoch ms
  readonly durationMs: number;           // 0 = instant
  readonly costBattleStars: number;      // charged at start (Q4)
  readonly offspringSpec: {              // locked at start, no re-roll
    readonly codename: PetCodename;
    readonly rarity: PetRarity;
    readonly level: number;              // = max(parentA.level, parentB.level)
  };
}
```

Migration v8→v9 additive: `shopStock: []`, `shopStockRefreshedAt: 0`, `purchaseHistory: {}`, `breedingChamber: null`, `clientNonce: 0`.

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── types/
│   ├── shop.ts                          NEW — ShopItemSlot, ShopPurchaseReceipt
│   └── breeding.ts                      NEW — BreedingSession, OffspringSpec, Compat
├── domain/
│   ├── ShopEngine.ts                    NEW — refresh stock + validate purchase (pure)
│   ├── ShopEngine.test.ts
│   ├── PetBreedingEngine.ts             NEW — compat calc + offspring roll (pure)
│   ├── PetBreedingEngine.test.ts
│   ├── ServerValidator.ts               NEW — HMAC envelope + replay-nonce
│   ├── ServerValidator.test.ts
│   ├── performShopPurchase.ts           NEW — orchestration helper
│   ├── performShopPurchase.test.ts
│   ├── performBreedingStart.ts          NEW — orchestration (lock chamber)
│   ├── performBreedingStart.test.ts
│   ├── performBreedingHatch.ts          NEW — orchestration (mint offspring)
│   └── performBreedingHatch.test.ts
├── data/staticConfig/
│   ├── shopCatalog.ts                   NEW — 12-15 items + base prices
│   ├── shopCatalog.test.ts
│   ├── breedingPairs.ts                 NEW — element × element → offspring
│   ├── breedingPairs.test.ts
│   ├── breedingCosts.ts                 NEW — rarity → battle-stars cost table
│   └── breedingCosts.test.ts
├── persistence/
│   ├── SaveStateStore.ts                EDIT — v9 schema + 8 actions
│   └── SaveStateStore.test.ts
├── bus/
│   ├── EventBus.ts                      EDIT — +4 events
│   └── EventBus.test.ts
├── react/
│   ├── overlays/
│   │   ├── ShopOverlay.tsx              NEW — stock grid + buy flow
│   │   ├── ShopOverlay.test.tsx
│   │   ├── PetBreedingOverlay.tsx       NEW — 2-slot chamber + hatch
│   │   └── PetBreedingOverlay.test.tsx
│   ├── components/
│   │   ├── ShopItemCard.tsx             NEW — single tile (price/stock/buy)
│   │   ├── ShopItemCard.test.tsx
│   │   ├── PetSlot.tsx                  NEW — drop target for parent
│   │   ├── PetSlot.test.tsx
│   │   ├── EggHatchAnim.tsx             NEW — countdown + sparkle reveal
│   │   └── EggHatchAnim.test.tsx
│   ├── screens/
│   │   ├── MainMenu.tsx                 EDIT — +2 buttons (shop, breed)
│   │   └── MainMenu.test.tsx
│   └── shell/
│       └── AppRouter.tsx                EDIT — mount overlays + engine lifecycle
├── server/
│   └── validationRoutes.ts              NEW — Vite middleware /api/{shop,breed}/validate
└── testing/
    └── gameTestBridge.ts                EDIT — +simulate helpers (refreshShop, etc.)
```

Layer rules:
- `domain/` — pure TS, no React/Phaser. Includes `ServerValidator` which imports `fetch` only.
- `data/staticConfig/` — pure data fixtures.
- `react/overlays/` + `components/` — React only.
- `server/validationRoutes.ts` — Vite plugin module; no client import.

### 4.3 ShopEngine — refresh + validate (pure)

```ts
// app/src/domain/ShopEngine.ts

import { dailyAnchor } from './QuestCycle';
import { SHOP_CATALOG, type ShopCatalogEntry } from '@/data/staticConfig/shopCatalog';
import type { ShopItemSlot } from '@/types/shop';

export const SHOP_SLOTS_PER_CYCLE = 5;        // Q1 default 4-6 → 5 mid
export const SHOP_CYCLE_LIMITS = { common: 3, rare: 1, epic: 1 } as const;

export function needsRefresh(refreshedAt: number, now: number): boolean {
  return dailyAnchor(now) > refreshedAt;
}

export function rollStock(now: number, rng: () => number = Math.random): ShopItemSlot[] {
  // 3 common + 1 rare + 1 epic (Q3 hard cap)
  const byRarity = {
    common: SHOP_CATALOG.filter((e) => e.rarity === 'common'),
    rare: SHOP_CATALOG.filter((e) => e.rarity === 'rare'),
    epic: SHOP_CATALOG.filter((e) => e.rarity === 'epic'),
  };
  const slots: ShopItemSlot[] = [];
  for (const rarity of ['common', 'rare', 'epic'] as const) {
    const pool = byRarity[rarity];
    const limit = SHOP_CYCLE_LIMITS[rarity];
    const picks = sampleWithoutReplacement(pool, limit, rng);
    for (const entry of picks) {
      slots.push({
        itemId: entry.itemId,
        priceBattleStars: entry.basePrice,    // future: tier multiplier
        stockRemaining: 1,                    // 1 unit per slot per cycle (Q3 hard cap = stock count)
        cycleLimit: 1,
      });
    }
  }
  return slots;
}

export interface PurchaseValidation {
  ok: boolean;
  reason?: 'not_in_stock' | 'stock_exhausted' | 'insufficient_stars';
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

Notes:
- `sampleWithoutReplacement` picks N distinct entries via `rng` (deterministic for tests).
- Q3 default "3 common / 1 rare / 1 epic" → 5 slots total per cycle.
- `cycleLimit: 1` per slot because stock is per-slot (3 common slots × 1 each = 3 common bought per cycle, matches Q3).

### 4.4 ShopCatalog — 12-15 items + base prices (Q2)

```ts
// app/src/data/staticConfig/shopCatalog.ts

import type { ItemId, ItemRarity } from './items';

export interface ShopCatalogEntry {
  readonly itemId: ItemId;
  readonly rarity: ItemRarity;
  readonly basePrice: number;        // Battle Stars (Q2 default)
}

export const SHOP_CATALOG: ReadonlyArray<ShopCatalogEntry> = [
  // ── common (25-50 stars) ──
  { itemId: 'health-potion-small',   rarity: 'common', basePrice: 25 },
  { itemId: 'mana-potion-small',     rarity: 'common', basePrice: 25 },
  { itemId: 'wooden-staff',          rarity: 'common', basePrice: 40 },
  { itemId: 'cloth-hat',             rarity: 'common', basePrice: 35 },
  { itemId: 'leather-boots',         rarity: 'common', basePrice: 50 },
  { itemId: 'health-potion-medium',  rarity: 'common', basePrice: 50 },

  // ── rare (100-200 stars) ──
  { itemId: 'silver-wand',           rarity: 'rare',   basePrice: 150 },
  { itemId: 'enchanted-cloak',       rarity: 'rare',   basePrice: 180 },
  { itemId: 'mage-amulet',           rarity: 'rare',   basePrice: 200 },
  { itemId: 'crystal-ring',          rarity: 'rare',   basePrice: 120 },

  // ── epic (400-600 stars) ──
  { itemId: 'phoenix-feather',       rarity: 'epic',   basePrice: 500 },
  { itemId: 'archmage-robe',         rarity: 'epic',   basePrice: 600 },
  { itemId: 'dragon-scale-shield',   rarity: 'epic',   basePrice: 450 },
];
```

**Note:** itemIds must match existing entries in `app/src/data/staticConfig/items.ts`. Spec compliance check in tests asserts every catalog entry resolves to a real ItemDef.

### 4.5 Shop stock refresh

`SaveState` action `refreshShopStockIfNeeded(now = Date.now())`:

```ts
refreshShopStockIfNeeded: (now = Date.now()) => {
  const state = get();
  if (!needsRefresh(state.shopStockRefreshedAt, now)) return;
  const newStock = rollStock(now);
  set({
    shopStock: newStock,
    shopStockRefreshedAt: dailyAnchor(now),
  });
  eventBus.emit('SHOP_STOCK_REFRESHED', {
    slots: newStock,
    anchorUtc7: dailyAnchor(now),
  });
}
```

Triggered from `AppRouter` `useEffect` on mount + `window.focus` (mirror Sprint D QuestEngine refreshCyclesIfNeeded pattern).

### 4.6 PetBreedingEngine — compat + offspring roll (pure)

```ts
// app/src/domain/PetBreedingEngine.ts

import { BREEDING_PAIRS, type BreedingPairResult } from '@/data/staticConfig/breedingPairs';
import { BREEDING_COSTS } from '@/data/staticConfig/breedingCosts';
import type { PetInstance, PetRarity, PetCodename } from '@/types/pet';

export interface CompatResult {
  level: 'low' | 'medium' | 'high';     // UI display
  multiplier: number;                    // 0.5 / 1.0 / 1.5 — modifies offspring rarity upgrade chance
}

export function computeCompatibility(parentA: PetInstance, parentB: PetInstance): CompatResult {
  // Same element → low compat (inbreeding metaphor); cross-element → high.
  // Element pair found in matrix → medium baseline.
  const pair = lookupPair(parentA.element, parentB.element);
  if (!pair) return { level: 'low', multiplier: 0.5 };
  if (parentA.element === parentB.element) return { level: 'medium', multiplier: 1.0 };
  return { level: 'high', multiplier: 1.5 };
}

export interface OffspringSpec {
  codename: PetCodename;
  rarity: PetRarity;
  level: number;
  costBattleStars: number;
}

export function rollOffspring(
  parentA: PetInstance,
  parentB: PetInstance,
  rng: () => number = Math.random,
): OffspringSpec {
  const pair = lookupPair(parentA.element, parentB.element);
  if (!pair) {
    // Same-element fallback: pick higher-rarity parent codename, no rarity bump
    const higher = (rarityOrder(parentA.rarity) >= rarityOrder(parentB.rarity)) ? parentA : parentB;
    return {
      codename: higher.codename,
      rarity: higher.rarity,
      level: Math.max(parentA.level, parentB.level),
      costBattleStars: BREEDING_COSTS[higher.rarity],
    };
  }

  // Cross-element: catalog drives codename. Rarity upgrade chance = compat.multiplier × 0.3
  const compat = computeCompatibility(parentA, parentB);
  const parentRarity = maxRarity(parentA.rarity, parentB.rarity);
  const upgrade = rng() < compat.multiplier * 0.3;
  const offspringRarity = upgrade ? nextRarityTier(parentRarity) : parentRarity;
  return {
    codename: pair.offspringCodename,
    rarity: offspringRarity,
    level: Math.max(parentA.level, parentB.level),
    costBattleStars: BREEDING_COSTS[offspringRarity],
  };
}
```

### 4.7 BreedingCatalog — element × element matrix

```ts
// app/src/data/staticConfig/breedingPairs.ts

import type { ElementType, PetCodename } from '@/types/pet';

export interface BreedingPair {
  readonly elementA: ElementType;
  readonly elementB: ElementType;
  readonly offspringCodename: PetCodename;
}

export const BREEDING_PAIRS: ReadonlyArray<BreedingPair> = [
  // Fire combinations
  { elementA: 'fire',   elementB: 'water',  offspringCodename: 'aqualumi' },   // Steam
  { elementA: 'fire',   elementB: 'earth',  offspringCodename: 'volcanic' },
  { elementA: 'fire',   elementB: 'wind',   offspringCodename: 'sparkwing' },
  { elementA: 'fire',   elementB: 'storm',  offspringCodename: 'inferno' },
  { elementA: 'fire',   elementB: 'plant',  offspringCodename: 'phoenixsprout' },

  // Water combinations
  { elementA: 'water',  elementB: 'earth',  offspringCodename: 'mudling' },
  { elementA: 'water',  elementB: 'wind',   offspringCodename: 'cloudfox' },
  { elementA: 'water',  elementB: 'plant',  offspringCodename: 'lillypup' },

  // ... (12 total pairs to enumerate, generator-friendly)
];

export function lookupPair(a: ElementType, b: ElementType): BreedingPair | null {
  return BREEDING_PAIRS.find(
    (p) => (p.elementA === a && p.elementB === b) ||
           (p.elementA === b && p.elementB === a),
  ) ?? null;
}
```

**Note:** `offspringCodename` values must exist in the Sprint C 6-starter Pet registry. If a pair resolves to a NEW codename, that's a data error — spec compliance test asserts every codename is valid.

### 4.8 Breeding cost table (Q4 anh override)

```ts
// app/src/data/staticConfig/breedingCosts.ts

import type { PetRarity } from '@/types/pet';

/**
 * Q4 default: breeding costs Battle Stars based on target offspring
 * rarity. Charged at "Breed" click (before chamber lock). Parents
 * stay in roster regardless of outcome.
 */
export const BREEDING_COSTS: Readonly<Record<PetRarity, number>> = {
  common:    50,
  rare:      200,
  epic:      500,
  legendary: 1000,
};
```

Cost is gated at `performBreedingStart`:
- Reads `useSaveState.getState().battleStars`
- If `< offspringSpec.costBattleStars` → return null with `reason: 'insufficient_stars'`
- On success: `addBattleStars(-cost)` (or new `spendBattleStars(amount)` action)
- Note: SaveState v8 `addBattleStars` is additive-positive-only. **NEW action `spendBattleStars(amount)` required** that decrements (asserts amount > 0 + `battleStars >= amount`).

### 4.9 ServerValidator — HMAC envelope + replay nonce

```ts
// app/src/domain/ServerValidator.ts

import { signHmac, verifyHmac } from '@/persistence/hmac';
import { useSaveState } from '@/persistence/SaveStateStore';

export interface ValidatedEnvelope<T> {
  payload: T;
  nonce: number;
  hmac: string;
}

export interface ValidationResponse {
  ok: boolean;
  reason?: string;
  serverNonce?: number;
}

/**
 * Wraps a domain action payload in HMAC + nonce envelope, posts to
 * the Vite-middleware validation endpoint, returns the validation
 * verdict. Client increments nonce regardless of response (so replay
 * attempts always fail).
 */
export async function validateAction<T>(
  endpoint: '/api/shop/validate' | '/api/breed/validate',
  payload: T,
): Promise<ValidationResponse> {
  const nonce = useSaveState.getState().clientNonce + 1;
  const body = JSON.stringify(payload);
  const hmac = await signHmac(`${nonce}:${body}`);
  useSaveState.getState().bumpClientNonce();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nonce': String(nonce), 'x-hmac': hmac },
      body,
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as ValidationResponse;
  } catch (err) {
    // Network failure: dev-mode lenient, log + allow. Production should
    // surface error but Phase 3 internal-deploy treats as soft-fail.
    console.warn('[ServerValidator] fetch failed, allowing action:', err);
    return { ok: true, reason: 'fetch_failed_soft_allow' };
  }
}
```

**Soft-fail policy:** if server unreachable (Vite plugin not loaded, network down), action still completes. This is acceptable per Phase 3 scope (internal deploy, no monetization at stake). Phase 4+ can tighten if needed.

### 4.10 Vite plugin middleware

```ts
// app/src/server/validationRoutes.ts

import type { Connect } from 'vite';
import { verifyHmac } from '@/persistence/hmac';

export function shopValidateRoute(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url !== '/api/shop/validate' || req.method !== 'POST') return next();
    const nonce = Number(req.headers['x-nonce']);
    const hmac = String(req.headers['x-hmac']);
    const body = await readBody(req);

    if (!Number.isFinite(nonce) || nonce < 1) {
      return respond(res, 400, { ok: false, reason: 'bad_nonce' });
    }

    const verified = await verifyHmac(hmac, `${nonce}:${body}`);
    if (!verified) return respond(res, 401, { ok: false, reason: 'hmac_mismatch' });

    // For Phase 3 dev: simple schema validation + always-ok response.
    // Production: cross-check against authoritative server state.
    return respond(res, 200, { ok: true, serverNonce: nonce });
  };
}

export function breedValidateRoute(): Connect.NextHandleFunction {
  // Same shape as shopValidateRoute but for /api/breed/validate
  // (read body, verify HMAC, return ok).
}
```

Plugin registered in `vite.config.ts`:
```ts
server: {
  middlewareMode: false,
  configureServer(server) {
    server.middlewares.use(shopValidateRoute());
    server.middlewares.use(breedValidateRoute());
  }
}
```

Production build: middleware not present. `ServerValidator.validateAction` catches `fetch` 404 + falls through soft-fail. Acceptable per §4.9 policy.

### 4.11 Orchestration helpers

#### `performShopPurchase(itemId, now, rng?)`

```ts
export async function performShopPurchase(
  itemId: ItemId,
  now: number = Date.now(),
): Promise<{ ok: true; itemMinted: ItemDef } | { ok: false; reason: string }> {
  const state = useSaveState.getState();
  const slot = state.shopStock.find((s) => s.itemId === itemId);
  const validation = validatePurchase(slot, state.battleStars);
  if (!validation.ok) return { ok: false, reason: validation.reason! };

  // Server validation
  const server = await validateAction('/api/shop/validate', { itemId, nonce: state.clientNonce + 1 });
  if (!server.ok) return { ok: false, reason: `server_${server.reason}` };

  // Atomic mutation
  const itemDef = findItemDef(itemId)!;
  useSaveState.getState().applyShopPurchase(itemId, slot!.priceBattleStars);
  // applyShopPurchase: addInventoryItem(InventoryItem), spendBattleStars(price),
  //                    decrement slot.stockRemaining, bump purchaseHistory[itemId]

  eventBus.emit('SHOP_PURCHASE_COMPLETED', {
    itemId,
    priceCharged: slot!.priceBattleStars,
    stockRemaining: slot!.stockRemaining - 1,
  });

  return { ok: true, itemMinted: itemDef };
}
```

#### `performBreedingStart(parentAId, parentBId, now, rng?)`

```ts
export async function performBreedingStart(
  parentAId: PetInstanceId,
  parentBId: PetInstanceId,
  now: number = Date.now(),
  rng: () => number = Math.random,
): Promise<{ ok: true; session: BreedingSession } | { ok: false; reason: string }> {
  const state = useSaveState.getState();

  // Pre-flight checks
  if (state.breedingChamber !== null) return { ok: false, reason: 'chamber_busy' };
  if (state.ownedPets.length >= PET_ROSTER_CAP) return { ok: false, reason: 'roster_full' };
  const parentA = state.ownedPets.find((p) => p.instanceId === parentAId);
  const parentB = state.ownedPets.find((p) => p.instanceId === parentBId);
  if (!parentA || !parentB) return { ok: false, reason: 'parent_not_found' };
  if (parentAId === parentBId) return { ok: false, reason: 'same_parent' };

  // Roll offspring spec (locked at start, no re-roll at hatch)
  const offspring = rollOffspring(parentA, parentB, rng);
  if (state.battleStars < offspring.costBattleStars) {
    return { ok: false, reason: 'insufficient_stars' };
  }

  // Server validation
  const server = await validateAction('/api/breed/validate', {
    parentA: parentAId, parentB: parentBId, cost: offspring.costBattleStars,
  });
  if (!server.ok) return { ok: false, reason: `server_${server.reason}` };

  // Lock chamber
  const session: BreedingSession = {
    parentA: parentAId,
    parentB: parentBId,
    startedAt: now,
    durationMs: 0,                                     // Q5 instant
    costBattleStars: offspring.costBattleStars,
    offspringSpec: {
      codename: offspring.codename,
      rarity: offspring.rarity,
      level: offspring.level,
    },
  };
  useSaveState.getState().startBreeding(session);
  // startBreeding: set breedingChamber, spendBattleStars(cost)

  eventBus.emit('BREEDING_STARTED', {
    parentA: parentAId,
    parentB: parentBId,
    durationMs: 0,
    expectedRarity: offspring.rarity,
  });

  return { ok: true, session };
}
```

#### `performBreedingHatch(now)`

```ts
export function performBreedingHatch(now: number = Date.now()):
  { ok: true; offspring: PetInstance } | { ok: false; reason: string } {
  const state = useSaveState.getState();
  const session = state.breedingChamber;
  if (!session) return { ok: false, reason: 'no_active_session' };
  if (now < session.startedAt + session.durationMs) return { ok: false, reason: 'not_ready' };

  // Mint via existing SaveState addPet action (Sprint C)
  const offspring = useSaveState.getState().addPet(
    session.offspringSpec.codename,
    session.offspringSpec.rarity,
    session.offspringSpec.level,
    0,    // xp = 0
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

### 4.12 EventBus delta (+4)

| Event | Payload | Direction |
|---|---|---|
| `SHOP_STOCK_REFRESHED` | `{ slots: ShopItemSlot[]; anchorUtc7: number }` | SaveState action → bus → ShopOverlay |
| `SHOP_PURCHASE_COMPLETED` | `{ itemId; priceCharged: number; stockRemaining: number }` | orchestration → bus → toast |
| `BREEDING_STARTED` | `{ parentA: string; parentB: string; durationMs: number; expectedRarity: PetRarity }` | orchestration → bus → analytics |
| `EGG_HATCHED` | `{ offspringInstanceId: string; rarity: PetRarity; codename: string }` | orchestration → bus → toast/celebration |

### 4.13 SaveState v9 actions (~8 new)

```ts
spendBattleStars(amount): void
  // Asserts amount > 0 AND battleStars >= amount. Subtracts.
  // Throws on invariant violation (mirror claimLootJar pattern).

refreshShopStockIfNeeded(now?): void
  // Idempotent. Refreshes stock + bumps anchor + emits SHOP_STOCK_REFRESHED.

applyShopPurchase(itemId, priceCharged): void
  // Atomic: addInventoryItem(InventoryItem) + spendBattleStars(price) +
  //         decrement slot.stockRemaining + bump purchaseHistory[itemId].
  // Pre: caller validated stock + funds.

startBreeding(session: BreedingSession): void
  // Pre: breedingChamber === null. Sets session + spendBattleStars(cost).

clearBreeding(): void
  // Pre: breedingChamber !== null. Sets back to null.

bumpClientNonce(): void
  // clientNonce += 1.

isShopStockFresh(now?): boolean
  // !needsRefresh(shopStockRefreshedAt, now)

isBreedingChamberBusy(): boolean
  // breedingChamber !== null
```

### 4.14 React surface

#### `ShopOverlay.tsx`

```
+----------------------------------------------------+
|  🛒 Cửa Hàng — Hết giờ làm mới: 03:42:11    [X]   |
+----------------------------------------------------+
|  💰 Battle Stars: 175                              |
|  ┌────────┐ ┌────────┐ ┌────────┐                  |
|  │ 🍎     │ │ ⚔️     │ │ 🛡️     │                  |
|  │ Bình   │ │ Gậy gỗ │ │ Mũ vải │                  |
|  │ 25⭐   │ │ 40⭐   │ │ 35⭐   │                  |
|  │ [Mua]  │ │ [Mua]  │ │ [Mua]  │                  |
|  └────────┘ └────────┘ └────────┘                  |
|  ┌────────┐ ┌────────┐                            |
|  │ 🌟     │ │ 🐉     │ ← rare + epic              |
|  │ Wand   │ │ Scale  │                            |
|  │ 150⭐  │ │ 450⭐  │                            |
|  │ [Mua]  │ │ [Hết]  │ ← insufficient_stars        |
|  └────────┘ └────────┘                            |
+----------------------------------------------------+
```

- Props `{ open: boolean; onClose: () => void }`
- Reads `shopStock`, `battleStars`, `purchaseHistory` from SaveState
- Each `<ShopItemCard />` renders 1 slot with buy button
- Click "Mua" → `performShopPurchase(itemId)` → on success, badge updates, button disables
- Stock-exhausted state: button shows "Hết" disabled
- Insufficient stars: button shows price red, disabled

#### `PetBreedingOverlay.tsx`

```
+----------------------------------------------------+
|  🥚 Lai Tạo Pet                            [X]    |
+----------------------------------------------------+
|  💰 Battle Stars: 250                             |
|  ┌──────────┐    ❤️ Compat: HIGH    ┌──────────┐  |
|  │ 🦊 Fire  │ ← parent A    parent B → │ 🐉 Water│  |
|  │ Lv 5     │  ┌──────┐              │ Lv 7     │  |
|  │ Common   │  │ 🥚   │              │ Rare     │  |
|  └──────────┘  │ 200⭐│              └──────────┘  |
|                └──────┘                            |
|                [ Bắt đầu lai tạo ]                 |
|                                                    |
|  Roster: 4 / 12 pets owned                         |
+----------------------------------------------------+
```

States:
- Idle: 2 empty slots, no compat shown, breed button disabled
- ParentA picked: slot A filled, slot B empty
- Both picked: compat meter + offspring preview + cost shown, breed button enabled (if stars + roster space)
- Breeding: chamber locked, slots show parents, egg animation in middle
- Hatched: `<EggHatchAnim />` plays sparkle, offspring revealed, "Đóng" button enabled

#### `EggHatchAnim.tsx`

Reuses LootJarOverlay 3-frame anim pattern (Sprint F Task 10):
- t=0: egg idle frame (🥚)
- t=500ms: egg shake + crack (CSS keyframe)
- t=1500ms: hatch + sparkle FX + offspring reveal (🌟 + pet emoji)
- t=2000ms: "Đóng" button enabled

#### MainMenu edits

Mirror Sprint F Task 11 pattern:
- Button "🛒 Cửa Hàng" + sparkle (when `shopStockRefreshedAt < dailyAnchor(now)` OR new stock available)
- Button "🥚 Lai Tạo" + sparkle (when `breedingChamber !== null` AND ready to hatch)

```tsx
<button
  data-testid="main-menu-shop"
  onClick={click(() => setShowShop(true))}
>
  🛒 Cửa Hàng
  {isShopStockFresh && <SparkleIndicator />}
</button>

<button
  data-testid="main-menu-breeding"
  onClick={click(() => setShowBreeding(true))}
>
  🥚 Lai Tạo
  {isBreedingReady && <SparkleIndicator />}
</button>
```

#### AppRouter wiring

No new routes (Q10). Overlays controlled by MainMenu local state (Sprint F pattern). AppRouter:
- Adds `refreshShopStockIfNeeded` to mount + focus useEffect (alongside Sprint D `refreshCyclesIfNeeded`)
- No new engine class (Shop + Breeding are user-initiated, not event-observers)

---

## 5. Acceptance criteria

1. **Schema v9:** `shopStock`, `shopStockRefreshedAt`, `purchaseHistory`, `breedingChamber`, `clientNonce` exist. v8 saves migrate cleanly.
2. **Shop stock refresh:** First mount with `shopStockRefreshedAt=0` → rolls 5 slots (3 common + 1 rare + 1 epic), emits `SHOP_STOCK_REFRESHED`, sets anchor.
3. **Shop stock dedup:** Same-day mount does not re-roll; cross-day mount does.
4. **Purchase happy path:** Sufficient stars + in-stock → `performShopPurchase` succeeds, `inventory` grows by 1, `battleStars` decrements by `priceCharged`, `purchaseHistory[itemId]` bumps, `slot.stockRemaining` decrements, `SHOP_PURCHASE_COMPLETED` emitted.
5. **Purchase insufficient stars:** Returns `{ ok: false, reason: 'insufficient_stars' }`, no mutations.
6. **Purchase out of stock:** Returns `{ ok: false, reason: 'stock_exhausted' }`, no mutations.
7. **Breeding cost gate (Q4):** `performBreedingStart` with insufficient stars returns `insufficient_stars`, no mutations.
8. **Breeding chamber busy:** Second start while session active returns `chamber_busy`.
9. **Breeding roster full:** `ownedPets.length >= PET_ROSTER_CAP` returns `roster_full`.
10. **Breeding same-parent:** parentA === parentB returns `same_parent`.
11. **Breeding happy path:** Success path: chamber locked, `battleStars -= cost`, `BREEDING_STARTED` emitted, offspring spec captured in session.
12. **Hatch happy path (instant Q5):** `performBreedingHatch` with `now >= startedAt + durationMs` mints offspring via `addPet`, clears chamber, `EGG_HATCHED` emitted, `ownedPets.length += 1`.
13. **Hatch not ready:** Returns `not_ready` if elapsed < durationMs (relevant Phase 4 timer; durationMs=0 = always ready).
14. **Offspring formula:** Cross-element parents → catalog codename + rarity-upgrade chance (compat.multiplier × 0.3). Same-element parents → higher-rarity parent's codename + rarity unchanged.
15. **Server validation success:** Vite plugin endpoints respond 200 with `{ ok: true, serverNonce }` on valid HMAC.
16. **Server validation HMAC mismatch:** Returns 401, action aborts with `server_hmac_mismatch`.
17. **Server validation nonce replay:** Same nonce twice → second request rejected (out of scope Phase 3 dev mode; production stub always-200).
18. **Server validation network failure:** Soft-fail per §4.9 — action completes with `console.warn`.
19. **MainMenu sparkle:** Shop button has sparkle when stock fresh; Breeding button has sparkle when chamber ready to hatch.
20. **ShopOverlay buy button states:** in-stock+stars=enabled, out-of-stock=disabled "Hết", insufficient-stars=disabled red-price.
21. **PetBreedingOverlay flow:** Pick parent A → pick parent B → compat shown → cost shown → click Breed → egg anim → hatch → offspring revealed.
22. **E2E `phase_3_shop_pets.spec.ts`:** Full flow — earn 500 stars (simulate 100 wins) → open shop → buy common (decrement 25) → buy rare (decrement 150) → open breed → pick 2 pets → breed → hatch → roster grew.
23. **Type C gates:** lint + typecheck + verify + ~1024 unit + 11 E2E green. New tests:
    - `ShopEngine.test.ts` ~15 (refresh, rollStock, validatePurchase, edge cases)
    - `PetBreedingEngine.test.ts` ~12 (compat, offspring roll, fallback)
    - `ServerValidator.test.ts` ~6 (sign, verify, nonce bump, fetch failure)
    - `performShopPurchase.test.ts` ~8 (happy + 3 failure reasons + server fail)
    - `performBreedingStart.test.ts` ~10 (happy + 5 failure reasons)
    - `performBreedingHatch.test.ts` ~4 (happy + 2 failure reasons)
    - `shopCatalog.test.ts` ~3 (valid itemIds, tier distribution, price ranges)
    - `breedingPairs.test.ts` ~3 (valid codenames, no dup pairs, all elements covered)
    - `breedingCosts.test.ts` ~2 (all rarities present, ascending)
    - `SaveStateStore.test.ts` ~10 (v8→v9 migration + 8 new actions)
    - `EventBus.test.ts` ~4 (4 new events typed)
    - `ShopOverlay.test.tsx` ~8 (stock render, buy flow, states)
    - `PetBreedingOverlay.test.tsx` ~8 (parent pick, compat, breed, hatch)
    - `ShopItemCard.test.tsx` ~5 (states)
    - `PetSlot.test.tsx` ~3 (empty / filled / disabled)
    - `EggHatchAnim.test.tsx` ~3 (phase transitions)
    - `MainMenu.test.tsx` ~4 (+2 buttons + 2 sparkles)
    - E2E ~1 (full flow)

**Total estimate: ~108 new tests, 964 → ~1072.**

---

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | v8→v9 migration corrupts Sprint F saves | Low | High | Strict additive `if (version < 9)`; v8→v9 chain test asserts all v8 fields preserved. |
| R2 | `spendBattleStars` race with `addBattleStars` (engine fires mid-purchase) | Low | Med | Both are synchronous Zustand actions; no real race in single-threaded JS. Document assumption. |
| R3 | Server validation Vite plugin fails to load → all purchases soft-fail silently | Med | Med | `console.warn` on fetch failure. Add startup smoke test "ping /api/shop/validate" in dev mode. Production: documented soft-fail policy. |
| R4 | HMAC roundtrip latency causes UX lag (>500ms per purchase) | Med | Low | `fetch` is async — UI shows spinner during validation. Dev mode <50ms typical. |
| R5 | Roster cap reached during breeding setup → confusing "roster_full" mid-click | Low | Med | Pre-check in MainMenu disables Breeding button when at cap; Overlay shows "Hãy thả 1 pet" hint. |
| R6 | Offspring `codename` resolves to invalid (typo in `breedingPairs.ts`) → `addPet` crashes | Low | High | Spec test asserts every `offspringCodename` ∈ Pet registry. Static catalog test gate. |
| R7 | Shop stock refresh fires mid-purchase (cross-midnight active session) | Low | Med | Refresh only on mount + focus, NOT on every action. Existing purchase reads slot at action time. |
| R8 | Breeding cost insufficient AFTER battle-stars earned mid-roll → state inconsistency | Low | Low | Cost re-evaluated atomically in `performBreedingStart`; no caching of state across async boundaries. |
| R9 | Vite middleware leaks into production bundle | Low | Low | Middleware in `vite.config.ts` `configureServer` hook — only attaches in dev. Production build ignores. |
| R10 | E2E flaky on async validation (fetch race) | Med | Med | E2E uses `__GAME__.simulate.bypassServerValidation()` flag for stability (test bridge helper). Production path tested separately in unit. |
| R11 | Element-pair matrix doesn't cover all 8 elements (gap in `breedingPairs.ts`) | Med | Low | Same-element fallback in `rollOffspring` (higher-rarity parent codename). Test asserts no element pair throws. |
| R12 | Antigravity assets blocked → ship without breeding chamber BG | Low | Low | Fallback Tailwind gradient + emoji (Sprint F pattern). Documented in §10. |

---

## 7. AP / ISP impact

### 7.1 AP delta (additive, no version bump)

Append "Phase 3 — Delta" section after Sprint F delta. New sections:

- **§3.1** — add 19 new files (types/shop, types/breeding, 6 domain files, 3 catalog files, 5 React files, 1 server file, plus test siblings).
- **§11.10 — Shop schema (NEW):** Document ShopItemSlot, ShopCatalogEntry, daily-rotation refresh logic, Q2 pricing tiers, Q3 cycle limits.
- **§11.11 — Breeding schema (NEW):** Document BreedingSession, OffspringSpec, compat formula, element-pair matrix, Q4 cost table, Q5 instant timer policy, Q7 roster cap precheck.
- **§11.12 — Server validation seam (NEW):** Document HMAC envelope, replay nonce, Vite middleware endpoints, soft-fail policy.
- **§13** — add v9 row: 5 new fields. Migration v8→v9 additive.
- **§14** — append 4 events.

### 7.2 ISP delta — Phase 3 row table

| # | Step | Status |
|---|---|---|
| P3.0 | Preflight (baseline 964 tests green) | ⏳ |
| P3.1 | types/{shop,breeding}.ts | ⏳ |
| P3.2 | data/staticConfig/shopCatalog.ts (12-15 items) + tests | ⏳ |
| P3.3 | data/staticConfig/{breedingPairs,breedingCosts}.ts + tests | ⏳ |
| P3.4 | domain/ShopEngine.ts (refresh + validate) + tests | ⏳ |
| P3.5 | domain/PetBreedingEngine.ts (compat + roll) + tests | ⏳ |
| P3.6 | SaveState v8→v9 + 8 actions + tests | ⏳ |
| P3.7 | EventBus +4 events + tests | ⏳ |
| P3.8 | domain/ServerValidator.ts (HMAC envelope) + tests | ⏳ |
| P3.9 | server/validationRoutes.ts (Vite middleware) + smoke test | ⏳ |
| P3.10 | domain/performShopPurchase.ts orchestration + tests | ⏳ |
| P3.11 | domain/performBreedingStart.ts + performBreedingHatch.ts + tests | ⏳ |
| P3.12 | components/ShopItemCard.tsx + PetSlot.tsx + EggHatchAnim.tsx + tests | ⏳ |
| P3.13 | overlays/ShopOverlay.tsx + tests | ⏳ |
| P3.14 | overlays/PetBreedingOverlay.tsx + tests | ⏳ |
| P3.15 | MainMenu edits (+2 buttons + sparkles) | ⏳ |
| P3.16 | AppRouter wire refreshShopStockIfNeeded on mount/focus | ⏳ |
| P3.17 | E2E phase_3_shop_pets.spec.ts | ⏳ |
| P3.18 | AP §11.10 + §11.11 + §11.12 + §13 + §14 delta + ISP roll-up + todo | ⏳ |

19 steps. Phase 3 is larger than Sprint A (16 steps) due to 3 concurrent features + server validation seam. Per-step scope remains atomic.

### 7.3 tasks/todo.md update

Phase 3 row added to "Phase 3 — Production Hardening" table. Phase 2.5 closed. todo_phase3.md archived to docs/superpowers/.

---

## 8. Test strategy

### 8.1 Unit (Vitest) — target ≥ 108 new tests

Distribution per §5 acceptance #23.

### 8.2 E2E (Playwright)

`app/tests/e2e/phase_3_shop_pets.spec.ts`:

```
test('phase 3: earn stars → buy items → breed pet → roster grows', ...)
```

Steps:
1. Seed save v9 + tutorial complete + 2 starter pets via test bridge.
2. Simulate 100 combat wins via `__GAME__.simulate.emitCombatExit(true)` × 100 → `battleStars >= 500`.
3. Navigate to MainMenu, click "🛒 Cửa Hàng" → ShopOverlay opens.
4. Verify 5 slots rendered (3 common + 1 rare + 1 epic).
5. Click first common item "Mua" → wait validation → success.
6. Verify `inventory.length += 1`, `battleStars -= 25`.
7. Close shop.
8. Click "🥚 Lai Tạo" → PetBreedingOverlay opens.
9. Pick parent A → pick parent B (different element).
10. Verify compat meter shows "HIGH".
11. Click "Bắt đầu lai tạo" → wait validation → egg animation plays.
12. Wait 2.5s → click "Đóng" → offspring added to roster.
13. Verify `ownedPets.length += 1`.

E2E timeout 90s. Sequential `--workers=1`.

### 8.3 Visual UAT (Antigravity)

- Fresh login → MainMenu shows BattleStarsBadge with current count
- Click "🛒 Cửa Hàng" → ShopOverlay opens with 5 item cards
- Buy flow: insufficient → red price; sufficient → green button → click → server roundtrip → success toast
- Click "🥚 Lai Tạo" → 2-slot chamber, drag pets in
- Cross-element pair → HIGH compat → click Breed → cost charged → egg shakes → hatches → offspring revealed
- Same-element pair → LOW/MED compat → reduced rarity-upgrade chance

---

## 9. Type classification

**Type C** — Entity Schema delta (5 new SaveState fields) + 4 NEW EventBus events + new server seam (Step 3.5). POSUP + ARCH approval required.

CI label gate: `type-C`.

POSUP + ARCH sign-off needed:
- §11.10 schema (shopStock + purchaseHistory + cycle limits)
- §11.11 schema (breedingChamber + offspring formula + cost table Q4)
- §11.12 server validation seam (HMAC envelope + nonce protocol)
- Vite plugin middleware addition (server-side surface, even if dev-only)

---

## 10. Asset spec — Antigravity

### 10.1 Shop UI assets — NEW prompts (append to Appendix F)

| File | Spec | Antigravity prompt anchor |
|---|---|---|
| `app/public/assets/shop/shop_chamber_bg_1280x720.png` | Cozy marketplace interior, warm wood + lantern lighting | Style anchor §G.1 |
| `app/public/assets/shop/shop_item_card_frame_256x256.png` | Parchment scroll card frame for item display | Style anchor §G.1 |
| `app/public/assets/shop/buy_button_states_240x64.png` | 3 states: enabled (orange), hover (yellow glow), disabled (gray) | Style anchor §G.1 |

### 10.2 Breeding UI assets — Appendix G §G.2.1-G.2.10

Already specced in `docs/appendix_G_pet_breeding_prompts.md` from Phase 2 planning. 10 assets:
- G.2.1 Breeding Chamber BG (1280×720)
- G.2.2 Empty pet slot frame (256×256)
- G.2.3 Filled pet slot frame (256×256)
- G.2.4 Offspring result slot (256×256)
- G.2.5 Compatibility meter (320×64)
- G.2.6 Egg container 3-state (160×160, idle/brooding/cracking)
- G.2.7 Offspring reveal sparkle FX (400×400)
- G.2.8 + G.2.9 Breed button 2 states (240×64 each)
- G.2.10 Pet inventory slot (96×96)

### 10.3 Fallback for missing assets

Phase 3 ships with CSS/emoji fallback (Sprint F pattern §10.5):
- Shop chamber: Tailwind warm gradient + emoji 🛒
- Item cards: Tailwind card + emoji (🍎 potion, ⚔️ weapon, 🛡️ armor, 🌟 rare, 🐉 epic)
- Buy button: Tailwind amber-500 → amber-600 on hover, gray-300 disabled
- Breeding chamber: Tailwind lavender gradient + emoji 🥚
- Pet slots: emoji 🦊 🐉 🐢 (per element) with Tailwind dashed-border slot
- Compat meter: 3-tier color (red / yellow / green)
- Egg anim: emoji 🥚 → 💥 with CSS keyframe shake (mirror LootJarOverlay)

---

## 11. Open questions baked as defaults

All 10 questions (Q1-Q10) answered batch by anh 12/05/2026. Q4 override locked: breeding costs battle stars per offspring-rarity table; parents stay in roster. No further open questions.

---

**End Phase 3 design spec.**

Next step: anh review spec doc → user approval → invoke `superpowers:writing-plans` to produce `docs/superpowers/plans/2026-05-12-phase-3-shop-pets-plan.md` (19-step phased plan with TDD red→green→commit pattern) → invoke `superpowers:subagent-driven-development` → ship Phase 3.
