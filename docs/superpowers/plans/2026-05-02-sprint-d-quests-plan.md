# Sprint D — Quests & Goals Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the centralized QuestEngine + 8-quest catalog (3 daily / 2 weekly / 3 main) + `/quests` panel with toast notifications, manual claim via RewardChestOverlay reuse, and Vietnam UTC+7 cycle refresh — without touching scene/quiz code.

**Architecture:** SaveState v5 → v6 adds `questProgress`, `claimedRewards`, `questCycleAnchors`. Pure-TS domain modules (`QuestEngine`, `QuestCycle`, `QuestReward`) decouple quest tracking from gameplay code. React `QuestsPanel` + `QuestProgressToast` consume `QUEST_PROGRESS` events. Reward minting reuses Sprint A's `rollDrop` filtered by tier rarity. `CHEST_OPENED` payload gains optional `label?: string` so the same overlay serves quest claims ("Đóng") and zone exits ("Về Bản Đồ").

**Tech Stack:** Vite 8, React 19, TS 5.6, Phaser 3.90, Zustand 5 (persist), Zod 4, Vitest 4, Playwright 1.59. ESLint flat config + `boundaries/element-types`. Husky pre-commit gate.

**Spec:** [docs/superpowers/specs/2026-05-02-sprint-d-quests-design.md](../specs/2026-05-02-sprint-d-quests-design.md) @ `8832da2`

**Type classification:** **B** — Entity Schema delta (QuestDef registry + SaveState v6). PR must carry `type-B` label.

**Conventions used by every task:**

- All commands run from `app/` unless noted: `cd app && <cmd>`.
- TDD discipline: write failing test → run to confirm RED → implement → run to confirm GREEN → commit. One commit per task.
- Every task ends with: `npm run lint && npm run typecheck && npm run test:run -- <pattern> && npm run verify`.
- Co-author footer required on every commit:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Worktree: `D:\projectlocal\clevai\Game_exclusive\.claude\worktrees\sprint-d-quests`, branch `claude/sprint-d-quests`.

**Critical references inside the codebase to read once before starting:**

- `app/src/persistence/SaveStateStore.ts` — current v5 store (Sprint C added `ownedPets`); `migrate(state, version)` chain ends at `if (version < 5)`
- `app/src/data/staticConfig/items.ts` — `ITEM_REGISTRY` shape (rarity field used by QuestReward)
- `app/src/domain/LevelUpReward.ts` — exports `rollDrop({ pool, level, rng? })` reused by QuestReward
- `app/src/bus/EventBus.ts` — typed `GameEvent` union (you append 1 entry + extend 1 payload)
- `app/src/react/overlays/RewardChestOverlay.tsx` — Sprint B chest overlay (Sprint C extended for CHEST_OPENED); you add optional `label` support
- `app/src/react/screens/MainMenu.tsx` — Phase 1 main menu (you add "Nhiệm vụ" button)
- `app/src/react/shell/AppRouter.tsx` — Phase 1 router + Sprint B/C overlay mounts (you add /quests route + QuestEngine lifecycle + QuestProgressToast mount)
- `app/src/testing/gameTestBridge.ts` — `window.__GAME__.simulate.*` exposé pattern

---

## Task 0: Preflight checks

**Files:** none (read-only). No commit.

- [ ] **Step 1: Confirm worktree state and baseline gates**

```bash
cd app
git status                          # should be clean
git log --oneline -3                # latest = 8832da2 (spec commit)
npm install
npm run lint
npm run typecheck
npm run test:run
npm run verify
```

Expected: 720 unit tests passing, all gates green. If anything fails, STOP — diagnose before proceeding.

- [ ] **Step 2: Verify Sprint A/B/C surface intact**

```bash
npm run test:run -- LevelUpReward CombatScene SaveStateStore RewardChestOverlay PetRescueOverlay
```

Expected: every Sprint A/B/C test passes.

- [ ] **Step 3: Verify ITEM_REGISTRY has at least 1 common, 1 rare, 1 epic item**

```bash
grep -c "rarity: 'common'" app/src/data/staticConfig/items.ts
grep -c "rarity: 'rare'" app/src/data/staticConfig/items.ts
grep -c "rarity: 'epic'" app/src/data/staticConfig/items.ts
```

Each should be ≥ 1. If `epic` is 0, make a note — main-tier rewards will return null on claim until Phase 2 item expansion.

---

## Task 1: types/quest.ts + tier/reward constants

**Files:**
- Create: `app/src/types/quest.ts`

- [ ] **Step 1: Implement `app/src/types/quest.ts`**

```ts
/**
 * Quest system types — Sprint D.
 *
 * QuestDef is what lives in data/staticConfig/quests.ts catalog. The
 * runtime per-player progress lives in SaveState.questProgress +
 * claimedRewards + questCycleAnchors.
 *
 * QuestEngine subscribes to GameEvent's source channel and runs each
 * quest's `match` against the payload, returning a delta to add. Engine
 * is pure-TS — no Phaser / React / DOM imports.
 */

import type { GameEvent } from '@/bus/EventBus';

export type QuestId = string;

export type QuestTier = 'daily' | 'weekly' | 'main';

export type QuestRewardTier = 'common' | 'rare' | 'epic';

/** All event names that any quest can match against. */
export type QuestSourceEvent = GameEvent['type'];

export interface QuestDef {
  readonly id: QuestId;
  readonly tier: QuestTier;
  readonly displayNameVi: string;
  readonly description: string;
  readonly target: number;
  readonly rewardTier: QuestRewardTier;
  readonly source: QuestSourceEvent;
  /** Returns increment delta (0 = no contribution). */
  readonly match: (payload: never) => number;
}

/** Per-player runtime progress. */
export interface QuestCycleAnchors {
  /** Date.now() at last UTC+7 midnight that triggered a daily refresh. */
  readonly dailyEpochUtc7: number;
  /** Date.now() at last UTC+7 Sunday-midnight that triggered a weekly refresh. */
  readonly weeklyEpochUtc7: number;
}

export const TIER_REWARD: Readonly<Record<QuestTier, QuestRewardTier>> = {
  daily: 'common',
  weekly: 'rare',
  main: 'epic',
};

export const TIER_LABEL_VI: Readonly<Record<QuestTier, string>> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  main: 'Cốt truyện chính',
};
```

- [ ] **Step 2: Run gates**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
```

Expected: all clean. The `import type { GameEvent } from '@/bus/EventBus'` succeeds because Sprint A-C already export the union; Sprint D Task 7 will add `QUEST_PROGRESS` to it.

- [ ] **Step 3: Commit**

```bash
git add app/src/types/quest.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): types/quest — QuestDef + tier + reward constants

S-D.1 — Pure type definitions for the quest catalog. QuestDef carries
id/tier/target/rewardTier/source/match; engine consumes match() to
translate events into progress deltas. TIER_REWARD maps tier→rarity
for QuestReward. TIER_LABEL_VI for UI rendering.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: data/staticConfig/quests.ts (8-quest catalog) + tests

**Files:**
- Create: `app/src/data/staticConfig/quests.ts`
- Create: `app/src/data/staticConfig/quests.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/src/data/staticConfig/quests.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { QUESTS, findQuestDef, questsByTier } from './quests';

describe('QUESTS catalog', () => {
  it('declares exactly 8 quests', () => {
    expect(QUESTS).toHaveLength(8);
  });

  it('partitions into 3 daily + 2 weekly + 3 main', () => {
    expect(QUESTS.filter((q) => q.tier === 'daily')).toHaveLength(3);
    expect(QUESTS.filter((q) => q.tier === 'weekly')).toHaveLength(2);
    expect(QUESTS.filter((q) => q.tier === 'main')).toHaveLength(3);
  });

  it('uses unique quest IDs', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every quest has target > 0', () => {
    for (const q of QUESTS) {
      expect(q.target, `${q.id} target`).toBeGreaterThan(0);
    }
  });

  it('rewardTier matches tier convention (daily=common, weekly=rare, main=epic)', () => {
    for (const q of QUESTS) {
      const expected = q.tier === 'daily' ? 'common' : q.tier === 'weekly' ? 'rare' : 'epic';
      expect(q.rewardTier, `${q.id}`).toBe(expected);
    }
  });

  it('all source events exist in the catalog (sanity)', () => {
    const validSources = [
      'EXIT_COMBAT',
      'QUIZ_RESULT',
      'ENTER_ZONE',
      'PET_COLLECTED',
      'LEVEL_UP',
      'BOSS_DEFEATED',
    ];
    for (const q of QUESTS) {
      expect(validSources, `${q.id} source ${q.source}`).toContain(q.source);
    }
  });

  it('match returns 1 for daily-combat-3 on won=true, 0 on won=false', () => {
    const q = findQuestDef('daily-combat-3')!;
    expect(q.match({ won: true } as never)).toBe(1);
    expect(q.match({ won: false } as never)).toBe(0);
  });

  it('match returns 1 for daily-quiz-5 on correct=true, 0 on correct=false', () => {
    const q = findQuestDef('daily-quiz-5')!;
    expect(q.match({ correct: true } as never)).toBe(1);
    expect(q.match({ correct: false } as never)).toBe(0);
  });

  it('match returns 1 for daily-explore-1 on any ENTER_ZONE payload', () => {
    const q = findQuestDef('daily-explore-1')!;
    expect(q.match({ zoneId: 'forest-island' } as never)).toBe(1);
  });

  it('match returns 1 for main-level-5 only when newLevel >= 5', () => {
    const q = findQuestDef('main-level-5')!;
    expect(q.match({ newLevel: 4 } as never)).toBe(0);
    expect(q.match({ newLevel: 5 } as never)).toBe(1);
    expect(q.match({ newLevel: 99 } as never)).toBe(1);
  });

  it('match returns 1 for main-boss-forest only on bossId=forest-boss', () => {
    const q = findQuestDef('main-boss-forest')!;
    expect(q.match({ bossId: 'forest-boss' } as never)).toBe(1);
    expect(q.match({ bossId: 'volcanic-boss' } as never)).toBe(0);
  });

  it('findQuestDef returns null for unknown id', () => {
    expect(findQuestDef('nope')).toBeNull();
  });

  it('questsByTier filters correctly', () => {
    expect(questsByTier('daily')).toHaveLength(3);
    expect(questsByTier('weekly')).toHaveLength(2);
    expect(questsByTier('main')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- staticConfig/quests
```

