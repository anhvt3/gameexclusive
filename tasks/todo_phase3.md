# Phase 3 — Shop + Pet Breeding + Server Validation — Implementation Plan

> **Branch:** `claude/phase3-shop-pets-7ab956`
> **Worktree:** `.claude/worktrees/phase3-shop-pets-7ab956`
> **Base:** `main` at `13aefb6` (Sprint F merged — Phase 2.5 COMPLETE)
> **Status:** ⏳ Draft — đợi anh review trước khi code dòng đầu tiên
> **Author:** Claude (`claude/phase3-shop-pets-7ab956`)
> **Date:** 2026-05-12

---

## 1. Phase 3 scope per anh's brief

3 tính năng cốt lõi:

| # | Feature | Type (anh kích định) | Why now |
|---|---|---|---|
| 1 | **Shop System** | C (new event family + entity schema) | Spend `battleStars` (Sprint F earned-only currency). Closes the dopamine loop. |
| 2 | **Pet Breeding System** | C (new event family + entity schema) | Sprint C delivered roster + rescue; breeding evolves roster economy. Appendix G already specs the UI. |
| 3 | **Server Validation Step 3.5** | B (cross-cutting harness + HMAC seam) | CEO TODO #2 deferred. Anti-cheat for shop purchases + breeding outcomes. |

---

## 2. Current state baseline (verified)

