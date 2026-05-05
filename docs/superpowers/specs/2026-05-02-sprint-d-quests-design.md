# Sprint D — Quests & Goals Panel — Design Spec

**Phase:** 2.5 Prodigy-Parity
**Type:** B (Entity Schema delta + SaveState v5→v6 — POSUP approval)
**Author:** Claude (Game_SS3 worktree `claude/sprint-d-quests`)
**Status:** Draft → awaiting POSUP review (02/05/2026)
**Roadmap parent:** `docs/roadmap_phase2.5_prodigy_parity.md` (§ Sprint D)
**Predecessors:** Sprint A (`ed6dbee`), Sprint B (`c5a78b4`), Sprint C (`b79f3ac`)

---

## 1. Why this sprint

Sprints A-C delivered the core gameplay loop (combat → maps → pets) but
the student has no **directed goals** beyond "kill monsters and grind".
Reference Prodigy-parity audits identify **quest system** as the
strongest 7-day retention driver: students return tomorrow because a
daily quest is waiting, weekly quests anchor a longer rhythm, main
story milestones celebrate progression peaks.

Sprint D ships the **declarative quest engine + 8-quest catalog + Quests
Panel UI** on top of the existing event surface (Sprints A-C events are
re-used as-is; no new emitters required).

POSUP-approved decisions (02/05/2026, brainstorming Q1-Q5):

- **Q1 — QuestEngine architecture:** **centralized listener pattern.**
  `domain/QuestEngine.ts` subscribes to all existing `GameEvent`s
  and translates matching events into `QUEST_PROGRESS { questId, delta }`
  emits. CombatScene / QuizFactory / etc. stay unchanged.
- **Q2 — Quest catalog (8 quests):**
  - **Daily** (3): `daily-combat-3`, `daily-quiz-5`, `daily-explore-1`
  - **Weekly** (2): `weekly-combat-20`, `weekly-pet-1`
  - **Main story** (3): `main-level-5`, `main-boss-forest`, `main-pets-3`
- **Q3a — Refresh timezone:** Vietnam UTC+7 midnight. Daily resets at
  17:00 UTC; weekly resets at 17:00 UTC every Sunday.
- **Q3b — Visible count:** show all 8 quests (no random pool).
- **Q4 — Reward composition:** items only via `rollDrop` (Sprint A
  pattern). Daily=common, weekly=rare, main=epic. No EXP bonus, no pet
  offer.
- **Q5a — Access:** `/quests` route + MainMenu button "Nhiệm vụ".
  Consistent with `/inventory` / `/guild` Phase 1 patterns.
- **Q5b — Progress notification:** toast (top-right, 2s) on every
  quest progress increment + sparkle indicator on the MainMenu
  "Nhiệm vụ" button when any quest is 100% ready to claim.
- **Q5c — Claim flow:** manual — student opens `/quests`, taps
  "Nhận thưởng" on a 100% quest → `RewardChestOverlay` opens (reuse
  Step 22.14 component) → click "Đóng" → quest moves to "claimed"
  state. No auto-claim.

## 2. Goals

- Ship the 8-quest catalog end-to-end: progress tracking, refresh,
  notification, claim, persistence.
- Add `QuestEngine` pure-TS module that translates existing events
  to `QUEST_PROGRESS` without any scene/quiz/combat code changes.
- Migrate SaveState v5 → v6 with three new fields: `questProgress`,
  `claimedRewards`, `questCycleAnchors`.
- Mount `<QuestsPanel />` at `/quests` with daily/weekly/main grouping,
  per-quest progress bar, claim button, and reward chest reveal.
- Toast notification + MainMenu sparkle indicator (no new assets —
  reuse `LockedIslandTooltip` + Tailwind classes).
- Reward minting via existing `rollDrop` against `ITEM_REGISTRY` filtered
  by tier rarity.
- All quest features documented in **AP §11.7** (new) and **ISP** Sprint
  D row table per project rule "every feature/step must land in AP+ISP".
- Stay within the 2-day code budget the roadmap allotted.

## 3. Non-goals

- **Random quest pool / weighted picker** — Sprint D ships all 8 quests
  fixed-visible. Phase 3+ will introduce a pool when catalog grows beyond
  ~15 entries.