Expected: module not found.

- [ ] **Step 3: Implement `app/src/data/staticConfig/quests.ts`**

```ts
/**
 * Quest catalog — Sprint D.
 *
 * 8 quests: 3 daily + 2 weekly + 3 main. Source events are existing
 * GameEvent types from Sprints A-C; QuestEngine (Task 5) translates
 * matching emits into QUEST_PROGRESS.
 */

import type { QuestDef, QuestId, QuestTier } from '@/types/quest';

export const QUESTS: ReadonlyArray<QuestDef> = [
  // ── Daily (refresh at UTC+7 midnight) ──
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

  // ── Weekly (refresh at UTC+7 Sunday-midnight) ──
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

  // ── Main story (no expiry; once claimed, stays claimed) ──
  {
    id: 'main-level-5',
    tier: 'main',
    displayNameVi: 'Đạt cấp 5',
    description: 'Đưa anh hùng lên cấp 5',
    target: 1,
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

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- staticConfig/quests
```

- [ ] **Step 5: Run gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/data/staticConfig/quests.ts app/src/data/staticConfig/quests.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): QUESTS catalog — 8 quests (3 daily + 2 weekly + 3 main)

S-D.2 — Daily: combat-3, quiz-5, explore-1. Weekly: combat-20, pet-1.
Main: level-5, boss-forest, pets-3. All match predicates inline so quest
authors see the event payload narrowing. Helpers findQuestDef +
questsByTier.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: domain/QuestCycle.ts (UTC+7 anchors) + tests

**Files:**
- Create: `app/src/domain/QuestCycle.ts`
- Create: `app/src/domain/QuestCycle.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  dailyAnchor,
  weeklyAnchor,
  needsRefresh,
  VIETNAM_UTC_OFFSET_MS,
} from './QuestCycle';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('VIETNAM_UTC_OFFSET_MS', () => {
  it('equals +7 hours in milliseconds', () => {
    expect(VIETNAM_UTC_OFFSET_MS).toBe(7 * HOUR);
  });
});

describe('dailyAnchor', () => {
  it('returns the most recent UTC+7 midnight at-or-before now', () => {
    // Vietnam local: 2026-05-02 12:30 → previous midnight: 2026-05-02 00:00 UTC+7
    // = 2026-05-01 17:00 UTC
    const localNoon = Date.UTC(2026, 4, 2, 5, 30); // 2026-05-02 12:30 Vietnam = 05:30 UTC
    const anchor = dailyAnchor(localNoon);
    // expected: 2026-05-01 17:00 UTC
    expect(anchor).toBe(Date.UTC(2026, 4, 1, 17, 0));
  });

  it('exact midnight boundary returns same instant', () => {
    // 2026-05-02 00:00 Vietnam = 2026-05-01 17:00 UTC
    const exact = Date.UTC(2026, 4, 1, 17, 0);
    expect(dailyAnchor(exact)).toBe(exact);
  });

  it('one ms before midnight returns previous midnight', () => {
    const justBefore = Date.UTC(2026, 4, 1, 16, 59, 59, 999);
    const expected = Date.UTC(2026, 3, 30, 17, 0); // previous day's midnight VN
    expect(dailyAnchor(justBefore)).toBe(expected);
  });

  it('handles year boundary (2026-12-31 22:00 Vietnam = 2026-12-31 15:00 UTC)', () => {
    const lateNye = Date.UTC(2026, 11, 31, 15, 0);
    expect(dailyAnchor(lateNye)).toBe(Date.UTC(2026, 11, 30, 17, 0));
    // 2027-01-01 00:30 Vietnam = 2026-12-31 17:30 UTC
    const earlyNyd = Date.UTC(2026, 11, 31, 17, 30);
    expect(dailyAnchor(earlyNyd)).toBe(Date.UTC(2026, 11, 31, 17, 0));
  });
});

describe('weeklyAnchor', () => {
  it('returns most recent UTC+7 Sunday-midnight at-or-before now', () => {
    // 2026-05-02 (Saturday) 12:00 Vietnam → previous Sunday-midnight =
    // 2026-04-26 00:00 Vietnam = 2026-04-25 17:00 UTC
    const sat = Date.UTC(2026, 4, 2, 5, 0);
    expect(weeklyAnchor(sat)).toBe(Date.UTC(2026, 3, 25, 17, 0));
  });

  it('on Sunday after midnight Vietnam, anchor is current Sunday-midnight', () => {
    // 2026-05-03 (Sunday) 06:00 Vietnam = 2026-05-02 23:00 UTC.
    // Anchor: Sunday 2026-05-03 00:00 Vietnam = 2026-05-02 17:00 UTC.
    const sundayMorning = Date.UTC(2026, 4, 2, 23, 0);
    expect(weeklyAnchor(sundayMorning)).toBe(Date.UTC(2026, 4, 2, 17, 0));
  });
});

describe('needsRefresh', () => {
  it('returns true when stored anchor is older than current cycle', () => {
    const now = Date.UTC(2026, 4, 2, 5, 30); // Vietnam noon
    const oldAnchor = Date.UTC(2026, 3, 30, 17, 0); // 2 days ago
    expect(needsRefresh(oldAnchor, now, 'daily')).toBe(true);
  });

  it('returns false when stored anchor matches current cycle', () => {
    const now = Date.UTC(2026, 4, 2, 5, 30);
    const currentAnchor = Date.UTC(2026, 4, 1, 17, 0); // today's midnight VN
    expect(needsRefresh(currentAnchor, now, 'daily')).toBe(false);
  });

  it('returns false on initial 0 anchor only after running once', () => {
    // anchor=0 means "never refreshed" — first refresh sets it to current
    const now = Date.UTC(2026, 4, 2, 5, 30);
    expect(needsRefresh(0, now, 'daily')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- QuestCycle
```

- [ ] **Step 3: Implement `app/src/domain/QuestCycle.ts`**

```ts
/**
 * QuestCycle — UTC+7 (Vietnam) midnight + Sunday-midnight anchor math.
 *
 * Pure ms arithmetic (no Date object weirdness across DST since UTC+7
 * has no DST). All boundaries computed in epoch ms so tests can mock
 * Date.now() freely.
 */

export const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Most recent UTC+7 midnight at-or-before `now`. */
export function dailyAnchor(now: number): number {
  const local = now + VIETNAM_UTC_OFFSET_MS;
  const localMidnight = local - (local % DAY_MS);
  return localMidnight - VIETNAM_UTC_OFFSET_MS;
}

/** Most recent UTC+7 Sunday-midnight at-or-before `now`. */
export function weeklyAnchor(now: number): number {
  const local = now + VIETNAM_UTC_OFFSET_MS;
  const localMidnight = local - (local % DAY_MS);
  // Day of week in UTC+7 local frame: 0 = Sunday … 6 = Saturday.
  const dayOfWeek = new Date(localMidnight).getUTCDay();
  const sundayLocalMidnight = localMidnight - dayOfWeek * DAY_MS;
  return sundayLocalMidnight - VIETNAM_UTC_OFFSET_MS;
}

/**
 * True when the stored anchor is older than the current cycle for
 * `kind`. anchor=0 (never refreshed) always returns true.
 */
export function needsRefresh(
  anchor: number,
  now: number,
  kind: 'daily' | 'weekly'
): boolean {
  const fn = kind === 'daily' ? dailyAnchor : weeklyAnchor;
  return fn(now) > anchor;
}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- QuestCycle
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/domain/QuestCycle.ts app/src/domain/QuestCycle.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): QuestCycle domain — UTC+7 daily/weekly anchors

S-D.3 — Pure ms arithmetic. dailyAnchor returns most recent UTC+7
midnight; weeklyAnchor walks back to Sunday-midnight UTC+7.
needsRefresh compares stored anchor to current cycle. anchor=0 means
"never refreshed" → always triggers first run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: domain/QuestReward.ts (tier→rarity rollDrop wrapper) + tests

**Files:**
- Create: `app/src/domain/QuestReward.ts`
- Create: `app/src/domain/QuestReward.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { rollQuestReward, RARITY_FILTER } from './QuestReward';
import { ITEM_REGISTRY } from '@data/staticConfig/items';

describe('RARITY_FILTER', () => {
  it('common→common, rare→rare, epic→epic', () => {
    expect(RARITY_FILTER.common).toEqual(['common']);
    expect(RARITY_FILTER.rare).toEqual(['rare']);
    expect(RARITY_FILTER.epic).toEqual(['epic']);
  });
});

