# Sprint F — Free Daily Rewards — Design Spec

**Phase:** 2.5 Prodigy-Parity (sprint cuối)
**Type:** B (SaveState v7→v8 + 1 new event family — POSUP approval)
**Author:** Claude (`claude/awesome-margulis-adb6d5`)
**Status:** Draft → đợi anh review (07/05/2026)
**Roadmap parent:** `docs/roadmap_phase2.5_prodigy_parity.md` § Sprint F
**Predecessors:** A `ed6dbee` · B `c5a78b4` · C `b79f3ac` · D `9388301` · E `0b1c02f`
**Clarifying file:** `tasks/sprint-f-clarifying.md` (Q1-Q8 all-default)

---

## 1. Why this sprint

Sprint A-E đã ship full gameplay loop (combat → maps → pets → quests → onboarding). Cái còn thiếu để chốt Phase 2.5 là **return-tomorrow loop** — Prodigy-parity audits xác định 3 cơ chế đẩy 7-day retention mạnh nhất:

1. **Daily login reward** (calendar 7 ngày) — học sinh quay lại vì hôm nay có quà mới
2. **Streak bonus** (3 / 7 / 30 ngày liên tiếp) — đẩy retention sâu hơn 1 tuần
3. **Loot Jar** (mỗi 3 trận thắng) — micro-dopamine trong session

POSUP 29/04 directive: drop premium gating — keep UI flow + VFX cho dopamine loop, mọi reward Free cho học sinh Clevai.

POSUP-approved decisions (07/05/2026, clarifying Q1-Q8 all-default):

- **Q1 — Cycle anchor:** reuse `QuestCycle.dailyAnchor`. Field rename `lastLoginIso` → `lastLoginAnchorUtc7: number`.
- **Q2 — Streak break rule:** strict UTC+7 day; miss 1 ngày → streak reset về 0 hôm sau.
- **Q3 — Streak multiplier:** stair `1.0 / 1.2 (3d) / 1.5 (7d) / 2.0 (30d)`, khớp 3 flame asset variants.
- **Q4 — Calendar 7-day:** mix items + 50 stars day 4 + rare item day 7.
- **Q5 — Battle Stars:** earn-only, badge top-right cạnh inventory icon, tooltip "Sắp ra mắt Cửa Hàng!".
- **Q6 — Battle counter:** observer engine `DailyRewardEngine` listen `EXIT_COMBAT { won: true }`.
- **Q7 — Loot Jar UI:** new `LootJarOverlay.tsx` (3-frame jar shake → pop → flyout).
- **Q8 — Login calendar surface:** auto-popup khi claimable + button "Quà Hằng Ngày" MainMenu fallback (sparkle).

---

## 2. Goals

- Ship 7-day login calendar overlay với reward composition (items + stars + day-7 rare item) + streak multiplier table.
- Ship Loot Jar mechanic: counter tăng mỗi `EXIT_COMBAT { won: true }`, ready ở mức 3, animation overlay reveal 3 prizes.
- Ship Battle Stars currency: persist per save, earned per win, displayed top-right HUD badge, no spend yet.
- Migrate SaveState v7 → v8 với 4 trường mới: `lastLoginAnchorUtc7`, `loginStreak`, `battleStars`, `lootJarBattlesSinceLast`.
- Pure-TS engines (`DailyRewardEngine`, helpers) — no React/Phaser coupling.
- Reuse `QuestCycle` UTC+7 helpers; reuse `rollDrop` cho item minting; reuse `RewardChestOverlay` label override pattern (Sprint D R4) cho login claim flow nếu cần.
- Document toàn bộ trong **AP §11.9** (NEW) + **ISP** Sprint F row table.
- Stay trong 3-day code budget roadmap đã chốt.

---

## 3. Non-goals

- **Battle Stars shop / spending** — earn-only sprint. Phase 3 ship `/shop` route consume `battleStars`.
- **Multi-day catch-up claim** — học sinh miss 3 ngày → return → chỉ claim 1 ngày, không claim retroactive 3 ngày liên tiếp. Streak reset.
- **Time-zoned per-user offset** — toàn bộ student internal Clevai dùng UTC+7 fixed (đồng bộ Sprint D).
- **Server-side anti-tampering của login claim** — relies trên client trust như Phase 1+1.5; sẽ tighten cùng Step 3.5 Phase 3.
- **Push notification "Bạn ơi, nhận quà hôm nay!"** — out of scope, Phase 3+.
- **Variable jar counter (every 5 hay every random N battles)** — fix tại 3 (roadmap).
- **Jar shake interaction (học sinh phải click jar 3 lần để mở)** — Sprint F dùng auto-shake-then-pop animation. Click-to-open Phase 3+.
- **Streak freeze item (Duolingo-style)** — Phase 3+, không scope sprint này.
- **Calendar bigger than 7 days** — fix 7-day cycle, sau ngày 7 reset về day 1 nhưng giữ `loginStreak` count.
- **Antigravity art delivery blocking ship** — fallback CSS/Tailwind acceptable (Sprint D pattern); art có thể swap sau.