- **Multi-step / branching narrative quests** ("kill boss THEN rescue 3
  pets in same session") — engine ships counter-only this sprint.
- **EXP / currency rewards** — items only this sprint.
- **Pet offer as quest reward** — would intersect Sprint C rescue
  semantics confusingly.
- **Quest-suggested NPC dialogue** ("Sóc says: try this quest!") —
  Phase 3+ tutorial polish.
- **Quest sharing / gifting between accounts** — single-player only.
- **Server-side quest validation** — relies on client-side trust like
  rest of Phase 1+1.5; tighten in Phase 3 alongside Step 3.5.
- **Quest history / archive of past completed dailies** — out of scope;
  `claimedRewards` is forward-looking dedup only.
- **Quest editor UI for ops/POSUP** — catalog stays in `data/staticConfig/quests.ts`
  (code change to add quests).

## 4. Architecture overview

### 4.1 SaveState v5 → v6

```ts
interface SaveStateV6 extends SaveStateV5 {
  questProgress: Record<QuestId, number>;     // current count per quest
  claimedRewards: QuestId[];                  // dedupe — quest in this list cannot be re-claimed
  questCycleAnchors: {
    dailyEpochUtc7: number;                   // Date.now() at last UTC+7 midnight when dailies refreshed
    weeklyEpochUtc7: number;                  // Date.now() at last UTC+7 Sunday-midnight
  };
}

type QuestId = string;                        // e.g. 'daily-combat-3', 'main-level-5'
type QuestTier = 'daily' | 'weekly' | 'main';
type QuestRewardTier = 'common' | 'rare' | 'epic';
```

Migration v5→v6: additive — old saves get `questProgress: {}`,
`claimedRewards: []`, `questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 }`.
Anchors `=0` means "never refreshed" — first app start triggers the
refresh logic which resets to current cycle.

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── types/
│   └── quest.ts                       NEW — QuestId, QuestTier, QuestDef, QuestRewardTier
├── domain/
│   ├── QuestEngine.ts                 NEW — event→progress translator (pure TS)
│   ├── QuestEngine.test.ts
│   ├── QuestCycle.ts                  NEW — UTC+7 midnight + Sunday helpers
│   ├── QuestCycle.test.ts
│   ├── QuestReward.ts                 NEW — rollDrop wrapper for tier→rarity mapping
│   └── QuestReward.test.ts
├── data/staticConfig/
│   ├── quests.ts                      NEW — 8-quest catalog
│   └── quests.test.ts
├── persistence/
│   ├── SaveStateStore.ts              EDIT — v6 schema + 4 new actions
│   └── SaveStateStore.test.ts
├── bus/
│   ├── EventBus.ts                    EDIT — +1 event (QUEST_PROGRESS)
│   └── EventBus.test.ts
├── react/
│   ├── overlays/
│   │   ├── QuestProgressToast.tsx     NEW — top-right ephemeral toast
│   │   └── QuestProgressToast.test.tsx
│   ├── screens/
│   │   ├── QuestsPanel.tsx            NEW — /quests route
│   │   ├── QuestsPanel.test.tsx
│   │   └── MainMenu.tsx               EDIT — add "Nhiệm vụ" button + sparkle indicator
│   └── shell/
│       └── AppRouter.tsx              EDIT — register /quests route + mount QuestEngine + toast
└── testing/
    └── gameTestBridge.ts              EDIT — +setQuestCycleAnchors, +incrementQuest helpers
```

Layer rules:

- `domain/QuestEngine.ts`, `QuestCycle.ts`, `QuestReward.ts` — pure TS,
  NO Phaser / React / DOM imports.
- `data/staticConfig/quests.ts` — pure data fixture.
- `react/screens/QuestsPanel.tsx` and `react/overlays/QuestProgressToast.tsx`
  — React only, NO Phaser imports.
- `react/shell/AppRouter.tsx` mounts `QuestEngine.start()` once at app
  init and `stop()` on unmount (single subscription lifecycle).

### 4.3 QuestEngine — declarative event-to-progress translator

The catalog declares each quest's `match` predicate against a typed
`GameEvent`. Engine subscribes once per source-event-type, runs all
quests' matchers, emits `QUEST_PROGRESS` for hits.

```ts
// types/quest.ts

export interface QuestDef {
  readonly id: QuestId;
  readonly tier: QuestTier;
  readonly displayNameVi: string;
  readonly description: string;          // e.g. "Thắng 3 trận" — rendered with progress
  readonly target: number;               // count goal (3 for daily-combat-3, 5 for daily-quiz-5)
  readonly rewardTier: QuestRewardTier;  // common / rare / epic — drives rollDrop pool
  readonly source: GameEventType;        // 'EXIT_COMBAT' | 'QUIZ_RESULT' | ...
  readonly match: (payload: never) => number; // returns increment delta (0 = no match)
}

// example:
{
  id: 'daily-combat-3',
  tier: 'daily',
  displayNameVi: 'Thắng 3 trận',
  description: 'Đánh bại 3 quái bất kỳ',
  target: 3,
  rewardTier: 'common',
  source: 'EXIT_COMBAT',
  match: (p: { won: boolean }) => (p.won ? 1 : 0),
}
```

`match` returns the delta to add. Returning 0 means "this event doesn't
contribute to this quest" (e.g., `EXIT_COMBAT { won: false }` doesn't
count toward `daily-combat-3`).

Engine wiring:

```ts
// domain/QuestEngine.ts

export class QuestEngine {
  private subscriptions: Array<() => void> = [];

  start() {
    const sources = new Set(QUESTS.map((q) => q.source));
    for (const source of sources) {
      const off = eventBus.on(source as never, (payload: unknown) => {
        this.handleEvent(source, payload);
      });
      this.subscriptions.push(off);
    }
  }

  stop() {
    this.subscriptions.forEach((off) => off());
    this.subscriptions = [];
  }

  private handleEvent(source: GameEventType, payload: unknown) {
    const matchingQuests = QUESTS.filter((q) => q.source === source);
    for (const quest of matchingQuests) {
      // Skip quests already at target or already claimed
      const currentProgress = useSaveState.getState().questProgress[quest.id] ?? 0;
      const claimed = useSaveState.getState().claimedRewards.includes(quest.id);
      if (claimed || currentProgress >= quest.target) continue;

      const delta = quest.match(payload as never);
      if (delta <= 0) continue;

      useSaveState.getState().incrementQuestProgress(quest.id, delta);
      eventBus.emit('QUEST_PROGRESS', { questId: quest.id, delta });
    }
  }
}
```

Design notes:

- Engine is a class with explicit `start()`/`stop()` lifecycle so tests
  can construct/teardown without globals.
- `payload as never` cast is contained inside the engine — quest
  authors define `match` against the correct payload shape; TS narrows
  via the `source` field.
- The progress-and-emit happens atomically in `handleEvent`; `incrementQuestProgress`
  is a SaveState action (Task 5) that does the deduped persist + clamp
  to `target`.

### 4.4 Quest cycle (UTC+7 midnight refresh)

`domain/QuestCycle.ts`:

```ts
export const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Returns the timestamp of the most recent UTC+7 midnight at-or-before `now`. */
export function dailyAnchor(now: number): number {
  const local = now + VIETNAM_UTC_OFFSET_MS;
  const localMidnight = local - (local % (24 * 60 * 60 * 1000));
  return localMidnight - VIETNAM_UTC_OFFSET_MS;
}

/** Returns the timestamp of the most recent UTC+7 Sunday-midnight at-or-before `now`. */
export function weeklyAnchor(now: number): number {
  const local = now + VIETNAM_UTC_OFFSET_MS;
  const localMidnight = local - (local % (24 * 60 * 60 * 1000));
  // Vietnam UTC+7: Sunday is day 0 (JS Date convention). Walk back to most recent Sunday.
  const dayOfWeek = new Date(localMidnight).getUTCDay();
  const sundayLocalMidnight = localMidnight - dayOfWeek * 24 * 60 * 60 * 1000;
  return sundayLocalMidnight - VIETNAM_UTC_OFFSET_MS;
}

/** Refresh check: if the stored anchor is older than the current anchor, the cycle rolled. */
export function needsRefresh(anchor: number, now: number, kind: 'daily' | 'weekly'): boolean {
  const fn = kind === 'daily' ? dailyAnchor : weeklyAnchor;
  return fn(now) > anchor;
}
```

Refresh trigger: `AppRouter` mounts a `useEffect` that runs
`refreshCyclesIfNeeded()` once on app init, and additionally on
`focus` events (so a long-suspended tab catches up). The action does:

```ts
refreshCyclesIfNeeded() {
  const now = Date.now();
  const { dailyEpochUtc7, weeklyEpochUtc7 } = state.questCycleAnchors;

  if (needsRefresh(dailyEpochUtc7, now, 'daily')) {
    // Reset daily quests' progress and claim status; keep weekly+main untouched.
    for (const q of QUESTS.filter((q) => q.tier === 'daily')) {
      delete state.questProgress[q.id];
      state.claimedRewards = state.claimedRewards.filter((id) => id !== q.id);
    }
    state.questCycleAnchors.dailyEpochUtc7 = dailyAnchor(now);
  }

  if (needsRefresh(weeklyEpochUtc7, now, 'weekly')) {
    // Reset weekly quests likewise.
    for (const q of QUESTS.filter((q) => q.tier === 'weekly')) {
      delete state.questProgress[q.id];
      state.claimedRewards = state.claimedRewards.filter((id) => id !== q.id);
    }
    state.questCycleAnchors.weeklyEpochUtc7 = weeklyAnchor(now);
  }
}
```

**Main-story quests never reset.** Once claimed, they stay claimed forever.

### 4.5 Reward minting (`QuestReward`)

`domain/QuestReward.ts` is a thin wrapper over Sprint A's `rollDrop`
that maps quest reward tier → rarity filter:

```ts
import { rollDrop } from './LevelUpReward';
import { ITEM_REGISTRY, type ItemDef } from '@data/staticConfig/items';
import type { QuestRewardTier } from '@/types/quest';

const RARITY_FILTER: Readonly<Record<QuestRewardTier, ItemDef['rarity'][]>> = {
  common: ['common'],
  rare: ['rare'],
  epic: ['epic'],
};

export function rollQuestReward(
  tier: QuestRewardTier,
  level: number,
  rng: () => number = Math.random
): ItemDef | null {
  const eligible = ITEM_REGISTRY.filter((it) => RARITY_FILTER[tier].includes(it.rarity));
  return rollDrop({ pool: eligible, level, rng });
}
```

If a tier has no eligible items in the registry (e.g. no epic items at
launch), `rollQuestReward` returns null. Caller handles this by:
- Skipping the quest's claim (`button` disabled with "Phần thưởng chưa sẵn sàng")
- Logging a `console.warn` (matches AP E14 pattern)

### 4.6 Quest catalog (`data/staticConfig/quests.ts`)

8 entries — exact `match` predicates inline so quest authors see the
event narrowing:

```ts
import type { QuestDef } from '@/types/quest';

export const QUESTS: ReadonlyArray<QuestDef> = [
  // ── Daily ──
  {
    id: 'daily-combat-3',
    tier: 'daily',
    displayNameVi: 'Thắng 3 trận',
    description: 'Đánh bại 3 quái bất kỳ trong ngày',
    target: 3,
    rewardTier: 'common',
    source: 'EXIT_COMBAT',
    match: (p: { won: boolean }) => (p.won ? 1 : 0),
  },
  {
    id: 'daily-quiz-5',
    tier: 'daily',
    displayNameVi: 'Trả lời đúng 5 câu',
    description: 'Trả lời đúng 5 câu hỏi liên tiếp',
    target: 5,
    rewardTier: 'common',
    source: 'QUIZ_RESULT',
    match: (p: { correct: boolean }) => (p.correct ? 1 : 0),
  },
  {
    id: 'daily-explore-1',
    tier: 'daily',
    displayNameVi: 'Khám phá 1 vùng',
    description: 'Vào 1 zone bất kỳ trong ngày',
    target: 1,
    rewardTier: 'common',
    source: 'ENTER_ZONE',
    match: () => 1,
  },

  // ── Weekly ──
  {
    id: 'weekly-combat-20',
    tier: 'weekly',
    displayNameVi: 'Thắng 20 trận tuần này',
    description: 'Đánh bại 20 quái trong tuần',
    target: 20,
    rewardTier: 'rare',
    source: 'EXIT_COMBAT',
    match: (p: { won: boolean }) => (p.won ? 1 : 0),
  },
  {
    id: 'weekly-pet-1',
    tier: 'weekly',
    displayNameVi: 'Cứu 1 pet',
    description: 'Cứu được 1 pet từ trận chiến',
    target: 1,
    rewardTier: 'rare',
    source: 'PET_COLLECTED',
    match: () => 1,
  },

  // ── Main story ──
  {
    id: 'main-level-5',
    tier: 'main',
    displayNameVi: 'Đạt cấp 5',
    description: 'Đưa anh hùng lên cấp 5',
    target: 1,                            // boolean-style: 0 → not yet, 1 → done
    rewardTier: 'epic',
    source: 'LEVEL_UP',
    match: (p: { newLevel: number }) => (p.newLevel >= 5 ? 1 : 0),
  },
  {
    id: 'main-boss-forest',
    tier: 'main',
    displayNameVi: 'Đánh bại boss rừng',
    description: 'Hạ gục boss của Đảo Rừng Xanh',
    target: 1,
    rewardTier: 'epic',
    source: 'BOSS_DEFEATED',
    match: (p: { bossId: string }) => (p.bossId === 'forest-boss' ? 1 : 0),
  },
  {
    id: 'main-pets-3',
    tier: 'main',
    displayNameVi: 'Sở hữu 3 pet',
    description: 'Cứu và giữ 3 pet trong roster',
    target: 3,
    rewardTier: 'epic',
    source: 'PET_COLLECTED',
    match: () => 1,
  },
];

export function findQuestDef(id: QuestId): QuestDef | null {
  return QUESTS.find((q) => q.id === id) ?? null;
}

export function questsByTier(tier: QuestTier): ReadonlyArray<QuestDef> {
  return QUESTS.filter((q) => q.tier === tier);
}
```

**`main-pets-3` semantics:** the engine increments per `PET_COLLECTED`
emit. If the player collects 5 pets and releases 2, progress remains 5
(monotonic counter, not "currently owned"). This mirrors the spec's
target-once-completion contract.

### 4.7 EventBus delta

Single new event:

| Event | Payload | Direction |
|---|---|---|
| `QUEST_PROGRESS` | `{ questId: string; delta: number }` | engine → bus → React toast/panel |

Existing event signatures (Sprint A-C) are unchanged.

### 4.8 SaveState v6 actions

```ts
incrementQuestProgress(questId, delta): void
  // Adds `delta` to questProgress[questId], clamps at the catalog target.
  // No-op if already claimed.

claimQuestReward(questId): ItemDef | null
  // Pre-conditions: questProgress[questId] >= target AND !claimedRewards.includes(questId)
  // On success: pushes to claimedRewards, calls rollQuestReward, mints InventoryItem,
  //             returns ItemDef. Caller emits CHEST_OPENED-style event to surface UI.
  // On fail (already claimed / not at target / null reward): returns null.

isQuestReady(questId): boolean
  // questProgress[questId] >= target AND !claimedRewards.includes(questId)

refreshCyclesIfNeeded(): { dailyReset: boolean; weeklyReset: boolean }
  // Wipes daily/weekly quest progress + claims when their UTC+7 anchor expires.
```

### 4.9 React surface

**`QuestsPanel.tsx`** (`/quests` route):

```
+-----------------------------------------+
|  /quests                             [X] |
+-----------------------------------------+
| 🌅 Hằng ngày — reset 12:00 đêm           |
| ┌────────────────────────────────────┐   |
| │ 🎯 Thắng 3 trận            (2/3)    │   |
| │ ████████░░  [Đang tiến hành]        │   |
| └────────────────────────────────────┘   |
| ┌────────────────────────────────────┐   |
| │ 📚 Trả lời đúng 5 câu        (5/5)   │   |
| │ ██████████  [Nhận thưởng] ✨        │   |
| └────────────────────────────────────┘   |
| ┌────────────────────────────────────┐   |
| │ 🗺️ Khám phá 1 vùng        ✓ Đã nhận │   |
| └────────────────────────────────────┘   |
| 📅 Hằng tuần (2 quests rendered same way)|
| ⭐ Cốt truyện chính (3 quests)            |
+-----------------------------------------+
```

Per-card states: `not-started` (0/N) / `in-progress` (M/N) /
`ready-to-claim` (N/N + sparkle "Nhận thưởng" button) / `claimed`
(grey "Đã nhận"). Clicking "Nhận thưởng" → emits `CHEST_OPENED` shape
to the existing `RewardChestOverlay` (Step 22.14) which renders the
loot popup.

**Reuse pattern:** `claimQuestReward` mints the item and the panel
emits a `CHEST_OPENED` event:

```ts
const handleClaim = (questId: string) => {
  const heroLevel = useSaveState.getState().level;
  // Mint item via SaveState action (uses rollQuestReward internally with hero level)
  const item = useSaveState.getState().claimQuestReward(questId, heroLevel);
  if (!item) return;
  // Surface via existing chest overlay UI
  eventBus.emit('CHEST_OPENED', {
    chestId: `quest-${questId}`,
    zoneId: 'quest-panel',                // sentinel — not a real zone
    items: [{ itemId: item.id, qty: 1 }],
    label: 'Đóng',                        // override default "Về Bản Đồ"
  });
};
```

`RewardChestOverlay` already subscribes to `CHEST_OPENED` (Sprint B
Task 11) and renders the items list with a "Về Bản Đồ" button that
clears `currentZoneId`. For quest claims `currentZoneId` is null
(player on `/quests` route, not in a zone) — the existing handler
calls `setCurrentZoneId(null)` which is idempotent.

**Open question:** the existing "Về Bản Đồ" button label hard-codes
the world-map navigation. For quest claims it should say "Đóng".
Acceptable approaches:
- (a) Add a `label` field to `CHEST_OPENED` payload (additive event change).
- (b) Hard-code the chest overlay to show "Đóng" if `chestId` starts
  with `quest-` (sentinel-based dispatch — cheap, ugly).
- (c) Clone `RewardChestOverlay` into a `QuestRewardOverlay` purpose-
  built for quests (cleanest but duplicates ~40 lines).

**Em chọn (a)** — additive `label?: string` on `CHEST_OPENED` payload,
defaults to "Về Bản Đồ". Quest claims pass `label: "Đóng"`. EventBus
delta documented in §4.7 + AP §14.

**`QuestProgressToast.tsx`** (top-right ephemeral):

Subscribes to `QUEST_PROGRESS`. Looks up the QuestDef for `questId`,
reads current progress from SaveState, renders `<div>` for 2.5s with:

```
┌──────────────────────────────┐
│ 🎯 Thắng 3 trận     (2/3) +1 │
└──────────────────────────────┘
```

Multiple toasts queue downward. On 100%, the toast variant changes to
"Sẵn sàng nhận thưởng!" with sparkle animation (CSS, no new asset).

**`MainMenu.tsx` edits:**

- Add new button "Nhiệm vụ" linking to `/quests`.
- Sparkle indicator — small gold dot top-right of the button when
  `useSaveState((s) => Object.keys(s.questProgress).some((id) => isQuestReady(id)))`.

### 4.10 AppRouter wiring

`react/shell/AppRouter.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { QuestEngine } from '@/domain/QuestEngine';
import { useSaveState } from '@/persistence/SaveStateStore';
import { QuestsPanel } from '@/react/screens/QuestsPanel';
import { QuestProgressToast } from '@/react/overlays/QuestProgressToast';

export function AppRouter() {
  const engineRef = useRef<QuestEngine | null>(null);

  useEffect(() => {
    // Start the engine once at app init.
    engineRef.current = new QuestEngine();
    engineRef.current.start();
    // Refresh cycle anchors on mount and on tab refocus.
    const refresh = () => useSaveState.getState().refreshCyclesIfNeeded();
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      engineRef.current?.stop();
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play" element={<PlayScreen />} />
        <Route path="/guild" element={<GuildLeaderboard />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/quests" element={<QuestsPanel />} />     {/* NEW */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Sprint B/C overlays continue to mount here */}
      <RewardChestOverlay />
      <PetRescueOverlay />
      <LockedIslandTooltip />
      <QuestProgressToast />                                    {/* NEW */}
    </BrowserRouter>
  );
}
```

## 5. Acceptance criteria

1. **Schema v6:** `useSaveState.getState().questProgress`, `claimedRewards`,
   `questCycleAnchors` exist. Old v5 saves migrate cleanly.
2. **Engine wiring:** emitting `EXIT_COMBAT { won: true, ... }` 3 times
   sets `questProgress['daily-combat-3'] === 3` AND emits
   `QUEST_PROGRESS` 3 times.
3. **Engine ignores already-claimed quests:** after claim,
   subsequent matching events do NOT increment progress further.
4. **Engine ignores already-completed (not-yet-claimed) quests:**
   subsequent matching events do NOT increment progress past `target`.
5. **Daily refresh:** simulating cycle rollover (mock `Date.now()`) +
   calling `refreshCyclesIfNeeded()` wipes daily progress + daily
   claimedRewards entries. Weekly + main untouched.
6. **Weekly refresh:** same, on Sunday UTC+7 boundary.
7. **Main quests never reset:** `main-level-5` claimed once stays
   claimed across daily and weekly resets.
8. **Reward minting:** `claimQuestReward('daily-combat-3', heroLevel)`
   when ready returns an `ItemDef` of rarity `common` and pushes to
   `claimedRewards`. Returns `null` on second call.
9. **Reward null fallback:** when `ITEM_REGISTRY` has no items of the
   required rarity, claim returns null + warn.
10. **Quests Panel renders 3+2+3 grouped sections** with correct progress
    bars and button states (not-started / in-progress / ready / claimed).
11. **MainMenu sparkle indicator** lights up when at least one quest
    transitions to ready, dims when none ready.
12. **Toast appears** on every increment, queues downward, dismisses
    after 2.5s.
13. **Claim flow:** clicking "Nhận thưởng" emits `CHEST_OPENED` with
    `label: "Đóng"`; `RewardChestOverlay` shows item; clicking "Đóng"
    closes overlay; quest card transitions to "Đã nhận".
14. **Type B gates:** lint + typecheck + verify + full unit suite green.
    New tests:
    - `domain/QuestEngine.test.ts` — match dispatch, dedup on claimed,
      cap on target, multiple quest sources
    - `domain/QuestCycle.test.ts` — anchor math at edge cases (DST-free
      since UTC+7 is fixed; midnight boundaries; Sunday-walk-back)
    - `domain/QuestReward.test.ts` — tier filter, null fallback
    - `data/staticConfig/quests.test.ts` — 8 entries, unique IDs, all
      `source` events exist in EventBus union, all rewardTiers valid,
      all targets > 0
    - `persistence/SaveStateStore.test.ts` — v5→v6 migration; 4 new
      actions; refreshCyclesIfNeeded dispatch
    - `bus/EventBus.test.ts` — `QUEST_PROGRESS` typed; `CHEST_OPENED`
      additive `label?` field
    - `react/screens/QuestsPanel.test.tsx` — 3 tier groups, claim
      flow, sparkle on ready
    - `react/overlays/QuestProgressToast.test.tsx` — appears, queues,
      dismisses
    - E2E `app/tests/e2e/sprint_d_quests.spec.ts` — beat 3 monsters →
      quest progresses 0→1→2→3 → ready → claim → inventory has new item.

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | QuestEngine fires before SaveState rehydrates → progress lost | Med | High | `AppRouter` waits on `useSaveState.persist.hasHydrated()` before calling `engine.start()`. Test with rehydrate-mid-flight scenario. |
| R2 | Daily refresh wipes progress mid-session if anchor rollover during play | Low | Med | `refreshCyclesIfNeeded` runs only at mount + window-focus, NOT on every event. Active session that crosses midnight keeps progress until next mount/focus — acceptable per spec philosophy. |
| R3 | Multiple `QUEST_PROGRESS` listeners (toast + panel) cause double re-render storm | Low | Low | Toast and panel each subscribe independently via Zustand selectors; React batches re-renders. No additional throttling needed at Sprint D scale (8 quests). |
| R4 | `CHEST_OPENED` payload `label` field break Sprint B chest overlay if not optional | High | High | Make `label?: string` optional; default in `RewardChestOverlay` is `"Về Bản Đồ"`. Sprint B callers don't pass it; they keep working. |
| R5 | Toast obstructs other overlays (PetRescueOverlay, RewardChestOverlay) | Med | Low | Toast sits at z-40; chest/pet at z-50; queue is top-right, modals are center. No spatial overlap. |
| R6 | `claimQuestReward` mints inventory but UI overlay fails to open → user sees toast but no chest | Low | Low | Mint happens ATOMICALLY with `CHEST_OPENED` emit. If overlay subscriber has a bug, item is still in inventory (not lost). |
| R7 | Vietnam UTC+7 anchor math wrong at month/year boundaries | Low | Med | Use plain ms arithmetic on epoch (no Date object weirdness). Test 2026-12-31 23:59 UTC+7 → 2027-01-01 00:00 UTC+7 boundary. |
| R8 | `main-pets-3` counts release+re-collect cycle (since it's monotonic on PET_COLLECTED) — student could "farm" by collecting and releasing | Low | Low | Acceptable: rescue is rate-gated (10-30%) and the student has no incentive to release a pet just to re-collect. Document in spec. |

## 7. AP / ISP impact

### 7.1 AP delta (additive, no version bump)

Append "Sprint D — Delta" section to AP v1.1:

- **§3.1** — add `domain/QuestEngine.ts`, `domain/QuestCycle.ts`,
  `domain/QuestReward.ts`, `react/overlays/QuestProgressToast.tsx`,
  `react/screens/QuestsPanel.tsx`, `types/quest.ts`,
  `data/staticConfig/quests.ts`.
- **§11.7 — Quest schema (NEW):** Document QuestDef shape, 4 quest
  tiers with example, refresh semantics (UTC+7 anchor math), reward
  tier→rarity mapping, target/match/dedup contract, monotonic counter
  policy.
- **§13** — add SaveState v6 row: `questProgress`, `claimedRewards`,
  `questCycleAnchors`. Migration v5→v6 additive.
- **§14** — append `QUEST_PROGRESS { questId, delta }` event;
  `CHEST_OPENED` payload extended with optional `label?: string`.

### 7.2 ISP delta

Append a Sprint D row table to `IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`:

| # | Step | Status |
|---|---|---|
| S-D.0 | Preflight | ⏳ |
| S-D.1 | `types/quest.ts` + tier/reward constants | ⏳ |
| S-D.2 | `data/staticConfig/quests.ts` (8 quests) + tests | ⏳ |
| S-D.3 | `domain/QuestCycle.ts` (UTC+7 anchors) + tests | ⏳ |
| S-D.4 | `domain/QuestReward.ts` (tier→rarity rollDrop wrapper) + tests | ⏳ |
| S-D.5 | `domain/QuestEngine.ts` (event listener + dispatch) + tests | ⏳ |
| S-D.6 | SaveState v5→v6 + 4 actions + refreshCyclesIfNeeded | ⏳ |
| S-D.7 | EventBus +QUEST_PROGRESS, CHEST_OPENED.label?: string | ⏳ |
| S-D.8 | `RewardChestOverlay` honors optional label (default "Về Bản Đồ") | ⏳ |
| S-D.9 | `QuestProgressToast` (queue + dismiss) + tests | ⏳ |
| S-D.10 | `QuestsPanel` (route, 3-tier groups, claim flow) + tests | ⏳ |
| S-D.11 | `MainMenu` "Nhiệm vụ" button + sparkle indicator | ⏳ |
| S-D.12 | `AppRouter` wires QuestEngine + refresh + /quests route | ⏳ |
| S-D.13 | E2E `sprint_d_quests.spec.ts` | ⏳ |
| S-D.14 | AP §11.7 + §13 + §14 delta + ISP roll-up + tasks/todo.md | ⏳ |

15 steps. Larger than Sprint C (12) because Sprint D touches more
React surface (toast + panel + main menu + router). Per-step scope
stays small.

### 7.3 tasks/todo.md update

Sprint D row in the Phase 2.5 sprints table moves from `⏳ pending` to
`✅ shipped` with the squash commit SHA + delta test count. Next-session
action shifts to Sprint E (Polish & Onboarding).

## 8. Test strategy

### 8.1 Unit (Vitest) — target ≥ 60 new tests

Distribution:
- QuestEngine: ~12 (dispatch, dedup, cap, multi-source, lifecycle start/stop)
- QuestCycle: ~8 (UTC+7 math, midnight boundary, Sunday walk-back, year cross)
- QuestReward: ~5 (tier filter, null fallback, level scaling)
- quests.ts: ~6 (8 entries, dedup, source-event consistency, target>0)
- SaveStateStore (v6): ~10 (migration, 4 actions, refresh)
- EventBus: ~2 (QUEST_PROGRESS, CHEST_OPENED.label)
- QuestProgressToast: ~5 (mount, queue, dismiss, ready variant)
- QuestsPanel: ~10 (3 tier groups, claim flow, ready transition, claimed state, no-quests fallback)
- MainMenu: ~2 (button + sparkle)

### 8.2 E2E (Playwright)

`app/tests/e2e/sprint_d_quests.spec.ts`:

```
test('sprint D: combat 3× → daily-combat-3 ready → claim → item in inventory', ...)
```

Steps:
1. seed save with v6 + reset cycles via `__GAME__.simulate.setQuestCycleAnchors(now)`
2. drive 3 combat wins via `__GAME__.simulate.killBoss()` × 3 (or beat-mob via existing helpers)
3. verify `__GAME__.getSaveState().questProgress['daily-combat-3'] === 3`
4. navigate to `/quests`, click "Nhận thưởng" on the daily-combat-3 card
5. `RewardChestOverlay` appears, click "Đóng"
6. verify inventory now has 1 new item

E2E timeout 60s. Reuses Sprint B's `--workers=1` advice for headless
stability.

### 8.3 Visual UAT (Antigravity)

- Daily quest progress: kid kills monster → toast slides in top-right
  with progress bar, dismisses 2.5s later
- All-3 daily complete → MainMenu "Nhiệm vụ" button gains gold sparkle
- Click button → `/quests` panel opens, quest cards show ready state
- Click "Nhận thưởng" → chest reveal animation → loot list with
  Đóng button → returns to /quests with quest in claimed state
- Date rolls past midnight VN time → next morning, dailies have reset
  (manual time-jump test)

## 9. Type classification

**Type B** — Entity Schema delta (QuestDef registry + SaveState v6
migration). NOT Type C: no Event Layer protocol redesign — `QUEST_PROGRESS`
is purely additive observer, `CHEST_OPENED.label` is additive optional.

CI label gate: `type-B`.

## 10. Asset spec — Antigravity

Sprint D needs minimal new art. Existing UI primitives + emoji
fallback can ship a fully-functional Quests panel without art delivery.
Antigravity ships polish later:

### 10.1 Quest panel banner — 1 file

- **Path:** `app/public/assets/quests/quest_panel_banner_800x120.png`
- **Spec:** 800×120 PNG-32, watercolor scroll motif with quill + tassel,
  warm parchment background. Style anchor: same as Sprint B world map
  (flat 2D vector, clean 2px outline, palette warm-#D4691E + accent-#FFD700).
- **Antigravity prompt:**
  > Watercolor banner header for a quests panel, 800×120 PNG-32, warm
  > parchment scroll background with golden tassels at both ends and a
  > quill-with-inkwell motif center-left. Vietnamese text "Nhiệm vụ"
  > optional in fantasy serif center. Style: flat 2D vector art,
  > flash-game finish, clean 2px outline, 3-tone cel shading, palette
  > warm-#D4691E + cool-#3399FF + accent-#FFD700.

### 10.2 Quest tier icons — 4 files (64×64 each)

- **Paths:**
  - `app/public/assets/quests/quest-icon_combat_64x64.png`
  - `app/public/assets/quests/quest-icon_quiz_64x64.png`
  - `app/public/assets/quests/quest-icon_explore_64x64.png`
  - `app/public/assets/quests/quest-icon_pet_64x64.png`
- **Spec:** 64×64 PNG-32 RGBA, transparent background, single-color
  silhouette inside a circular badge. One icon per quest theme:
  - **combat:** crossed swords
  - **quiz:** open book + question mark
  - **explore:** compass / map scroll
  - **pet:** paw print
- **Antigravity prompt:**
  > 4 quest category icons, 64×64 PNG-32 each, transparent background,
  > circular badge with single-color silhouette glyph centered. Themes:
  > (1) Combat — crossed swords; (2) Quiz — open book with question
  > mark; (3) Explore — compass / map scroll; (4) Pet — paw print.
  > Style: flat 2D vector art, clean 2px outline, palette warm-#D4691E
  > + accent-#FFD700.

### 10.3 Fallback for missing assets

If Antigravity hasn't delivered when Sprint D ships, `QuestsPanel`
falls back to:
- Banner: `<h1>` text "Nhiệm vụ" with Tailwind background gradient
- Icons: emoji per tier (🎯 combat, 📚 quiz, 🗺️ explore, 🐾 pet)

This matches Sprint C's pattern (PetRescueOverlay rarity glow uses
CSS only — no art blocker).

## 11. Open questions baked as defaults (anh override khi review spec)

None — all 5 brainstorming questions have explicit answers. Spec is
ready for plan generation.

---

**End Sprint D design spec.** Next step: anh review → user approval → invoke `writing-plans` skill to produce `docs/superpowers/plans/2026-05-02-sprint-d-quests-plan.md`.