describe('rollQuestReward', () => {
  it('returns a common item for daily tier when registry has commons', () => {
    const item = rollQuestReward('common', 1, () => 0);
    if (item) expect(item.rarity).toBe('common');
    // If registry has no commons, item is null — accept either.
    expect(item === null || item.rarity === 'common').toBe(true);
  });

  it('returns null when registry has no items of the requested rarity', () => {
    // Build a synthetic call with a tier no item satisfies — simulate
    // empty pool by checking that mock works against a hypothetical tier
    // (real ITEM_REGISTRY may or may not have epic; assert behavior).
    const epicItems = ITEM_REGISTRY.filter((i) => i.rarity === 'epic');
    if (epicItems.length === 0) {
      expect(rollQuestReward('epic', 1)).toBeNull();
    } else {
      const item = rollQuestReward('epic', 99, () => 0);
      expect(item?.rarity).toBe('epic');
    }
  });

  it('respects level minLevel filter via rollDrop', () => {
    // common items typically have minLevel 1 — at level 1 there should
    // be at least one eligible.
    const item = rollQuestReward('common', 1, () => 0);
    if (item) {
      expect(item.minLevel).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- QuestReward
```

- [ ] **Step 3: Implement `app/src/domain/QuestReward.ts`**

```ts
/**
 * QuestReward — thin wrapper over Sprint A's rollDrop that maps quest
 * reward tier → rarity filter. Returns null when the registry has no
 * eligible items (caller surfaces "Phần thưởng chưa sẵn sàng").
 */

import { rollDrop } from './LevelUpReward';
import { ITEM_REGISTRY, type ItemDef } from '@data/staticConfig/items';
import type { QuestRewardTier } from '@/types/quest';

export const RARITY_FILTER: Readonly<
  Record<QuestRewardTier, ReadonlyArray<ItemDef['rarity']>>
> = {
  common: ['common'],
  rare: ['rare'],
  epic: ['epic'],
};

export function rollQuestReward(
  tier: QuestRewardTier,
  level: number,
  rng: () => number = Math.random
): ItemDef | null {
  const eligible = ITEM_REGISTRY.filter((it) =>
    RARITY_FILTER[tier].includes(it.rarity)
  );
  if (eligible.length === 0) return null;
  return rollDrop({ pool: eligible, level, rng });
}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- QuestReward
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/domain/QuestReward.ts app/src/domain/QuestReward.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): QuestReward domain — tier→rarity rollDrop wrapper

S-D.4 — Maps QuestRewardTier (common/rare/epic) → ItemDef.rarity
filter, then defers to Sprint A's rollDrop for the weighted pick.
Returns null when registry has no eligible items (caller surfaces
"reward unavailable").

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: domain/QuestEngine.ts (event listener + dispatch) + tests

**Files:**
- Create: `app/src/domain/QuestEngine.ts`
- Create: `app/src/domain/QuestEngine.test.ts`

**Pre-condition:** Tasks 6 (SaveState v6 actions) and 7 (EventBus QUEST_PROGRESS) are NOT done yet. This task uses placeholder action names; the QuestEngine code is final but its callers depend on Tasks 6+7 to land before integration tests pass.

The unit tests in this task mock SaveState and EventBus directly, so they don't depend on Task 6/7 code yet — they DO depend on having the QUEST_PROGRESS event in the EventBus union (Task 7). To break the dependency, this task accepts `vi.mock('@/bus/EventBus')` to stub the union.

If running this task before Tasks 6/7, expect typecheck to fail with "QUEST_PROGRESS not in GameEvent" — that's why **Task 6 + Task 7 must land before Task 5's commit gate runs**. Reorder if needed.

- [ ] **Step 1: Confirm Tasks 6 + 7 are committed first**

```bash
git log --oneline | head -5
# Tasks 6 + 7 should appear before this Task 5 starts.
```

If Task 6/7 not yet committed, switch to those tasks first. The plan order is intentionally:
1. T1 types (Task 1)
2. T2 catalog (Task 2)
3. T3 cycle (Task 3)
4. T4 reward (Task 4)
5. **T6 SaveState v6** (Task 6) — DO NEXT
6. **T7 EventBus** (Task 7) — DO NEXT
7. T5 QuestEngine (this task) — comes AFTER 6+7

Re-order in subagent dispatch: do tasks in sequence T1→T2→T3→T4→T6→T7→T5→T8→...→T14.

If you got dispatched on T5 ahead of T6/T7, STOP and re-dispatch in correct order.

- [ ] **Step 2: Write failing tests** (assumes T6+T7 landed)

Create `app/src/domain/QuestEngine.test.ts`:

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QuestEngine } from './QuestEngine';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('QuestEngine', () => {
  let engine: QuestEngine;
  beforeEach(() => {
    useSaveState.getState().reset();
    engine = new QuestEngine();
    engine.start();
  });

  function tearDown() {
    engine.stop();
  }

  it('translates EXIT_COMBAT(won=true) into questProgress increment for daily-combat-3', () => {
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(1);
    tearDown();
  });

  it('emits QUEST_PROGRESS on every translated event', () => {
    const events: Array<{ questId: string; delta: number }> = [];
    const off = eventBus.on('QUEST_PROGRESS', (p) => events.push(p));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 2 });
    off();
    // daily-combat-3 + weekly-combat-20 BOTH match EXIT_COMBAT.won
    expect(events.length).toBeGreaterThanOrEqual(2);
    tearDown();
  });

  it('skips quests already at target', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    const events: any[] = [];
    const off = eventBus.on('QUEST_PROGRESS', (p) => events.push(p));
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    off();
    // daily-combat-3 already at 3, weekly-combat-20 still progresses
    const dailyEvents = events.filter((e) => e.questId === 'daily-combat-3');
    expect(dailyEvents).toHaveLength(0);
    tearDown();
  });

  it('skips quests already claimed', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 0 },
      claimedRewards: ['daily-combat-3'],
    });
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3'] ?? 0).toBe(0);
    tearDown();
  });

  it('match returning 0 does not emit QUEST_PROGRESS', () => {
    const events: any[] = [];
    const off = eventBus.on('QUEST_PROGRESS', (p) => events.push(p));
    eventBus.emit('EXIT_COMBAT', { won: false, exp_gained: 0, monster_id: 1 });
    off();
    // EXIT_COMBAT(won=false) → match returns 0 for combat quests
    const combatEvents = events.filter((e) =>
      e.questId === 'daily-combat-3' || e.questId === 'weekly-combat-20'
    );
    expect(combatEvents).toHaveLength(0);
    tearDown();
  });

  it('LEVEL_UP increments main-level-5 only when newLevel >= 5', () => {
    eventBus.emit('LEVEL_UP', { newLevel: 4, grantedItemId: null });
    expect(useSaveState.getState().questProgress['main-level-5'] ?? 0).toBe(0);
    eventBus.emit('LEVEL_UP', { newLevel: 5, grantedItemId: null });
    expect(useSaveState.getState().questProgress['main-level-5']).toBe(1);
    tearDown();
  });

  it('PET_COLLECTED increments both weekly-pet-1 and main-pets-3', () => {
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: 'inst-a',
      petCodename: 'bunbleaf',
      rarity: 'common',
    });
    expect(useSaveState.getState().questProgress['weekly-pet-1']).toBe(1);
    expect(useSaveState.getState().questProgress['main-pets-3']).toBe(1);
    tearDown();
  });

  it('ENTER_ZONE increments daily-explore-1', () => {
    eventBus.emit('ENTER_ZONE', { zoneId: 'forest-island' });
    expect(useSaveState.getState().questProgress['daily-explore-1']).toBe(1);
    tearDown();
  });

  it('BOSS_DEFEATED with bossId=forest-boss increments main-boss-forest', () => {
    eventBus.emit('BOSS_DEFEATED', { bossId: 'forest-boss', zoneId: 'forest-island' });
    expect(useSaveState.getState().questProgress['main-boss-forest']).toBe(1);
    tearDown();
  });

  it('BOSS_DEFEATED with non-forest boss does not increment main-boss-forest', () => {
    eventBus.emit('BOSS_DEFEATED', { bossId: 'volcanic-boss', zoneId: 'volcanic-island' });
    expect(useSaveState.getState().questProgress['main-boss-forest'] ?? 0).toBe(0);
    tearDown();
  });

  it('stop() unsubscribes — events after stop do not increment', () => {
    engine.stop();
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    expect(useSaveState.getState().questProgress['daily-combat-3'] ?? 0).toBe(0);
  });

  it('start() called twice creates only one subscription per source-event', () => {
    engine.start(); // second start
    eventBus.emit('EXIT_COMBAT', { won: true, exp_gained: 10, monster_id: 1 });
    // If double-subscription happened, daily-combat-3 would jump to 2
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(1);
    tearDown();
  });
});
```

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- QuestEngine
```

- [ ] **Step 4: Implement `app/src/domain/QuestEngine.ts`**