- **Schema:** v8 (`SaveStateStore.ts` line 47) — includes `battleStars`, `ownedPets`, `inventory`, `equipment`, `lastLoginAnchorUtc7`, `loginStreak`, `lootJarBattlesSinceLast`.
- **Tests:** 964 unit + 10 E2E green on main (Sprint F merge).
- **Existing seams:**
  - `eventBus` (`@bus/EventBus`) — typed discriminated union, easy to extend
  - HMAC: SaveState v9.5 uses HMAC sign (Step 9.5 shipped) — seam exists for EventQueue wrap (CEO TODO #3 partial)
  - Pet schema: `PetInstance { instanceId, codename, level, xp, rarity }`; `PetRarity = 'common' | 'rare' | 'epic' | 'legendary'`
  - `ItemDef { id, rarity, drop_weight, minLevel, ... }` with 3 rarity tiers
  - Reward overlay pattern (RewardChestOverlay, LootJarOverlay, PetRescueOverlay) — reusable
  - Appendix G already specs 10 breeding UI assets + mechanic flow

---

## 3. Schema sketch — v8 → v9 (DRAFT, đợi anh confirm)

```ts
interface SaveStateV9 extends SaveStateV8 {
  // ── Shop System ────────────────────────────────────────────────
  /**
   * Rotating stock — refreshed every UTC+7 midnight (reuse QuestCycle).
   * Empty array = needs refresh. Refresh logic in ShopEngine.
   */
  shopStock: ShopItemSlot[];

  /** Last anchor (epoch ms) shop stock was refreshed. 0 = never. */
  shopStockRefreshedAt: number;

  /**
   * Lifetime purchase count per itemId. Drives "Đã mua X lần" UI badge
   * AND per-item purchase limits (e.g. "max 3 per cycle"). Cycle limits
   * use a separate `shopCycleCounts` keyed by anchor — see Q3 below.
   */
  purchaseHistory: Record<ItemId, number>;

  // ── Pet Breeding System ────────────────────────────────────────
  /**
   * Single active breeding session. null = chamber idle. We start with
   * single-slot (one breed at a time) per Appendix G G.0. Multi-slot
   * defer to Phase 4 if needed.
   */
  breedingChamber: BreedingSession | null;

  // ── Server validation (Step 3.5) ───────────────────────────────
  /**
   * Monotonically incrementing client nonce. Server validates +1 per
   * request to detect replay. Resets on full save reset only.
   */
  clientNonce: number;
}

interface ShopItemSlot {
  itemId: ItemId;
  priceBattleStars: number;
  stockRemaining: number;        // refreshed per cycle
  cycleLimit: number;            // hard cap per refresh window
}

interface BreedingSession {
  parentA: PetInstanceId;
  parentB: PetInstanceId;
  startedAt: number;             // epoch ms
  durationMs: number;            // 0 = instant (dev mode), 300_000 = 5 min (prod)
  expectedOffspringRarity: PetRarity;
  expectedOffspringCodename: PetCodename;
  // Snapshot offspring spec at "Breed" click so rng/compat is locked in;
  // hatching is just a UI animation step, no re-roll.
}
```

**Migration v8→v9 additive:** old saves get `shopStock: []`, `shopStockRefreshedAt: 0`, `purchaseHistory: {}`, `breedingChamber: null`, `clientNonce: 0`.

---

## 4. Architecture layers (mirroring Sprint F discipline)

```
app/src/
├── types/
│   ├── shop.ts                     NEW — ShopItemSlot, ShopPurchaseReceipt
│   └── breeding.ts                 NEW — BreedingSession, OffspringSpec, Compatibility
├── domain/
│   ├── ShopEngine.ts               NEW — stock refresh + purchase validation (pure)
│   ├── ShopCatalog.ts              NEW — static price table & cycle limits
│   ├── PetBreedingEngine.ts        NEW — compatibility calc + offspring roll (pure)
│   ├── PetBreedingCatalog.ts       NEW — element x element → offspring lookup table
│   ├── performShopPurchase.ts      NEW — orchestration (mirror performLoginClaim)
│   ├── performBreedingStart.ts     NEW — orchestration (lock chamber, snapshot spec)
│   ├── performBreedingHatch.ts     NEW — orchestration (mint pet, clear chamber)
│   └── ServerValidator.ts          NEW — HMAC-signed request wrapper for shop/breed
├── data/staticConfig/
│   ├── shopCatalog.ts              NEW — 12-15 item entries with prices
│   └── breedingPairs.ts            NEW — element-pair → offspring rarity matrix
├── persistence/
│   └── SaveStateStore.ts           EDIT — v8→v9 + ~8 new actions
├── bus/
│   └── EventBus.ts                 EDIT — +4 events
├── react/
│   ├── overlays/
│   │   ├── ShopOverlay.tsx         NEW — stock grid + buy button + confirm modal
│   │   └── PetBreedingOverlay.tsx  NEW — 2-slot chamber + compat meter + egg + hatch
│   ├── components/
│   │   ├── ShopItemCard.tsx        NEW — single item tile (price/stock/buy)
│   │   ├── PetSlot.tsx             NEW — drop target for parent pet
│   │   └── EggHatchAnim.tsx        NEW — countdown + sparkle reveal
│   ├── screens/
│   │   └── MainMenu.tsx            EDIT — +"Cửa Hàng" button +"Lai Tạo" button
│   └── shell/
│       └── AppRouter.tsx           EDIT — mount overlays (or add /shop /breeding routes)
└── server/                          NEW
    └── validationRoutes.ts         NEW — Vite plugin /api/shop/validate, /api/breed/validate
```

---

## 5. New EventBus events (+4)

| Event | Payload | Direction |
|---|---|---|
| `SHOP_STOCK_REFRESHED` | `{ slots: ShopItemSlot[]; anchorUtc7: number }` | engine → bus → ShopOverlay |
| `SHOP_PURCHASE_COMPLETED` | `{ itemId, priceCharged, stockRemaining }` | overlay → bus → toast/analytics |
| `BREEDING_STARTED` | `{ parentA, parentB, durationMs, expectedRarity }` | overlay → bus → analytics |
| `EGG_HATCHED` | `{ offspringInstanceId, rarity, codename }` | overlay → bus → toast/analytics |

---

## 6. Step plan (high-level — detail per task ships in spec doc)

| # | Step | Type | Deps |
|---|---|---|---|
| P3.0 | Preflight (baseline 964 tests green on branch) | — | — |
| P3.1 | `types/shop.ts` + `types/breeding.ts` | A | — |
| P3.2 | `data/staticConfig/shopCatalog.ts` (12-15 items + prices) | A | P3.1 |
| P3.3 | `data/staticConfig/breedingPairs.ts` (element pair matrix) | A | P3.1 |
| P3.4 | `domain/ShopEngine.ts` (stock refresh + validate) + tests | B | P3.2 |
| P3.5 | `domain/PetBreedingEngine.ts` (compat + offspring roll) + tests | B | P3.3 |
| P3.6 | SaveState v8→v9 migration + 8 new actions + tests | B | P3.1 |
| P3.7 | EventBus +4 events + tests | C | P3.6 |
| P3.8 | `domain/ServerValidator.ts` (HMAC-signed envelope) + tests | B | P3.6 |
| P3.9 | `domain/performShopPurchase.ts` orchestration + tests | B | P3.4, P3.6, P3.7, P3.8 |
| P3.10 | `domain/performBreedingStart.ts` + `performBreedingHatch.ts` orchestration + tests | B | P3.5, P3.6, P3.7, P3.8 |
| P3.11 | Vite plugin `/api/shop/validate` + `/api/breed/validate` + Zod request schemas | B | P3.8 |
| P3.12 | `ShopOverlay.tsx` + `ShopItemCard.tsx` + tests | A | P3.9 |
| P3.13 | `PetBreedingOverlay.tsx` + `PetSlot.tsx` + `EggHatchAnim.tsx` + tests | A | P3.10 |
| P3.14 | MainMenu edits (+2 buttons) + AppRouter mount | A | P3.12, P3.13 |
| P3.15 | E2E `tests/e2e/phase_3_shop_pets.spec.ts` | — | All above |
| P3.16 | AP §11.10 + §11.11 NEW + ISP Phase 3 row + tasks/todo.md roll-up | — | All above |

**Estimate:** ~16 atomic tasks. Comparable scale to Sprint A (multi-party combat). Type C overall because of EventBus + breeding entity schema additions.

---

## 7. Clarifying questions — anh chốt trước khi viết spec doc

### Q1. Shop stock model
- **A.** Daily rotating stock (4-6 random items refresh mỗi UTC+7 midnight, reuse `QuestCycle.dailyAnchor`) ⭐
- **B.** Static catalog always available (all 12-15 items visible forever, only stock limits the buy count)
- **C.** Weekly stock rotation (Sunday UTC+7 refresh)

⭐ Em đề xuất A — đồng bộ pattern Sprint D quest cycle + tạo "come back tomorrow" loop.

### Q2. Shop pricing tier
Em đề xuất `priceBattleStars`:
- common item: 25-50 stars
- rare item: 100-200 stars
- epic item: 400-600 stars

(Sprint F earn formula = 5 × heroLevel; ở lvl 1 thu được ~5 stars/win, ~50 stars/jar reset, ~50 stars/login day-4. Sau 1 tuần play thường thu ~500-800 stars.) Anh OK numbers này không hay điều chỉnh?

### Q3. Shop cycle limits
- **A.** Hard cap per cycle (e.g. max 3 common, 1 rare, 1 epic per refresh window) ⭐
- **B.** Stock-only (item disappears when bought out, no per-item cycle limit)
- **C.** Both: stock + cycle counts

⭐ Em đề xuất A — đơn giản nhất, prevents grinding to oblivion.

### Q4. Breeding cost
- **A.** Free (no cost, just consume 2 pets-as-parents that stay in roster) — gentle UX ⭐
- **B.** Costs battle stars (e.g. 200 stars per breed)
- **C.** Consumes parents (parents DELETED from roster after breed)

⭐ Em đề xuất A — Clevai students, internal, no monetization pressure. Pets stay; just spawn offspring.

### Q5. Breeding timer (Appendix G §G.0 said 5min real-time OR instant for Phase 2)
- **A.** Instant for Phase 3 ship — `durationMs = 0`, breed click → hatch animation 2s → offspring ready ⭐
- **B.** Real timer 1-2 min (test "anticipation" UX)
- **C.** Real timer 5 min (matches Appendix G default)

⭐ Em đề xuất A — Phase 3 internal ship, defer timer mechanic to Phase 4 polish. Avoid blocking student session.

### Q6. Offspring rarity & codename
- **A.** Element-blend matrix (e.g. Fire + Water → Steam pet of higher rarity) using `breedingPairs.ts` lookup ⭐
- **B.** Random tier upgrade (rarity = max(parentA, parentB) + 1 step with 30% chance)
- **C.** Stat inheritance only (offspring = parentA codename + averaged level)

⭐ Em đề xuất A — most natural breeding mechanic + Appendix G already hints at "element blend nếu parents khác element". Codename derived from element pair via static matrix.

### Q7. Pet roster cap (existing Sprint C ROSTER_CAP = ?)
- Anh muốn breeding tăng pet count → bumps roster cap, or breeding only works when there's space?
- **A.** Breeding requires roster space (block if at cap) ⭐
- **B.** Breeding auto-releases a pet to make space (UX trap, likely no)
- **C.** Bump cap by N

⭐ Em đề xuất A — student must release a pet to free space before breeding.

### Q8. Server validation scope
- **A.** Shop + breeding actions only (Phase 3 critical paths) ⭐
- **B.** Plus retro-fit Sprint F login claim & loot jar claim (consistent anti-cheat)
- **C.** Full event-stream validation (every event signed) — heavy

⭐ Em đề xuất A — narrow scope ship value fast. Sprint F can be retro-fitted in Phase 4 if needed.

### Q9. Server validation implementation
Step 3.5 originally specced as Vite plugin mock endpoint with HMAC-signed receipt. Phase 3 confirm:
- **A.** Vite middleware `/api/shop/validate`, `/api/breed/validate` (dev-only) + production stub (always-200 with HMAC verify only) ⭐
- **B.** Real backend endpoint (out of scope — student deployment is static SPA)
- **C.** Client-side HMAC validation only (no roundtrip)

⭐ Em đề xuất A — matches original Step 3.5 plan. Static SPA ship works fine for internal Clevai deploy.

### Q10. UI entry points
- **A.** MainMenu buttons "🛒 Cửa Hàng" + "🥚 Lai Tạo" (mirror Sprint D/F pattern) ⭐
- **B.** Dedicated routes `/shop` + `/breeding`
- **C.** Both: buttons trigger overlays (no route changes)

⭐ Em đề xuất A — overlays similar to LootJar, no route navigation. Cleaner state.

---

## 8. Asset workflow (Antigravity)

Appendix G already specs 10 breeding UI assets. Phase 3 will:
- Antigravity to deliver per Appendix G §G.2.1-G.2.10 (chamber BG, slots, compat meter, egg, sparkle, breed button states, pet inventory slot)
- Shop UI: need NEW prompts for shop chamber BG + item card frame (+ ~3 assets). Em sẽ append to `appendix_F_ui_assets_prompts.md` once anh chốt design.

**Fallback for ship-without-art:** emoji/Tailwind (Sprint F pattern). Phase 3 unblocks without art delivery.

---

## 9. Risks & Mitigations (initial)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | SaveState v9 migration breaks Sprint F v8 saves | High | Strict additive migration `if (version < 9)`, test v8→v9 chain |
| R2 | Server validation breaks dev hot-reload | Med | Vite plugin only attaches when explicit flag; production build skips |
| R3 | Breeding offspring duplicate `instanceId` collision | Low | Use `crypto.randomUUID()` (same as Sprint F) |
| R4 | Shop stock refresh fires mid-session (cross midnight) | Low | Refresh on app focus + on mount, NOT on every render |
| R5 | Breeding parent pets get deleted accidentally if Q4=C | High | Q4 default A keeps parents — explicitly tested |
| R6 | E2E test for breeding flow requires fake-timer + multi-action | Med | Use `vi.useFakeTimers` + `__GAME__.simulate.startBreeding(...)` helper |
| R7 | Item registry has no items priced >1000 stars at common tier | Low | Shop catalog defines NEW priceBattleStars field separately from drop_weight |
| R8 | Pet roster cap reached during breeding ship a confusing error | Med | Q7 default A blocks breed start, surfaces "release a pet first" UX |
| R9 | HMAC signing failure crashes purchase | High | Wrap in try/catch + fallback to non-validated path with `console.warn` (dev-only) |

---

## 10. Definition of Done (Phase 3)

- [ ] Schema v9 migration: 964 + ~30 new unit tests pass; v8→v9 chain green
- [ ] ShopEngine + PetBreedingEngine: full unit coverage
- [ ] performShopPurchase / performBreedingStart / performBreedingHatch: orchestration tests
- [ ] Server validation: Vite plugin endpoints respond; HMAC roundtrip tested
- [ ] ShopOverlay + PetBreedingOverlay: render, state binding, click flow tests
- [ ] MainMenu integration: 2 new buttons with sparkle indicators (claimable)
- [ ] E2E `phase_3_shop_pets.spec.ts`: full flow (earn stars → open shop → buy → roster grows → breed → offspring minted)
- [ ] AP §11.10 (Shop) + §11.11 (Breeding) NEW + ISP Phase 3 row + todo.md roll-up
- [ ] All gates green: lint + typecheck + verify + 974+ unit + 11 E2E

---

## 11. NEXT ACTION

**Anh review plan này + trả lời Q1-Q10 (batch một message).**

Sau khi anh chốt:
1. Em viết **full spec doc** tại `docs/superpowers/specs/2026-05-12-phase-3-shop-pets-design.md` (mirror Sprint F spec structure)
2. Anh review spec
3. Em invoke `superpowers:writing-plans` → phased plan doc
4. Anh chọn execution mode (subagent-driven hay sequential)
5. Ship.

**End of plan draft.**