---

## 4. Architecture overview

### 4.1 SaveState v7 → v8

```ts
interface SaveStateV8 extends SaveStateV7 {
  /** Anchor (epoch ms) của UTC+7 midnight ngày học sinh claim login gần nhất. 0 = chưa claim bao giờ. */
  lastLoginAnchorUtc7: number;

  /** Số ngày liên tiếp đã claim. Reset về 0 nếu miss UTC+7 day. Tăng +1 mỗi lần claim ngày kế tiếp. */
  loginStreak: number;

  /** Tổng Battle Stars earned, never decremented in Sprint F (no spend). */
  battleStars: number;

  /** Số trận thắng kể từ lần claim Loot Jar gần nhất. Ready khi >= 3, reset về 0 sau claim. */
  lootJarBattlesSinceLast: number;
}
```

Migration v7→v8 additive: old saves get `lastLoginAnchorUtc7: 0`, `loginStreak: 0`, `battleStars: 0`, `lootJarBattlesSinceLast: 0`.

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── types/
│   └── dailyReward.ts                NEW — LoginDay, StreakTier, BattleStarsAmount types
├── domain/
│   ├── DailyRewardEngine.ts          NEW — observer engine (mirror QuestEngine)
│   ├── DailyRewardEngine.test.ts
│   ├── LoginCalendar.ts              NEW — 7-day reward roll + streak helpers (uses QuestCycle.dailyAnchor)
│   ├── LoginCalendar.test.ts
│   ├── StreakMultiplier.ts           NEW — stair table
│   └── StreakMultiplier.test.ts
├── data/staticConfig/
│   ├── loginCalendar.ts              NEW — 7-day reward template (day → reward kind + amount)
│   └── loginCalendar.test.ts
├── persistence/
│   ├── SaveStateStore.ts             EDIT — v7→v8 + 4 new actions
│   └── SaveStateStore.test.ts
├── bus/
│   ├── EventBus.ts                   EDIT — +3 events (LOOT_JAR_READY, BATTLE_STARS_EARNED, LOGIN_CLAIMED)
│   └── EventBus.test.ts
├── react/
│   ├── overlays/
│   │   ├── DailyLoginCalendarOverlay.tsx     NEW — 7-day calendar UI + claim flow
│   │   ├── DailyLoginCalendarOverlay.test.tsx
│   │   ├── LootJarOverlay.tsx                NEW — 3-frame jar reveal + items flyout
│   │   └── LootJarOverlay.test.tsx
│   ├── components/
│   │   ├── BattleStarsBadge.tsx              NEW — top-right HUD currency display
│   │   └── BattleStarsBadge.test.tsx
│   ├── screens/
│   │   └── MainMenu.tsx                      EDIT — + "Quà Hằng Ngày" button + sparkle + BattleStarsBadge
│   └── shell/
│       └── AppRouter.tsx                     EDIT — mount engine + 2 overlays + auto-popup trigger
└── testing/
    └── gameTestBridge.ts             EDIT — +setLastLoginAnchor, +grantJarReady, +setBattleStars helpers