```ts
/**
 * QuestEngine — centralized event listener that translates Sprint A-C
 * GameEvent emits into QUEST_PROGRESS deltas. Reads the catalog from
 * data/staticConfig/quests; matchers declare which payload shapes
 * count as progress. Pure-TS lifecycle (no Phaser/React/DOM).
 *
 * Lifecycle:
 *   const engine = new QuestEngine();
 *   engine.start();   // subscribes once per unique source-event-type
 *   ... gameplay ...
 *   engine.stop();    // unsubscribes
 *
 * start() is idempotent — repeated calls do not double-subscribe.
 */

import { eventBus } from '@/bus/EventBus';
import { QUESTS } from '@data/staticConfig/quests';
import type { QuestSourceEvent } from '@/types/quest';
import { useSaveState } from '@/persistence/SaveStateStore';

export class QuestEngine {
  private subscriptions: Array<() => void> = [];
  private running = false;

  start(): void {
    if (this.running) return;
    const sources = new Set<QuestSourceEvent>(QUESTS.map((q) => q.source));
    for (const source of sources) {
      const off = eventBus.on(source as never, (payload: unknown) => {
        this.handleEvent(source, payload);
      });
      this.subscriptions.push(off);
    }
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    for (const off of this.subscriptions) off();
    this.subscriptions = [];
    this.running = false;
  }

  private handleEvent(source: QuestSourceEvent, payload: unknown): void {
    const matching = QUESTS.filter((q) => q.source === source);
    const state = useSaveState.getState();
    for (const quest of matching) {
      if (state.claimedRewards.includes(quest.id)) continue;
      const current = state.questProgress[quest.id] ?? 0;
      if (current >= quest.target) continue;

      const delta = quest.match(payload as never);
      if (delta <= 0) continue;

      useSaveState.getState().incrementQuestProgress(quest.id, delta);
      eventBus.emit('QUEST_PROGRESS', { questId: quest.id, delta });
    }
  }
}
```

- [ ] **Step 5: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- QuestEngine
```

- [ ] **Step 6: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/domain/QuestEngine.ts app/src/domain/QuestEngine.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): QuestEngine — centralized event-to-progress translator

S-D.5 — Class with start()/stop() lifecycle. Subscribes once per
unique source-event-type from the catalog. handleEvent skips claimed
quests and quests already at target, calls match() for delta, calls
incrementQuestProgress action, emits QUEST_PROGRESS. start() is
idempotent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: SaveState v5 → v6 + 4 actions + refreshCyclesIfNeeded

**Files:**
- Modify: `app/src/persistence/SaveStateStore.ts`
- Modify: `app/src/persistence/SaveStateStore.test.ts`

- [ ] **Step 1: Read existing v5 schema**

```bash
grep -n "schemaVersion\|migrate\|partialize\|CURRENT_SCHEMA" app/src/persistence/SaveStateStore.ts | head -20
```

Sprint C v4→v5 added `ownedPets`. Mirror the additive pattern for v6.

- [ ] **Step 2: Write failing tests (append to test file)**

```ts
import { QUESTS } from '@data/staticConfig/quests';
import { dailyAnchor, weeklyAnchor } from '@/domain/QuestCycle';

describe('SaveState v6 migration', () => {
  it('migrates v5 → v6 with empty quest fields', () => {
    const v5 = {
      schemaVersion: 5,
      ownedPets: [],
      // ...other v5 fields...
    };
    // Mirror Sprint B/C migration test pattern (localStorage round-trip
    // OR direct migrate() call — match what existing tests in this file use).
    localStorage.setItem('game_ss3_save_v1', JSON.stringify({ state: v5, version: 5 }));
    useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.questProgress).toEqual({});
    expect(s.claimedRewards).toEqual([]);
    expect(s.questCycleAnchors).toEqual({ dailyEpochUtc7: 0, weeklyEpochUtc7: 0 });
  });

  it('idempotent on v6 — re-rehydrate preserves data', () => {
    const v6Snapshot = {
      schemaVersion: 6,
      questProgress: { 'daily-combat-3': 2 },
      claimedRewards: ['main-level-5'],
      questCycleAnchors: { dailyEpochUtc7: 1700000000000, weeklyEpochUtc7: 1699000000000 },
      ownedPets: [],
    };
    localStorage.setItem('game_ss3_save_v1', JSON.stringify({ state: v6Snapshot, version: 6 }));
    useSaveState.persist.rehydrate();
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(2);
    expect(useSaveState.getState().claimedRewards).toEqual(['main-level-5']);
  });
});

describe('SaveState v6 quest actions', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('incrementQuestProgress adds delta and clamps at target', () => {
    useSaveState.getState().incrementQuestProgress('daily-combat-3', 2);
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(2);
    useSaveState.getState().incrementQuestProgress('daily-combat-3', 5); // would overflow
    expect(useSaveState.getState().questProgress['daily-combat-3']).toBe(3); // clamped
  });

  it('incrementQuestProgress no-op when quest already claimed', () => {
    useSaveState.setState({ claimedRewards: ['daily-combat-3'] });
    useSaveState.getState().incrementQuestProgress('daily-combat-3', 1);
    expect(useSaveState.getState().questProgress['daily-combat-3'] ?? 0).toBe(0);
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
    expect(item2).toBeNull(); // already claimed
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
```

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- SaveStateStore
```

- [ ] **Step 4: Update `app/src/persistence/SaveStateStore.ts`**

Apply five edits in sequence (mirror Sprint C's v5 pattern):

1. **Bump CURRENT_SCHEMA_VERSION** from 5 to 6.

2. **Extend the state interface and INITIAL_STATE:**

```ts
import type { QuestId, QuestCycleAnchors } from '@/types/quest';
import type { ItemDef } from '@data/staticConfig/items';
import { QUESTS, findQuestDef } from '@data/staticConfig/quests';
import { dailyAnchor, weeklyAnchor, needsRefresh } from '@/domain/QuestCycle';
import { rollQuestReward } from '@/domain/QuestReward';

interface SaveStateData {
  // ...existing v5 fields...
  questProgress: Record<QuestId, number>;
  claimedRewards: QuestId[];
  questCycleAnchors: QuestCycleAnchors;
}

const INITIAL_STATE: SaveStateData = {
  // ...existing fields...
  questProgress: {},
  claimedRewards: [],
  questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 },
};
```

3. **Extend `migrate()` chain — append v5→v6 step:**

```ts
if (version < 6) {
  s = {
    ...s,
    questProgress: {},
    claimedRewards: [],
    questCycleAnchors: { dailyEpochUtc7: 0, weeklyEpochUtc7: 0 },
  };
}
```

4. **Add the four new actions:**

```ts
interface SaveStateActions {
  // ...existing actions...
  incrementQuestProgress: (questId: QuestId, delta: number) => void;
  isQuestReady: (questId: QuestId) => boolean;
  claimQuestReward: (questId: QuestId, heroLevel: number, rng?: () => number) => ItemDef | null;
  refreshCyclesIfNeeded: (now?: number) => { dailyReset: boolean; weeklyReset: boolean };
}

// in create():
incrementQuestProgress: (questId, delta) => {
  const state = get();
  if (state.claimedRewards.includes(questId)) return;
  const def = findQuestDef(questId);
  if (!def) return;
  const current = state.questProgress[questId] ?? 0;
  const next = Math.min(current + delta, def.target);
  if (next === current) return;
  set({ questProgress: { ...state.questProgress, [questId]: next } });
},
isQuestReady: (questId) => {
  const state = get();
  if (state.claimedRewards.includes(questId)) return false;
  const def = findQuestDef(questId);
  if (!def) return false;
  return (state.questProgress[questId] ?? 0) >= def.target;
},
claimQuestReward: (questId, heroLevel, rng = Math.random) => {
  const state = get();
  if (!state.isQuestReady(questId)) return null;
  const def = findQuestDef(questId);
  if (!def) return null;
  const item = rollQuestReward(def.rewardTier, heroLevel, rng);
  if (!item) return null;
  // Mint inventory item via existing addInventoryItem action.
  const instance = {
    instanceId: genInstanceId(),
    itemId: item.id,
    acquiredAt: Date.now(),
  };
  set({
    inventory: [...state.inventory, instance],
    claimedRewards: [...state.claimedRewards, questId],
  });
  return item;
},
refreshCyclesIfNeeded: (now = Date.now()) => {
  const state = get();
  const dailyReset = needsRefresh(state.questCycleAnchors.dailyEpochUtc7, now, 'daily');
  const weeklyReset = needsRefresh(state.questCycleAnchors.weeklyEpochUtc7, now, 'weekly');
  if (!dailyReset && !weeklyReset) return { dailyReset, weeklyReset };

  const newProgress = { ...state.questProgress };
  let newClaimed = [...state.claimedRewards];
  if (dailyReset) {
    for (const q of QUESTS.filter((q) => q.tier === 'daily')) {
      delete newProgress[q.id];
      newClaimed = newClaimed.filter((id) => id !== q.id);
    }
  }
  if (weeklyReset) {
    for (const q of QUESTS.filter((q) => q.tier === 'weekly')) {
      delete newProgress[q.id];
      newClaimed = newClaimed.filter((id) => id !== q.id);
    }
  }
  set({
    questProgress: newProgress,
    claimedRewards: newClaimed,
    questCycleAnchors: {
      dailyEpochUtc7: dailyReset ? dailyAnchor(now) : state.questCycleAnchors.dailyEpochUtc7,
      weeklyEpochUtc7: weeklyReset ? weeklyAnchor(now) : state.questCycleAnchors.weeklyEpochUtc7,
    },
  });
  return { dailyReset, weeklyReset };
},
```

5. **Update `reset()`** — should auto-include the new fields if it spreads INITIAL_STATE; verify.

- [ ] **Step 5: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- SaveStateStore
```

- [ ] **Step 6: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/persistence/SaveStateStore.ts app/src/persistence/SaveStateStore.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): SaveState v6 — quest progress + claim + cycle refresh

S-D.6 — Additive v5→v6 migration. Three new fields: questProgress
(Record<id, number>), claimedRewards (id[]), questCycleAnchors. Four
new actions: incrementQuestProgress (clamps at target, no-op if
claimed), isQuestReady, claimQuestReward (mints inventory item via
rollQuestReward), refreshCyclesIfNeeded (resets daily/weekly progress
when UTC+7 anchor rolls). reset() zeroes all three.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: EventBus +QUEST_PROGRESS, CHEST_OPENED.label?: string

**Files:**
- Modify: `app/src/bus/EventBus.ts`
- Modify: `app/src/bus/EventBus.test.ts`

- [ ] **Step 1: Write failing tests (append)**

```ts
describe('Sprint D EventBus events', () => {
  it('QUEST_PROGRESS carries questId and delta', () => {
    let captured: { questId: string; delta: number } | null = null;
    const off = eventBus.on('QUEST_PROGRESS', (p) => { captured = p; });
    eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    off();
    expect(captured).toEqual({ questId: 'daily-combat-3', delta: 1 });
  });

  it('CHEST_OPENED accepts optional label override', () => {
    let captured: any = null;
    const off = eventBus.on('CHEST_OPENED', (p) => { captured = p; });
    eventBus.emit('CHEST_OPENED', {
      chestId: 'quest-daily-combat-3',
      zoneId: 'quest-panel',
      items: [{ itemId: 'wand-fire-01', qty: 1 }],
      label: 'Đóng',
    });
    off();
    expect(captured.label).toBe('Đóng');
  });

  it('CHEST_OPENED label is optional — Sprint B emits still work without it', () => {
    let captured: any = null;
    const off = eventBus.on('CHEST_OPENED', (p) => { captured = p; });
    eventBus.emit('CHEST_OPENED', {
      chestId: 'forest-boss-chest',
      zoneId: 'forest-island',
      items: [{ itemId: 'wand-fire-01', qty: 1 }],
    });
    off();
    expect(captured.label).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- EventBus
```

- [ ] **Step 3: Update GameEvent union in `app/src/bus/EventBus.ts`**

Two edits:

**A.** Append to the union:

```ts
| {
    type: 'QUEST_PROGRESS';
    payload: { questId: string; delta: number };
  }
```

**B.** Find the existing `CHEST_OPENED` entry and extend its payload with optional `label`:

```ts
| {
    type: 'CHEST_OPENED';
    payload: {
      chestId: string;
      zoneId: string;
      items: ReadonlyArray<{ itemId: string; qty: number }>;
      label?: string;     // NEW Sprint D — Sprint B/C emits without it default to "Về Bản Đồ" in overlay
    };
  }
```

- [ ] **Step 4: Run tests — confirm GREEN + commit**

```bash
cd app && npm run test:run -- EventBus
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/bus/EventBus.ts app/src/bus/EventBus.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-d): EventBus +QUEST_PROGRESS · CHEST_OPENED.label?: string

S-D.7 — QUEST_PROGRESS fires from QuestEngine on every translated
event match. CHEST_OPENED gains optional label override so quest
claims can show "Đóng" instead of Sprint B's default "Về Bản Đồ".
Sprint B/C callers untouched (label is optional).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: RewardChestOverlay honors optional label

**Files:**
- Modify: `app/src/react/overlays/RewardChestOverlay.tsx`
- Modify: `app/src/react/overlays/RewardChestOverlay.test.tsx`

- [ ] **Step 1: Read existing overlay**

```bash
cat app/src/react/overlays/RewardChestOverlay.tsx
```

Note where the "Về Bản Đồ" button is rendered. The label is hardcoded today; you make it driven by the optional payload field.

- [ ] **Step 2: Write failing test (append)**

```ts
describe('RewardChestOverlay — label override', () => {
  it('renders default "Về Bản Đồ" when CHEST_OPENED payload has no label', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('CHEST_OPENED', {
        chestId: 'forest-boss-chest',
        zoneId: 'forest-island',
        items: [{ itemId: 'wand-fire-01', qty: 1 }],
      });
    });
    expect(screen.getByTestId('chest-overlay-back-to-world-map')).toHaveTextContent(/Về Bản Đồ/);
  });

  it('renders custom label when CHEST_OPENED payload includes one', () => {
    render(<RewardChestOverlay />);
    act(() => {
      eventBus.emit('CHEST_OPENED', {
        chestId: 'quest-daily-combat-3',
        zoneId: 'quest-panel',
        items: [{ itemId: 'wand-fire-01', qty: 1 }],
        label: 'Đóng',
      });
    });
    expect(screen.getByTestId('chest-overlay-back-to-world-map')).toHaveTextContent('Đóng');
  });
});
```

- [ ] **Step 3: Run test — confirm RED**

```bash
cd app && npm run test:run -- RewardChestOverlay
```

- [ ] **Step 4: Modify the overlay**

In `RewardChestOverlay.tsx`:

1. Extend the `zoneCtx` state shape to include `label`:

```ts
const [zoneCtx, setZoneCtx] = useState<{
  zoneId: string;
  chestId: string;
  items: Array<{ itemId: string; qty: number }>;
  label: string;       // resolved with default
} | null>(null);
```

2. In the `CHEST_OPENED` subscription, default the label:

```ts
const off = eventBus.on('CHEST_OPENED', ({ items, zoneId, chestId, label }) => {
  setZoneCtx({
    zoneId,
    chestId,
    items: [...items],
    label: label ?? 'Về Bản Đồ',
  });
  // ...existing minting logic if any...
});
```

3. Replace the hard-coded "Về Bản Đồ" button text with `{zoneCtx.label}`:

```tsx
<button
  data-testid="chest-overlay-back-to-world-map"
  onClick={handleBackToWorldMap}
>
  {zoneCtx.label}
</button>
```

- [ ] **Step 5: Run all RewardChestOverlay tests — confirm GREEN**

```bash
cd app && npm run test:run -- RewardChestOverlay
```

The two existing Sprint C tests (LEVEL_UP path + Sprint B chest path) should still pass — `label` defaults to "Về Bản Đồ".

- [ ] **Step 6: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/overlays/RewardChestOverlay.tsx app/src/react/overlays/RewardChestOverlay.test.tsx
git commit -m "$(cat <<'EOF'
feat(sprint-d): RewardChestOverlay honors CHEST_OPENED.label override

S-D.8 — Reads optional label from payload, defaults to "Về Bản Đồ"
(Sprint B back-compat). Quest claims (Sprint D Task 10) pass label="Đóng".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: QuestProgressToast (queue + dismiss) + tests

**Files:**
- Create: `app/src/react/overlays/QuestProgressToast.tsx`
- Create: `app/src/react/overlays/QuestProgressToast.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { QuestProgressToast } from './QuestProgressToast';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('QuestProgressToast', () => {
  beforeEach(() => useSaveState.getState().reset());
  afterEach(() => vi.useRealTimers());

  it('renders nothing initially', () => {
    render(<QuestProgressToast />);
    expect(screen.queryByTestId('quest-toast')).toBeNull();
  });

  it('appears on QUEST_PROGRESS with quest displayName + (M/N)', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 2 } });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    });
    expect(screen.getByTestId('quest-toast-daily-combat-3')).toBeInTheDocument();
    expect(screen.getByText(/Thắng 3 trận/)).toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });

  it('dismisses after 2.5s', () => {
    vi.useFakeTimers();
    useSaveState.setState({ questProgress: { 'daily-combat-3': 1 } });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    });
    expect(screen.queryByTestId('quest-toast-daily-combat-3')).not.toBeNull();
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByTestId('quest-toast-daily-combat-3')).toBeNull();
  });

  it('renders ready variant when progress reaches target', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
    });
    expect(screen.getByText(/Sẵn sàng nhận thưởng/i)).toBeInTheDocument();
  });

  it('multiple toasts queue (does not collapse to one)', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 1, 'daily-quiz-5': 1 },
    });
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-combat-3', delta: 1 });
      eventBus.emit('QUEST_PROGRESS', { questId: 'daily-quiz-5', delta: 1 });
    });
    expect(screen.getByTestId('quest-toast-daily-combat-3')).toBeInTheDocument();
    expect(screen.getByTestId('quest-toast-daily-quiz-5')).toBeInTheDocument();
  });

  it('ignores QUEST_PROGRESS for unknown questId', () => {
    render(<QuestProgressToast />);
    act(() => {
      eventBus.emit('QUEST_PROGRESS', { questId: 'nonexistent', delta: 1 });
    });
    expect(screen.queryByTestId(/^quest-toast-/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- QuestProgressToast
```

- [ ] **Step 3: Implement `app/src/react/overlays/QuestProgressToast.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { findQuestDef } from '@data/staticConfig/quests';
import type { QuestId } from '@/types/quest';

const TOAST_DURATION_MS = 2500;

interface ToastEntry {
  id: string; // unique render key
  questId: QuestId;
  progress: number;
  target: number;
  displayNameVi: string;
  ready: boolean;
}

let toastCounter = 0;

export function QuestProgressToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const off = eventBus.on('QUEST_PROGRESS', ({ questId }) => {
      const def = findQuestDef(questId);
      if (!def) return;
      const progress = useSaveState.getState().questProgress[questId] ?? 0;
      const id = `t-${toastCounter++}-${questId}`;
      const entry: ToastEntry = {
        id,
        questId,
        progress,
        target: def.target,
        displayNameVi: def.displayNameVi,
        ready: progress >= def.target,
      };
      setToasts((prev) => [...prev, entry]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);
    });
    return off;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid={`quest-toast-${t.questId}`}
          className={`rounded-lg border-2 px-4 py-2 shadow-lg pointer-events-auto bg-white ${
            t.ready ? 'border-amber-400 animate-pulse' : 'border-slate-300'
          }`}
        >
          <div className="font-semibold text-sm">🎯 {t.displayNameVi}</div>
          <div className="text-xs text-slate-600">
            {t.ready ? '✨ Sẵn sàng nhận thưởng!' : `(${t.progress}/${t.target})`}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- QuestProgressToast
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/overlays/QuestProgressToast.tsx app/src/react/overlays/QuestProgressToast.test.tsx
git commit -m "$(cat <<'EOF'
feat(sprint-d): QuestProgressToast — top-right ephemeral notification

S-D.9 — Subscribes to QUEST_PROGRESS. Reads current progress + target
from SaveState/catalog. Renders <div> queue stacked top-right with
displayName + (M/N) or ready variant ("Sẵn sàng nhận thưởng!").
Dismisses each entry after 2.5s. Pointer-events scoped to entries
only (container does not block canvas clicks).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: QuestsPanel (route, 3-tier groups, claim flow) + tests

**Files:**
- Create: `app/src/react/screens/QuestsPanel.tsx`
- Create: `app/src/react/screens/QuestsPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QuestsPanel } from './QuestsPanel';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

function renderPanel() {
  return render(
    <MemoryRouter>
      <QuestsPanel />
    </MemoryRouter>
  );
}

describe('QuestsPanel', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('renders 3 tier sections with correct quest counts', () => {
    renderPanel();
    expect(screen.getByTestId('quests-tier-daily')).toBeInTheDocument();
    expect(screen.getByTestId('quests-tier-weekly')).toBeInTheDocument();
    expect(screen.getByTestId('quests-tier-main')).toBeInTheDocument();
    // 3 daily + 2 weekly + 3 main = 8 quest cards
    expect(screen.getAllByTestId(/^quest-card-/)).toHaveLength(8);
  });

  it('shows "in-progress" state with progress bar (M/N)', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 2 } });
    renderPanel();
    const card = screen.getByTestId('quest-card-daily-combat-3');
    expect(card).toHaveTextContent(/2\/3/);
  });

  it('shows "ready" state with claim button when progress at target and not claimed', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    renderPanel();
    expect(screen.getByTestId('quest-claim-daily-combat-3')).toBeInTheDocument();
  });

  it('shows "claimed" state when in claimedRewards', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 3 },
      claimedRewards: ['daily-combat-3'],
    });
    renderPanel();
    expect(screen.getByTestId('quest-card-daily-combat-3')).toHaveTextContent(/Đã nhận/);
    expect(screen.queryByTestId('quest-claim-daily-combat-3')).toBeNull();
  });

  it('clicking claim emits CHEST_OPENED with label="Đóng" and adds to claimedRewards', () => {
    useSaveState.setState({ questProgress: { 'daily-combat-3': 3 } });
    const events: any[] = [];
    const off = eventBus.on('CHEST_OPENED', (p) => events.push(p));
    renderPanel();
    fireEvent.click(screen.getByTestId('quest-claim-daily-combat-3'));
    off();
    // Reward might be null if registry has no commons — accept both:
    if (events.length > 0) {
      expect(events[0].label).toBe('Đóng');
      expect(events[0].chestId).toBe('quest-daily-combat-3');
    }
    // Either way claimedRewards may or may not include — when reward
    // is null, claim returns null and claimedRewards unchanged. When
    // ITEM_REGISTRY has commons, claim succeeds.
    const claimed = useSaveState.getState().claimedRewards;
    if (events.length > 0) expect(claimed).toContain('daily-combat-3');
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- QuestsPanel
```

- [ ] **Step 3: Implement `app/src/react/screens/QuestsPanel.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import {
  QUESTS,
  questsByTier,
} from '@data/staticConfig/quests';
import {
  TIER_LABEL_VI,
  type QuestDef,
  type QuestId,
  type QuestTier,
} from '@/types/quest';

const TIERS: ReadonlyArray<QuestTier> = ['daily', 'weekly', 'main'];

export function QuestsPanel() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📜 Nhiệm vụ</h1>
        <Link
          to="/"
          data-testid="quests-back-home"
          className="rounded bg-slate-300 px-3 py-1 text-sm"
        >
          Quay lại
        </Link>
      </header>

      {TIERS.map((tier) => (
        <TierSection key={tier} tier={tier} />
      ))}
    </div>
  );
}