```

Layer rules (matches Sprint D):

- `domain/DailyRewardEngine.ts`, `LoginCalendar.ts`, `StreakMultiplier.ts` — pure TS, NO Phaser/React.
- `data/staticConfig/loginCalendar.ts` — pure data fixture.
- `react/overlays/*` + `components/BattleStarsBadge.tsx` — React only, NO Phaser.
- `AppRouter.tsx` mounts `DailyRewardEngine.start()` once; auto-popup logic gated bởi `useSaveState.persist.hasHydrated()` + tutorial-not-active flag.

### 4.3 `DailyRewardEngine` — observer pattern (mirror QuestEngine)

```ts
// domain/DailyRewardEngine.ts

export class DailyRewardEngine {
  private subscriptions: Array<() => void> = [];

  start() {
    this.subscriptions.push(
      eventBus.on('EXIT_COMBAT', (p) => this.handleExitCombat(p))
    );
  }

  stop() {
    this.subscriptions.forEach((off) => off());
    this.subscriptions = [];
  }

  private handleExitCombat(p: { won: boolean; combatLevel?: number }) {
    if (!p.won) return;

    const state = useSaveState.getState();

    // 1. Battle Stars earn — formula: 5 * combatLevel (default 1)
    const earned = 5 * (p.combatLevel ?? 1);
    state.addBattleStars(earned);
    eventBus.emit('BATTLE_STARS_EARNED', { amount: earned, total: state.battleStars + earned });

    // 2. Loot Jar counter
    state.incrementLootJarCounter();
    if (state.lootJarBattlesSinceLast + 1 >= LOOT_JAR_THRESHOLD) {
      eventBus.emit('LOOT_JAR_READY', { battlesSince: LOOT_JAR_THRESHOLD });
    }
  }
}

export const LOOT_JAR_THRESHOLD = 3;
```

Notes:
- Engine không tự xử lý login claim (claim là user-initiated từ overlay).
- `combatLevel` lấy từ existing `EXIT_COMBAT` payload nếu có; nếu không, default 1 (acceptable cho Phase 1 combat schema).
- Race-safe: `state.addBattleStars` + `state.incrementLootJarCounter` chạy trong cùng tick, no async gap.

### 4.4 `LoginCalendar` — claim logic + reward roll

```ts
// domain/LoginCalendar.ts
import { dailyAnchor } from './QuestCycle';
import { rollDrop } from './LevelUpReward';
import { LOGIN_CALENDAR_TEMPLATE } from '@data/staticConfig/loginCalendar';
import { streakMultiplier } from './StreakMultiplier';

export interface ClaimableLoginInfo {
  claimable: boolean;
  todayDayOfCycle: number;       // 1..7
  reward: LoginDayReward;        // template entry for today, with multiplier applied
  newStreak: number;
}

export function evaluateLoginClaimable(
  lastAnchorUtc7: number,
  loginStreak: number,
  now: number
): ClaimableLoginInfo {
  const todayAnchor = dailyAnchor(now);
  const claimable = todayAnchor > lastAnchorUtc7;

  // Day-of-cycle: position in 7-day rotation. Streak resets each Sunday cycle of own.
  // Per Q1+Q4 default: cycle position = (newStreak % 7) || 7  (so day-7 caps stay visible).
  const newStreak = computeNewStreak(lastAnchorUtc7, loginStreak, todayAnchor);
  const todayDayOfCycle = ((newStreak - 1) % 7) + 1;
  const baseReward = LOGIN_CALENDAR_TEMPLATE[todayDayOfCycle - 1];

  const mult = streakMultiplier(newStreak);
  const reward = applyMultiplier(baseReward, mult);

  return { claimable, todayDayOfCycle, reward, newStreak };
}

function computeNewStreak(
  lastAnchorUtc7: number,
  loginStreak: number,
  todayAnchor: number
): number {
  if (lastAnchorUtc7 === 0) return 1;                            // first ever
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (todayAnchor === lastAnchorUtc7 + ONE_DAY) return loginStreak + 1;  // consecutive
  return 1;                                                      // streak broken
}

export function performLoginClaim(now: number): ItemDef[] {
  const state = useSaveState.getState();
  const info = evaluateLoginClaimable(state.lastLoginAnchorUtc7, state.loginStreak, now);
  if (!info.claimable) return [];

  const items: ItemDef[] = [];
  if (info.reward.kind === 'item') {
    const item = rollDrop({ pool: filterByRarity(info.reward.rarity), level: state.level });
    if (item) {
      state.addInventoryItem(item.id, info.reward.qty);
      items.push(item);
    }
  } else if (info.reward.kind === 'stars') {
    state.addBattleStars(info.reward.amount);
  } else if (info.reward.kind === 'mixed') {
    // day-7 path: rare item + stars
    const item = rollDrop({ pool: filterByRarity('rare'), level: state.level });
    if (item) { state.addInventoryItem(item.id, 1); items.push(item); }
    state.addBattleStars(info.reward.starsBonus);
  }

  state.commitLoginClaim(dailyAnchor(now), info.newStreak);
  eventBus.emit('LOGIN_CLAIMED', {
    dayOfCycle: info.todayDayOfCycle,
    streak: info.newStreak,
    items: items.map((i) => i.id),
  });
  return items;
}
```

### 4.5 Streak multiplier (Q3 stair)

```ts
// domain/StreakMultiplier.ts

export const STREAK_TIERS = [
  { minDays: 30, multiplier: 2.0, flameVariant: 'large' as const },
  { minDays: 7,  multiplier: 1.5, flameVariant: 'medium' as const },
  { minDays: 3,  multiplier: 1.2, flameVariant: 'small' as const },
  { minDays: 1,  multiplier: 1.0, flameVariant: null as const },
];

export function streakMultiplier(streak: number): number {
  return STREAK_TIERS.find((t) => streak >= t.minDays)?.multiplier ?? 1.0;
}

export function streakFlameVariant(streak: number): 'small' | 'medium' | 'large' | null {
  return STREAK_TIERS.find((t) => streak >= t.minDays)?.flameVariant ?? null;
}
```

### 4.6 Login calendar 7-day template (Q4)

```ts
// data/staticConfig/loginCalendar.ts

export type LoginDayReward =
  | { kind: 'item'; rarity: 'common' | 'rare'; qty: number }
  | { kind: 'stars'; amount: number }
  | { kind: 'mixed'; rarity: 'rare'; starsBonus: number };

export const LOGIN_CALENDAR_TEMPLATE: ReadonlyArray<LoginDayReward> = [
  { kind: 'item',  rarity: 'common', qty: 1 },        // Day 1
  { kind: 'item',  rarity: 'common', qty: 1 },        // Day 2
  { kind: 'item',  rarity: 'common', qty: 1 },        // Day 3 (3-day flame unlocks)
  { kind: 'stars', amount: 50 },                      // Day 4
  { kind: 'item',  rarity: 'common', qty: 1 },        // Day 5
  { kind: 'item',  rarity: 'common', qty: 1 },        // Day 6
  { kind: 'mixed', rarity: 'rare', starsBonus: 100 }, // Day 7 (boss-of-week)
];

export function applyMultiplier(reward: LoginDayReward, mult: number): LoginDayReward {
  if (reward.kind === 'stars') {
    return { ...reward, amount: Math.round(reward.amount * mult) };
  }
  if (reward.kind === 'mixed') {
    return { ...reward, starsBonus: Math.round(reward.starsBonus * mult) };
  }
  if (reward.kind === 'item') {
    return { ...reward, qty: Math.max(1, Math.round(reward.qty * mult)) };
  }
  return reward;
}
```

### 4.7 EventBus delta — 3 new events

| Event | Payload | Direction |
|---|---|---|
| `BATTLE_STARS_EARNED` | `{ amount: number; total: number }` | engine → bus → BattleStarsBadge tween |
| `LOOT_JAR_READY` | `{ battlesSince: number }` | engine → bus → LootJarOverlay |
| `LOGIN_CLAIMED` | `{ dayOfCycle: 1..7; streak: number; items: string[] }` | overlay → bus → toast / Sentry metric |

Existing event signatures Sprint A-E unchanged.

### 4.8 SaveState v8 actions

```ts
addBattleStars(amount): void
  // Adds to battleStars. amount must be > 0. No-op if <= 0.

incrementLootJarCounter(): void
  // lootJarBattlesSinceLast += 1.

claimLootJar(): ItemDef[] | null
  // Pre: lootJarBattlesSinceLast >= LOOT_JAR_THRESHOLD.
  // Mints 3 items via rollDrop (common pool), pushes to inventory, resets counter to 0.
  // Returns array of 3 ItemDef. Returns null if not ready.

commitLoginClaim(anchorUtc7, newStreak): void
  // Sets lastLoginAnchorUtc7 + loginStreak atomically. Called by performLoginClaim.

isLoginClaimable(now): boolean
  // dailyAnchor(now) > lastLoginAnchorUtc7

isLootJarReady(): boolean
  // lootJarBattlesSinceLast >= LOOT_JAR_THRESHOLD
```

### 4.9 React surface

#### 4.9.1 `BattleStarsBadge.tsx` — HUD top-right

Mounts in `MainMenu` header (and conceptually in CombatScene HUD overlay later — Sprint F scope chỉ MainMenu).

```
┌──────────────┐
│ ⭐ 175       │   ← tooltip on hover: "Battle Stars — Sắp ra mắt Cửa Hàng!"
└──────────────┘
```

Subscribes `BATTLE_STARS_EARNED` → tween `+5` floater + count-up animation. Reuses Sprint E's `useSaveState((s) => s.battleStars)` selector.

#### 4.9.2 `DailyLoginCalendarOverlay.tsx` — auto-popup + button-trigger

```
+--------------------------------------------------+
|  Quà Hằng Ngày — 🔥🔥 Streak 7 ngày      [X]     |
+--------------------------------------------------+
|  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                |
|  │ ✓ 1 │ │ ✓ 2 │ │ ✓ 3 │ │ 4   │  ← today (glow) |
|  │ 🎁  │ │ 🎁  │ │ 🎁  │ │ 50⭐│                 |
|  └─────┘ └─────┘ └─────┘ └─────┘                |
|  ┌─────┐ ┌─────┐ ┌─────┐                       |
|  │ 5   │ │ 6   │ │ 7 ★ │                       |
|  │ 🎁  │ │ 🎁  │ │BOSS │                       |
|  └─────┘ └─────┘ └─────┘                       |
|        [ Nhận Quà Ngày 4 (×1.2) ]               |
+--------------------------------------------------+
```

Per-cell states: `claimed` (✓ green check) / `today` (gold glow + claim button visible) / `locked` (grey). Streak flame icon next to title shifts variant per `streakFlameVariant()`.

Click "Nhận Quà" → `performLoginClaim(Date.now())` → minted items go into inventory + `LOGIN_CLAIMED` event → cell flips to claimed → auto-close overlay sau 1.5s.

Auto-popup logic (in `AppRouter.tsx`):
```ts
useEffect(() => {
  if (!useSaveState.persist.hasHydrated()) return;
  if (isTutorialActive()) return;                              // Sprint E onboarding guard
  if (useSaveState.getState().isLoginClaimable(Date.now())) {
    setShowLoginCalendar(true);
  }
}, [hydrated, tutorialActive]);
```

#### 4.9.3 `LootJarOverlay.tsx` — 3-frame jar reveal

```
┌──────────────────────────────────┐
│  🏺 Bình Báu                     │
│                                  │
│   Frame 1: jar idle (1.0s)       │
│   Frame 2: jar shake (0.5s)      │
│   Frame 3: jar pop + 3 items     │
│           flyout (1.0s)          │
│                                  │
│  [item] [item] [item]            │
│                                  │
│        [ Đóng ]                  │
└──────────────────────────────────┘
```

Subscribes `LOOT_JAR_READY`. On open → `state.claimLootJar()` mints 3 items synchronously, animation phases drive UI:
- t=0: idle frame
- t=1000ms: shake frame (CSS keyframe `translateX` jitter)
- t=1500ms: pop frame + 3 items reveal with stagger 100ms each
- t=2500ms: "Đóng" button enabled

#### 4.9.4 `MainMenu.tsx` edits

- Add new button "Quà Hằng Ngày" (placed after "Nhiệm vụ" Sprint D button)
  - Opens `<DailyLoginCalendarOverlay />` (button-fallback path Q8)
  - Sparkle indicator gold dot top-right when `useSaveState((s) => s.isLoginClaimable(Date.now()))`
- Add `<BattleStarsBadge />` in MainMenu header row (right side cạnh inventory icon)

#### 4.9.5 `AppRouter.tsx` wiring

```tsx
useEffect(() => {
  rewardEngineRef.current = new DailyRewardEngine();
  rewardEngineRef.current.start();
  return () => rewardEngineRef.current?.stop();
}, []);

// Auto-popup login calendar (Q8 path)
useEffect(() => {
  if (!hasHydrated || isTutorialActive) return;
  if (useSaveState.getState().isLoginClaimable(Date.now())) {
    setShowLoginCalendar(true);
  }
}, [hasHydrated, isTutorialActive]);

return (
  <BrowserRouter>
    {/* … existing routes … */}
    <RewardChestOverlay />
    <PetRescueOverlay />
    <LockedIslandTooltip />
    <QuestProgressToast />
    <DailyLoginCalendarOverlay open={showLoginCalendar} onClose={() => setShowLoginCalendar(false)} />
    <LootJarOverlay />                                             {/* listens LOOT_JAR_READY internally */}
  </BrowserRouter>
);
```

---

## 5. Acceptance criteria

1. **Schema v8:** `lastLoginAnchorUtc7`, `loginStreak`, `battleStars`, `lootJarBattlesSinceLast` exist; v7 saves migrate cleanly với defaults 0.
2. **Login claim:** first-ever boot → `isLoginClaimable === true` → claim → streak=1, lastAnchor=todayAnchor; second-call same day → claimable=false.
3. **Streak consecutive:** day N+1 (todayAnchor = lastAnchor + ONE_DAY) → streak += 1.
4. **Streak break:** miss 1 ngày (todayAnchor > lastAnchor + ONE_DAY) → streak resets to 1.
5. **Multiplier table:** streak 1=×1.0, 3=×1.2, 7=×1.5, 30=×2.0; streak 2=×1.0; streak 6=×1.2; streak 29=×1.5; streak 100=×2.0.
6. **Day-7 reward:** day-of-cycle 7 → mints rare item + stars bonus (×multiplier).
7. **Battle Stars earn:** simulating `EXIT_COMBAT { won: true, combatLevel: 3 }` → `battleStars += 15` + `BATTLE_STARS_EARNED` emitted.
8. **No earn on loss:** `EXIT_COMBAT { won: false }` → no stars, no jar increment.
9. **Loot Jar threshold:** 3 wins → `lootJarBattlesSinceLast === 3` + `LOOT_JAR_READY` emitted on the 3rd.
10. **Loot Jar claim:** `claimLootJar()` mints 3 common items, resets counter to 0, returns `ItemDef[]` length 3.
11. **Loot Jar dedup:** second `claimLootJar()` immediately after first returns null (counter < 3).
12. **Auto-popup gating:** popup không mở nếu `isTutorialActive` (Sprint E guard) hoặc `!hasHydrated`.
13. **Sparkle indicator:** MainMenu "Quà Hằng Ngày" button hiện gold dot khi `isLoginClaimable`.
14. **Battle Stars badge:** số live-update khi `BATTLE_STARS_EARNED` fires; tooltip hiển thị "Sắp ra mắt Cửa Hàng!".
15. **LootJarOverlay timing:** idle 1s → shake 0.5s → pop 1s → "Đóng" enabled. Total ≈ 2.5s.
16. **Type B gates:** lint + typecheck + verify + full unit suite green. New tests:
    - `domain/DailyRewardEngine.test.ts` — earn formula, jar threshold, no-earn-on-loss, lifecycle
    - `domain/LoginCalendar.test.ts` — first-ever, consecutive, break, claim, day-7
    - `domain/StreakMultiplier.test.ts` — all stair edges + flame variant
    - `data/staticConfig/loginCalendar.test.ts` — 7 entries, day-4 stars, day-7 mixed, multiplier roundtrip
    - `persistence/SaveStateStore.test.ts` — v7→v8 migration; 4 new actions
    - `bus/EventBus.test.ts` — 3 new events typed
    - `react/overlays/DailyLoginCalendarOverlay.test.tsx` — 7-cell render, claim flow, streak display, auto-close
    - `react/overlays/LootJarOverlay.test.tsx` — 3-frame phases, claim flow, items render
    - `react/components/BattleStarsBadge.test.tsx` — count-up tween, tooltip
    - `react/screens/MainMenu.test.tsx` — sparkle indicator state, button mount, badge mount
    - E2E `app/tests/e2e/sprint_f_rewards.spec.ts` — fresh save → auto-popup login → claim → 3 wins → jar overlay → claim → inventory has items + battleStars > 0

---

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Auto-popup login overlay clashes với Sprint E tutorial first-launch | High | High | `AppRouter` checks `isTutorialActive()` BEFORE showing login. Test rehydrate-mid-tutorial scenario. |
| R2 | Engine fires before SaveState rehydrates → battle stars lost | Med | High | `engine.start()` gated on `useSaveState.persist.hasHydrated()` (mirror Sprint D R1). |
| R3 | Streak break edge case at cross-day-boundary mid-session | Low | Med | `claimableInfo.newStreak` recomputed at claim time using `Date.now()` — no caching across midnight. |
| R4 | Multiplier rounding causes 0-qty items (e.g. 1 × 1.0 with floor) | Low | Med | `applyMultiplier` uses `Math.max(1, Math.round(...))` for item.qty; tested. |
| R5 | LootJarOverlay open while another overlay (chest / pet rescue) showing | Med | Low | LootJarOverlay z-index = 45 (between toast 40 and chest 50); LOOT_JAR_READY event queue waits if another overlay active (state machine simple flag). |
| R6 | Battle Stars badge count-up tween racing with SaveState selector update | Low | Low | Badge consumes `useSaveState((s) => s.battleStars)` as truth + listens `BATTLE_STARS_EARNED` only for floater visual. State drives display value. |
| R7 | Day-7 reward mints rare item but ITEM_REGISTRY has no rare → returns null | Low | Med | `performLoginClaim` falls back to common pool + still grants stars bonus. Logs `console.warn`. Test with empty rare pool. |
| R8 | 30-day streak requires testing — slow to manually verify | Low | Low | Test bridge `setLoginStreak(streak)` + `setLastLoginAnchor(anchor)` exposed via `__GAME__.simulate`. E2E asserts multiplier at boundary 29/30. |
| R9 | Antigravity art chưa deliver → ship CSS/Tailwind fallback | High | Low | Per project rule "fallback CSS ok". Daily calendar dùng emoji 🎁⭐🔥 + Tailwind gradient. Jar dùng emoji 🏺 + CSS shake keyframe. Badge dùng ⭐ emoji. Document trong §10. |
| R10 | Battle Stars never spent → student frustration "lưu để làm gì" | Med | Low | Tooltip "Sắp ra mắt Cửa Hàng!" + Sentry metric track total earned for Phase 3 tuning. |

---

## 7. AP / ISP impact

### 7.1 AP delta (additive, no version bump)

Append "Sprint F — Delta" section to AP v1.1:

- **§3.1** — add `domain/DailyRewardEngine.ts`, `domain/LoginCalendar.ts`, `domain/StreakMultiplier.ts`, `data/staticConfig/loginCalendar.ts`, `react/overlays/DailyLoginCalendarOverlay.tsx`, `react/overlays/LootJarOverlay.tsx`, `react/components/BattleStarsBadge.tsx`, `types/dailyReward.ts`.
- **§11.9 — Daily Reward schema (NEW):** Document v8 fields (`lastLoginAnchorUtc7`, `loginStreak`, `battleStars`, `lootJarBattlesSinceLast`), 7-day cycle template, streak break rule (strict UTC+7 day), multiplier stair, jar threshold = 3, earn formula `5 * combatLevel`.
- **§13** — add v8 row: 4 new fields. Migration v7→v8 additive defaults 0.
- **§14** — append 3 events: `BATTLE_STARS_EARNED`, `LOOT_JAR_READY`, `LOGIN_CLAIMED`.

### 7.2 ISP delta — Sprint F row table

| # | Step | Status |
|---|---|---|
| S-F.0 | Preflight (rebase, baseline tests 874) | ⏳ |
| S-F.1 | `types/dailyReward.ts` (LoginDayReward, StreakTier types) | ⏳ |
| S-F.2 | `domain/StreakMultiplier.ts` + tests (stair table) | ⏳ |
| S-F.3 | `data/staticConfig/loginCalendar.ts` + tests (7-day template + multiplier) | ⏳ |
| S-F.4 | `domain/LoginCalendar.ts` (evaluate + claim helpers) + tests | ⏳ |
| S-F.5 | `domain/DailyRewardEngine.ts` (EXIT_COMBAT observer) + tests | ⏳ |
| S-F.6 | SaveState v7→v8 migration + 4 actions + tests | ⏳ |
| S-F.7 | EventBus +3 events typed + tests | ⏳ |
| S-F.8 | `BattleStarsBadge.tsx` + tests | ⏳ |
| S-F.9 | `DailyLoginCalendarOverlay.tsx` (7-cell render + claim flow) + tests | ⏳ |
| S-F.10 | `LootJarOverlay.tsx` (3-frame anim + claim) + tests | ⏳ |
| S-F.11 | `MainMenu.tsx` edits (button + sparkle + badge mount) | ⏳ |
| S-F.12 | `AppRouter.tsx` engine mount + auto-popup gating + 2 overlays mount | ⏳ |
| S-F.13 | E2E `sprint_f_rewards.spec.ts` (auto-popup → claim → 3 wins → jar → claim) | ⏳ |
| S-F.14 | AP §11.9 + §13 + §14 delta + ISP roll-up + tasks/todo.md | ⏳ |

15 steps. Comparable to Sprint D (15) — touches 3 sub-features but shares cycle helpers + observer pattern with Sprint D, so per-step scope nhỏ.

### 7.3 tasks/todo.md update

Sprint F row trong Phase 2.5 sprints table chuyển từ `⏳ pending` → `✅ shipped` với squash commit SHA + delta test count. Phase 2.5 progress: **6/6 sprints done — Phase 2.5 COMPLETE**.

---

## 8. Test strategy

### 8.1 Unit (Vitest) — target ≥ 70 new tests

Distribution:
- DailyRewardEngine: ~10 (earn formula, threshold, no-loss, lifecycle, no-double-fire)
- LoginCalendar: ~12 (first-ever, consecutive, break, claim happy/null, day-1/4/7)
- StreakMultiplier: ~6 (all stair edges, flame variant, off-by-one)
- loginCalendar.ts (data): ~6 (7 entries, types, multiplier roundtrip, day-7 mixed)
- SaveStateStore (v8): ~10 (migration, 4 actions, isLoginClaimable, isLootJarReady)
- EventBus: ~3 (3 new events typed)
- DailyLoginCalendarOverlay: ~8 (7-cell render, today highlight, streak flame, claim, auto-close)
- LootJarOverlay: ~6 (idle/shake/pop phases, items render, close, no-double-claim)
- BattleStarsBadge: ~4 (count-up, tooltip, no-render-on-zero variant, live-update)
- MainMenu: ~3 (button mount, sparkle on/off, badge mount)
- gameTestBridge: ~2 (3 new helpers)

### 8.2 E2E (Playwright)

`app/tests/e2e/sprint_f_rewards.spec.ts`:

```
test('sprint F: fresh boot → auto-popup login → claim → 3 wins → jar overlay → claim', ...)
```

Steps:
1. seed save với `lastLoginAnchorUtc7=0`, `loginStreak=0`, `battleStars=0`, `lootJarBattlesSinceLast=0`, `tutorial.completed=true` (skip onboarding)
2. boot → expect `[data-testid="daily-login-overlay"]` visible
3. click "Nhận Quà" → expect inventory has +1 item, streak=1
4. close overlay → simulate 3 wins via `__GAME__.simulate.killBoss()` (or beat-mob × 3)
5. expect `__GAME__.getSaveState().battleStars > 0` AND `lootJarBattlesSinceLast >= 3`
6. expect `[data-testid="loot-jar-overlay"]` auto-appears (LOOT_JAR_READY listener)
7. wait 2.5s → click "Đóng" → expect inventory has +3 items more (total +4)
8. expect `lootJarBattlesSinceLast === 0` (reset)

E2E timeout 60s. Sequential `--workers=1` (Sprint B advice).

### 8.3 Visual UAT (Antigravity)

- Fresh boot ngày đầu → tutorial xong → login overlay popup auto, học sinh thấy "Streak 1 ngày" + 7 cell với cell-1 glow
- Click Nhận Quà → cell-1 flip to ✓ → overlay tự đóng 1.5s sau
- Quay vào MainMenu → BattleStars badge hiện ⭐0 (chưa có win)
- Beat 3 monsters → jar overlay popup auto với jar shake → pop animation → 3 items flyout
- Click Đóng → inventory có 4 items mới (1 login + 3 jar)
- Logout login lại sau 25h → streak +1 → multiplier ×1 vẫn (cần streak≥3)
- Streak 3 ngày → flame nhỏ hiện cạnh title + multiplier ×1.2 áp lên reward
- Streak 7 ngày → flame medium + ×1.5 + day-7 cell glow rare item

---

## 9. Type classification

**Type B** — Entity Schema delta (SaveState v7→v8 với 4 fields). Event delta là 3 NEW events nhưng pure additive observer (mirror Sprint D `QUEST_PROGRESS`), không redesign existing protocol → KHÔNG đẩy lên Type C.

CI label gate: `type-B`.

POSUP approval needed:
- §11.9 schema (4 new fields)
- LOOT_JAR_THRESHOLD = 3 (gameplay-tunable constant)
- Earn formula `5 * combatLevel` (game balance)
- Streak multiplier table (game balance)

---

## 10. Asset spec — Antigravity

Sprint F có thể ship hoàn toàn với CSS/Tailwind/emoji fallback. Antigravity ships polish sau (per Sprint D pattern).

### 10.1 Daily calendar UI plate — 1 file (optional)

- **Path:** `app/public/assets/dailyrewards/calendar_panel_800x500.png`
- **Spec:** 800×500 PNG-32, watercolor parchment background giống quest banner Sprint D + 7 day-cell slots, ngày 7 highlighted gold star.
- **Antigravity prompt:**
  > Daily login reward calendar UI background, 800×500 PNG-32, warm parchment with 7 day cells in a 4+3 grid layout, day 7 cell has gold star "BOSS" badge. Style: flat 2D vector art, flash-game finish, clean 2px outline, 3-tone cel shading, palette warm-#D4691E + accent-#FFD700.

### 10.2 Loot Jar 3-frame anim — 3 files

- **Paths:**
  - `app/public/assets/dailyrewards/jar_idle_256x256.png`
  - `app/public/assets/dailyrewards/jar_shake_256x256.png`
  - `app/public/assets/dailyrewards/jar_pop_256x256.png`
- **Spec:** 256×256 PNG-32 RGBA, transparent background, ceramic treasure jar. Idle = closed sealed. Shake = jar tilted left + crack lines glowing. Pop = jar lid blown off, 3 sparkle items emerging từ mouth.
- **Antigravity prompt:**
  > 3-frame animation of a treasure jar: (1) idle sealed ceramic jar with golden trim; (2) jar shaking tilted left with glowing crack lines; (3) jar lid blown off, magical sparkles erupting from mouth. Each frame 256×256 PNG-32 transparent background. Style: flat 2D vector art, flash-game finish, clean 2px outline, palette warm-#D4691E + accent-#FFD700.

### 10.3 Battle Stars icon + badge — 2 files

- **Paths:**
  - `app/public/assets/dailyrewards/battle_star_icon_64x64.png`
  - `app/public/assets/dailyrewards/battle_star_badge_120x40.png`
- **Spec:** 64×64 single star sprite + 120×40 horizontal badge plate "⭐ 999".
- **Antigravity prompt:**
  > (1) 5-pointed gold star with cool-blue inner glow, 64×64 PNG-32 transparent. (2) Horizontal badge plate 120×40, dark navy background with gold star icon left + space for number. Style: flat 2D vector art, clean 2px outline, palette warm-#D4691E + cool-#3399FF + accent-#FFD700.

### 10.4 Streak flame icons — 3 files

- **Paths:**
  - `app/public/assets/dailyrewards/flame_small_48x48.png` (3-day)
  - `app/public/assets/dailyrewards/flame_medium_64x64.png` (7-day)
  - `app/public/assets/dailyrewards/flame_large_96x96.png` (30-day)
- **Antigravity prompt:**
  > 3 streak flame icons in escalating sizes: small/medium/large, single warm-orange flame with cool-blue inner core, transparent backgrounds. Style: flat 2D vector art, clean 2px outline.

### 10.5 Fallback for missing assets

If Antigravity chưa deliver khi Sprint F ships:
- Calendar: Tailwind gradient parchment + emoji 🎁/⭐/🏆 per day
- Jar: emoji 🏺 với CSS keyframe `shake` (`translateX(±4px)` 0.5s) + emoji 💥 frame pop
- Badge: emoji ⭐ + Tailwind dark bg
- Flame: emoji 🔥 với scale `0.8 / 1.0 / 1.4` per tier

---

## 11. Open questions baked as defaults (anh override khi review spec)

None — 8 clarifying questions đã chốt all-default. Spec ready cho plan generation.

---

**End Sprint F design spec.**

Next step: anh review spec → user approval → invoke `superpowers:writing-plans` → `docs/superpowers/plans/2026-05-07-sprint-f-rewards-plan.md` (15-step phased plan với TDD red→green→commit pattern) → invoke `superpowers:subagent-driven-development` → ship Sprint F.