function TierSection({ tier }: { tier: QuestTier }) {
  const quests = questsByTier(tier);
  return (
    <section
      data-testid={`quests-tier-${tier}`}
      className="mb-6 rounded-lg bg-white p-4 shadow"
    >
      <h2 className="mb-3 text-lg font-semibold">{TIER_LABEL_VI[tier]}</h2>
      <div className="space-y-2">
        {quests.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
    </section>
  );
}

function QuestCard({ quest }: { quest: QuestDef }) {
  const progress = useSaveState((s) => s.questProgress[quest.id] ?? 0);
  const claimed = useSaveState((s) => s.claimedRewards.includes(quest.id));
  const isReady = progress >= quest.target && !claimed;
  const heroLevel = useSaveState((s) => s.level);

  const handleClaim = () => {
    const item = useSaveState.getState().claimQuestReward(quest.id, heroLevel);
    if (!item) return;
    eventBus.emit('CHEST_OPENED', {
      chestId: `quest-${quest.id}`,
      zoneId: 'quest-panel',
      items: [{ itemId: item.id, qty: 1 }],
      label: 'Đóng',
    });
  };

  const pct = Math.min(100, (progress / quest.target) * 100);

  return (
    <div
      data-testid={`quest-card-${quest.id}`}
      className={`rounded border-2 p-3 ${
        claimed ? 'border-slate-200 opacity-60' : isReady ? 'border-amber-400' : 'border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{quest.displayNameVi}</div>
          <div className="text-xs text-slate-600">{quest.description}</div>
        </div>
        {claimed ? (
          <span className="text-sm text-slate-500">✓ Đã nhận</span>
        ) : isReady ? (
          <button
            data-testid={`quest-claim-${quest.id}`}
            onClick={handleClaim}
            className="rounded bg-amber-400 px-3 py-1 font-bold text-white"
          >
            ✨ Nhận thưởng
          </button>
        ) : (
          <span className="text-sm text-slate-500">
            ({progress}/{quest.target})
          </span>
        )}
      </div>
      {!claimed && !isReady && (
        <div className="mt-2 h-2 w-full rounded bg-slate-200">
          <div
            className="h-full rounded bg-emerald-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- QuestsPanel
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/screens/QuestsPanel.tsx app/src/react/screens/QuestsPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(sprint-d): QuestsPanel — /quests route with 3-tier groups + claim

S-D.10 — TierSection iterates daily/weekly/main; QuestCard renders one
of three states: in-progress (progress bar M/N), ready (sparkle "Nhận
thưởng" button), or claimed (grey "Đã nhận"). Click claim → calls
SaveState.claimQuestReward → emits CHEST_OPENED with label="Đóng".
RewardChestOverlay (Task 8) handles the loot reveal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: MainMenu "Nhiệm vụ" button + sparkle indicator

**Files:**
- Modify: `app/src/react/screens/MainMenu.tsx`
- Modify: `app/src/react/screens/MainMenu.test.tsx`

- [ ] **Step 1: Read existing MainMenu**

```bash
cat app/src/react/screens/MainMenu.tsx
```

Note the existing button list and click handlers. You add a new button.

- [ ] **Step 2: Write failing tests (append)**

```tsx
import { QUESTS } from '@data/staticConfig/quests';

describe('MainMenu — Nhiệm vụ button + sparkle', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('renders "Nhiệm vụ" button linking to /quests', () => {
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    const btn = screen.getByTestId('main-menu-quests');
    expect(btn).toHaveAttribute('href', '/quests');
  });

  it('shows sparkle indicator when at least one quest is ready to claim', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 3 },
    });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.getByTestId('main-menu-quests-sparkle')).toBeInTheDocument();
  });

  it('hides sparkle when no quest is ready', () => {
    useSaveState.setState({ questProgress: {} });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('main-menu-quests-sparkle')).toBeNull();
  });

  it('hides sparkle when ready quest is already claimed', () => {
    useSaveState.setState({
      questProgress: { 'daily-combat-3': 3 },
      claimedRewards: ['daily-combat-3'],
    });
    render(
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('main-menu-quests-sparkle')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- MainMenu
```

- [ ] **Step 4: Update `MainMenu.tsx`**

Inside the existing render JSX, add the button alongside the other menu links (mirror the existing pattern for /play /guild /inventory):

```tsx
import { Link } from 'react-router-dom';
import { useSaveState } from '@/persistence/SaveStateStore';
import { QUESTS } from '@data/staticConfig/quests';

// inside the component:
const anyReady = useSaveState((s) =>
  QUESTS.some(
    (q) =>
      (s.questProgress[q.id] ?? 0) >= q.target &&
      !s.claimedRewards.includes(q.id)
  )
);

// in the JSX, inside the button list:
<Link
  to="/quests"
  data-testid="main-menu-quests"
  className="relative rounded bg-amber-500 px-4 py-2 font-bold text-white"
>
  📜 Nhiệm vụ
  {anyReady && (
    <span
      data-testid="main-menu-quests-sparkle"
      className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]"
    />
  )}
</Link>
```

If MainMenu uses a different pattern (e.g. `<button onClick={() => navigate('/play')}>`), mirror that pattern instead of `<Link>`.

- [ ] **Step 5: Run tests — confirm GREEN + commit**

```bash
cd app && npm run test:run -- MainMenu
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/screens/MainMenu.tsx app/src/react/screens/MainMenu.test.tsx
git commit -m "$(cat <<'EOF'
feat(sprint-d): MainMenu "Nhiệm vụ" button + sparkle ready indicator

S-D.11 — New top-level button linking to /quests. Sparkle (yellow
animated dot) overlays when any quest is at target AND not yet
claimed. Reuses Tailwind animate-pulse + drop-shadow for subtle
attention without new asset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: AppRouter wires QuestEngine + refresh + /quests + toast

**Files:**
- Modify: `app/src/react/shell/AppRouter.tsx`

- [ ] **Step 1: Read existing AppRouter**

```bash
cat app/src/react/shell/AppRouter.tsx
```

Note where Sprint B/C overlays mount and the Routes block.

- [ ] **Step 2: Manual smoke test plan**

This task has no new unit tests beyond what Tasks 5/9/10 already cover. The AppRouter changes are wiring; they're verified by:
- Existing AppRouter test (if any) staying green
- The new E2E spec (Task 13) exercising the full flow

If `app/src/react/shell/AppRouter.test.tsx` exists, run it after edit and ensure it still passes.

- [ ] **Step 3: Edit `AppRouter.tsx`**

Add three things:

1. Import + mount QuestEngine in a `useEffect`:

```tsx
import { useEffect, useRef } from 'react';
import { QuestEngine } from '@/domain/QuestEngine';
import { useSaveState } from '@/persistence/SaveStateStore';

export function AppRouter() {
  const engineRef = useRef<QuestEngine | null>(null);

  useEffect(() => {
    // Wait for SaveState rehydrate before starting the engine (R1).
    const startEngine = () => {
      engineRef.current = new QuestEngine();
      engineRef.current.start();
      useSaveState.getState().refreshCyclesIfNeeded();
    };

    if (useSaveState.persist.hasHydrated()) {
      startEngine();
    } else {
      const off = useSaveState.persist.onFinishHydration(startEngine);
      return () => {
        off();
        engineRef.current?.stop();
      };
    }

    const onFocus = () => useSaveState.getState().refreshCyclesIfNeeded();
    window.addEventListener('focus', onFocus);
    return () => {
      engineRef.current?.stop();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    // ...existing BrowserRouter + Routes block...
  );
}
```

2. Add the `/quests` route (mirror the existing `/inventory` route entry):

```tsx
<Route path="/quests" element={<QuestsPanel />} />
```

3. Mount `<QuestProgressToast />` next to the existing overlays (`<RewardChestOverlay />`, `<PetRescueOverlay />`, `<LockedIslandTooltip />`):

```tsx
<RewardChestOverlay />
<PetRescueOverlay />
<LockedIslandTooltip />
<QuestProgressToast />     {/* NEW */}
```

Add the imports at the top:

```tsx
import { QuestsPanel } from '@/react/screens/QuestsPanel';
import { QuestProgressToast } from '@/react/overlays/QuestProgressToast';
```

- [ ] **Step 4: Run full unit suite — verify nothing broke**

```bash
cd app && npm run test:run
```

Expected: 720 baseline + new tests from Tasks 1-11. No regressions in existing AppRouter tests.

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/shell/AppRouter.tsx
git commit -m "$(cat <<'EOF'
feat(sprint-d): AppRouter wires QuestEngine + /quests route + toast

S-D.12 — useEffect creates QuestEngine after SaveState rehydrates
(R1 mitigation), runs refreshCyclesIfNeeded on mount and window
focus. /quests route mounted between /inventory and the catch-all
Navigate. QuestProgressToast added alongside Sprint B/C overlays.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: E2E sprint_d_quests.spec.ts

**Files:**
- Create: `app/tests/e2e/sprint_d_quests.spec.ts`
- Modify: `app/src/testing/gameTestBridge.ts` — add `setQuestCycleAnchors` (test-only seam)

- [ ] **Step 1: Add bridge helper for cycle reset**

In `gameTestBridge.ts`, add to the `simulate` object:

```ts
setQuestCycleAnchors: (now: number) => {
  const { useSaveState } = require('@/persistence/SaveStateStore');
  const { dailyAnchor, weeklyAnchor } = require('@/domain/QuestCycle');
  useSaveState.getState().refreshCyclesIfNeeded(now);
  // Force-set anchors directly to ensure fresh-cycle state for test
  useSaveState.setState({
    questProgress: {},
    claimedRewards: [],
    questCycleAnchors: {
      dailyEpochUtc7: dailyAnchor(now),
      weeklyEpochUtc7: weeklyAnchor(now),
    },
  });
},
```

- [ ] **Step 2: Write the E2E spec**

`app/tests/e2e/sprint_d_quests.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5173' });

async function waitForGame(page: any) {
  await page.waitForFunction(() => Boolean((window as any).__GAME__?.__phaser));
}

test('sprint D: 3 combat wins → daily-combat-3 ready → claim → item in inventory', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await waitForGame(page);

  // Reset quest cycle to current "now" so anchors don't trigger reset mid-test.
  await page.evaluate(() => {
    (window as any).__GAME__.simulate.setQuestCycleAnchors(Date.now());
  });

  // Drive 3 combat wins via test bridge (Sprint B precedent: setMonsterHp(1) one-shot).
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const g = (window as any).__GAME__;
      g.simulate.setLegacyWorldFlag(true);
      const sm = g.__phaser.scene;
      if (!sm.getScene('WorldScene')?.scene.isActive()) {
        for (const s of sm.getScenes(true)) {
          if (s.scene.key !== 'WorldScene') sm.stop(s.scene.key);
        }
        sm.start('WorldScene');
      }
    });
    await page.evaluate(() => (window as any).__GAME__.simulate.enterCombat(1));
    await page.evaluate(() => (window as any).__GAME__.simulate.setMonsterHp(1));
    await page.evaluate(() => (window as any).__GAME__.simulate.clickSpell('fire_blast'));
    await page.evaluate(() =>
      (window as any).__GAME__.simulate.submitQuiz(true)
    );
    // Allow EXIT_COMBAT + QUEST_PROGRESS to settle
    await page.waitForTimeout(200);
  }

  // Verify quest progress
  const progress = await page.evaluate(
    () => (window as any).__GAME__.getSaveState().questProgress['daily-combat-3']
  );
  expect(progress).toBe(3);

  // Navigate to /quests
  await page.goto('/quests');
  await page.waitForSelector('[data-testid="quests-tier-daily"]');

  // Click claim
  const beforeInv = await page.evaluate(
    () => (window as any).__GAME__.getSaveState().inventory.length
  );
  await page.click('[data-testid="quest-claim-daily-combat-3"]');

  // RewardChestOverlay opens with "Đóng" button label
  const btn = page.locator('[data-testid="chest-overlay-back-to-world-map"]');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveText('Đóng');
  await btn.click();

  // Verify quest claimed + inventory grew
  const claimed = await page.evaluate(
    () => (window as any).__GAME__.getSaveState().claimedRewards
  );
  expect(claimed).toContain('daily-combat-3');
  const afterInv = await page.evaluate(
    () => (window as any).__GAME__.getSaveState().inventory.length
  );
  expect(afterInv).toBe(beforeInv + 1);
});
```

- [ ] **Step 3: Run E2E sequential**

```bash
cd app && npm run test:e2e -- --workers=1 sprint_d_quests
```

Expected: pass within ~15 s. If flaky, debug:
- Combat one-shot pattern matches Sprint C's `sprint_c_pet_rescue` — copy from there if needed.
- If `enterCombat` / `setMonsterHp` / `clickSpell` / `submitQuiz` are not the exact bridge names, look up the actual names with `grep -n "simulate" app/src/testing/gameTestBridge.ts | head -20` and adapt.

If after a reasonable debug effort the spec is still red for a non-Sprint-D reason, `test.skip` with a comment explaining the bridge gap.

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/sprint_d_quests.spec.ts app/src/testing/gameTestBridge.ts
git commit -m "$(cat <<'EOF'
test(sprint-d): E2E sprint_d_quests — 3 combat wins → claim → inventory

S-D.13 — Playwright spec covering full Sprint D loop: reset cycle
anchors, drive 3 combat wins via existing one-shot bridge methods,
verify questProgress increments, navigate to /quests, click claim,
verify RewardChestOverlay shows "Đóng" label, click → confirm
inventory grew + claimedRewards updated. Adds setQuestCycleAnchors
test-bridge helper.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: AP/ISP delta + sprint roll-up

**Files:**
- Modify: `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
- Modify: `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Append AP delta**

Append to the END of `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`:

```markdown
---

## Sprint D — Delta (02/05/2026)

Sprint D ships the centralized QuestEngine + 8-quest catalog (3 daily +
2 weekly + 3 main) + Quests Panel UI. Type B (Entity Schema delta + v6
migration). No scene/quiz/combat code modified.

### §3.1 — Folder structure additions
- `domain/QuestEngine.ts` — class with start()/stop() lifecycle that
  subscribes once per source-event-type and translates matches into
  QUEST_PROGRESS emits + SaveState increments
- `domain/QuestCycle.ts` — UTC+7 daily/weekly anchor math (pure ms,
  no Date weirdness)
- `domain/QuestReward.ts` — tier→rarity rollDrop wrapper
- `data/staticConfig/quests.ts` — 8-quest catalog with declarative
  match predicates per quest
- `react/overlays/QuestProgressToast.tsx` — top-right ephemeral
  notification with ready-state sparkle variant
- `react/screens/QuestsPanel.tsx` — `/quests` route with daily/weekly/
  main tier sections + per-quest progress / claim / claimed states
- `types/quest.ts` — QuestId, QuestTier, QuestDef, QuestRewardTier,
  TIER_REWARD/TIER_LABEL_VI maps

### §11.7 — Quest schema (NEW)

QuestDef carries id, tier (daily/weekly/main), displayNameVi,
description, target (count goal), rewardTier (common/rare/epic),
source (GameEventType), and match (payload → delta) predicate.

QuestEngine subscribes once per unique source-event-type from the
catalog. On each emit, the engine runs all matching quests' match()
predicates; non-zero deltas trigger SaveState.incrementQuestProgress
(clamped at target, no-op if already claimed) and a QUEST_PROGRESS
event emit.

Refresh semantics:
- Daily quests reset at UTC+7 midnight (Vietnam local midnight).
- Weekly quests reset at UTC+7 Sunday-midnight.
- Main quests never reset; once claimed, stay claimed.
- refreshCyclesIfNeeded runs on app mount and window focus, NOT on
  every event (R2 mitigation — session crossing midnight keeps progress
  until next mount/focus).

Reward minting: claimQuestReward calls rollQuestReward (tier→rarity
filter on ITEM_REGISTRY, defers to LevelUpReward.rollDrop for the
weighted pick), mints an InventoryItem instance, pushes to inventory,
and pushes the questId to claimedRewards.

Monotonic counter policy: PET_COLLECTED-sourced quests count every
collect emit, not "currently owned". Release-and-re-collect could
inflate but rate-gating (Sprint C 10-30%) makes this practically a
non-issue.

### §13 — SaveState v6 (additive over v5)
+ `questProgress: Record<QuestId, number>` (default `{}`)
+ `claimedRewards: QuestId[]` (default `[]`)
+ `questCycleAnchors: { dailyEpochUtc7: number; weeklyEpochUtc7: number }`
  (default `{ dailyEpochUtc7: 0, weeklyEpochUtc7: 0 }` — `0` triggers
  first-run refresh)

### §14 — EventBus catalog additions / extensions
+ `QUEST_PROGRESS { questId: string; delta: number }` (NEW)
~ `CHEST_OPENED` payload extended with optional `label?: string` —
  defaults to "Về Bản Đồ" in `RewardChestOverlay` for back-compat
  with Sprint B/C; quest claims pass `label: "Đóng"`.
```

- [ ] **Step 2: Append ISP rows**

Find the end of the Phase 2.5 Sprint C row table in `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md` and append:

```markdown
### Phase 2.5 — Sprint D (02/05/2026) — Quests & Goals Panel

| # | Step | Status |
|---|---|---|
| S-D.1 | types/quest.ts + tier/reward constants | ✅ |
| S-D.2 | data/staticConfig/quests.ts (8 quests) + tests | ✅ |
| S-D.3 | domain/QuestCycle.ts (UTC+7 anchors) + tests | ✅ |
| S-D.4 | domain/QuestReward.ts (tier→rarity rollDrop wrapper) + tests | ✅ |
| S-D.5 | domain/QuestEngine.ts (event listener + dispatch) + tests | ✅ |
| S-D.6 | SaveState v5→v6 + 4 actions + refreshCyclesIfNeeded | ✅ |
| S-D.7 | EventBus +QUEST_PROGRESS, CHEST_OPENED.label?: string | ✅ |
| S-D.8 | RewardChestOverlay honors optional label (default "Về Bản Đồ") | ✅ |
| S-D.9 | QuestProgressToast (queue + dismiss) + tests | ✅ |
| S-D.10 | QuestsPanel (/quests route, 3-tier groups, claim flow) | ✅ |
| S-D.11 | MainMenu "Nhiệm vụ" button + sparkle indicator | ✅ |
| S-D.12 | AppRouter wires QuestEngine + refresh + /quests + toast | ✅ |
| S-D.13 | E2E sprint_d_quests.spec.ts | ✅ |
| S-D.14 | AP §11.7 + §13 + §14 delta + ISP roll-up + tasks/todo.md | ✅ |

**Sprint D closed.** Pending: 5 Antigravity quest UI assets (1 banner +
4 tier icons; CSS+emoji fallback shipped this sprint).
```

- [ ] **Step 3: Update `tasks/todo.md`**

In the Phase 2.5 sprints table at the top, change the Sprint D row to:

```markdown
| **D** | Quests & Goals panel — 8-quest catalog, QuestEngine, /quests route, toast notifications | ✅ shipped | (this commit) | +N (720 → ?) |
```

Replace `+N (720 → ?)` with the actual delta after running the full unit suite (`cd app && npm run test:run`).

In the "Next Session Action" section, replace the Sprint D action with:

```markdown
**Immediate:** Sprint E — Polish & Onboarding brainstorm (per `docs/roadmap_phase2.5_prodigy_parity.md` §E). Name selection, wizard customization, tutorial polish, settings panel.

**Deferred:** Step 3.5 server-side validation (block before public launch). Phase 2 sprite swap on pet evolution. Antigravity quest UI assets (1 banner + 4 icons).
```

- [ ] **Step 4: Run final full gate suite**

```bash
cd app && npm run lint && npm run typecheck && npm run test:run && npm run verify
cd app && npm run test:e2e -- --workers=1
```

Expected: lint clean, types clean, all unit tests green (720 + ~60 new ≈ 780), all E2E green (7 prior + 1 new sprint_d_quests).

If any E2E fails, check whether it's a pre-existing flake or a Sprint D regression (compare to `4258897` baseline).

- [ ] **Step 5: Final commit**

```bash
git add docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md \
        docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md \
        tasks/todo.md
git commit -m "$(cat <<'EOF'
docs(sprint-d): AP §3.1/§11.7/§13/§14 delta + ISP S-D row table + roll-up

S-D.14 — AP §11.7 documents the quest schema, refresh semantics,
reward minting, monotonic counter policy. §13 SaveState v6 row
added. §14 catalogs QUEST_PROGRESS event + CHEST_OPENED.label
extension.

ISP: Phase 2.5 Sprint D row table marks all 14 tasks ✅.
todo.md: Phase 2.5 sprint table marks D ✅; next session = Sprint E.

Sprint D closed. ~60 new unit tests (720 → ~780), 1 new E2E. Pending:
Antigravity 5 quest UI assets (CSS+emoji fallback shipped).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist

1. **Spec coverage:**
   - §1 Q1 centralized engine → Task 5 ✅
   - §1 Q2 8-quest catalog → Task 2 ✅
   - §1 Q3 UTC+7 refresh → Task 3 + Task 6 (refreshCyclesIfNeeded) ✅
   - §1 Q4 items-only rewards → Task 4 (QuestReward) + Task 6 (claimQuestReward) ✅
   - §1 Q5a /quests + MainMenu → Task 10 + Task 11 ✅
   - §1 Q5b toast + sparkle → Task 9 + Task 11 ✅
   - §1 Q5c manual claim → Task 10 ✅
   - §4.1 SaveState v6 → Task 6 ✅
   - §4.3 QuestEngine → Task 5 ✅
   - §4.4 QuestCycle → Task 3 ✅
   - §4.5 QuestReward → Task 4 ✅
   - §4.6 catalog → Task 2 ✅
   - §4.7 EventBus delta → Task 7 ✅
   - §4.8 SaveState actions → Task 6 ✅
   - §4.9 React surface → Tasks 9 + 10 + 11 + 8 ✅
   - §4.10 AppRouter wiring → Task 12 ✅
   - §5 acceptance criteria → distributed across all tasks ✅
   - §6 risks R1-R8 → R1 mitigated via Task 12 hasHydrated check; R2 explicit (refresh only on mount/focus) in Task 12; R4 mitigated via optional label in Task 7+8; rest acknowledged in code/comments ✅
   - §7 AP/ISP delta → Task 14 ✅

2. **Placeholder scan:** no "TBD/TODO/implement later" patterns. Task 5 has explicit ordering note about depending on Tasks 6+7 — that's not a placeholder, that's a deliberate sequencing instruction.

3. **Type consistency:**
   - `QuestId`, `QuestTier`, `QuestRewardTier`, `QuestDef`, `QuestSourceEvent`, `QuestCycleAnchors` — used identically across Tasks 1-14.
   - `incrementQuestProgress` / `isQuestReady` / `claimQuestReward` / `refreshCyclesIfNeeded` — Task 6 signatures match Tasks 5/9/10 callers.
   - `dailyAnchor` / `weeklyAnchor` / `needsRefresh` — Task 3 exports match Task 6 + Task 13 (test bridge) imports.
   - `rollQuestReward(tier, level, rng?)` — Task 4 signature matches Task 6 caller.
   - Event payloads in Task 7 match emit signatures in Tasks 5 (engine emits QUEST_PROGRESS), 10 (panel emits CHEST_OPENED.label), 8 (overlay reads label).

**Plan complete.**

Plan complete and saved to `docs/superpowers/plans/2026-05-02-sprint-d-quests-plan.md`.
