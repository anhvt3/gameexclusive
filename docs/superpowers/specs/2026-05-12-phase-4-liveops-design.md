# Phase 4 — LiveOps Foundations — Design Spec

**Phase:** 4 (post-Phase 3)
**Type:** B (SaveState v9→v10 schema delta + new observability surface + 1 new SaveState action — POSUP approval; no new EventBus event family)
**Author:** Claude (`claude/phase4-liveops-b27268`)
**Status:** Draft → đợi anh review (12/05/2026)
**Base:** `main` at `b4a6ed5` (Phase 3 merged + AP §11.10/§11.12 doc hygiene fix)
**Plan doc:** `tasks/todo_phase4.md` (Q1-Q10 batch-answered 12/05/2026; Q2 + Q3 overridden — see §1)
**Sibling spec:** `docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md` (shipped as Phase 4 task P4.16; design-only — no infra code)

---

## 1. Why this phase

Phase 3 đã ship spend-side economy (Shop) + pet collection arc (Breeding) + Server validation seam. Cái còn thiếu để chốt vòng lặp core:

1. **Anticipation loop** — Phase 3 ship breeding với `durationMs = 0` (instant hatch). Pet kéo dài thời gian thực trong incubation = lý do quay lại app + cơ hội monetize cá nhân hoá tốc độ (Rush).
2. **Observability** — backend chưa có nhưng phải log structured JSON ngay bây giờ để khi Phase 5 chọn Mixpanel / Amplitude / Segment, switch transport là xong, không phải rewrite call-sites.
3. **Production deploy plan** — học sinh Clevai chuẩn bị truy cập public; phải có design rõ về host, build, HMAC server-side thực tế trước khi code Phase 5 backend.

POSUP-approved decisions (12/05/2026, plan §7 Q1-Q10 batch):

- **Q1 — Schema delta:** Add `hatchAt: number` + `rushedAt: number | null`, keep `startedAt`. Migration v9→v10 derives `hatchAt = startedAt + durationMs`.
- **Q2 ⭐ ANH OVERRIDE:** Duration scale by offspring rarity:
  - common **5 min** (300_000ms)
  - rare **15 min** (900_000ms)
  - epic **60 min** (3_600_000ms)
  - legendary **120 min** (7_200_000ms)
- **Q3 ⭐ ANH OVERRIDE:** Rush cost = breeding cost (parity):
  - common offspring → 50 stars
  - rare → 200 stars
  - epic → 500 stars
  - legendary → 1000 stars
- **Q4 — Offline UX:** "Trứng đã sẵn sàng!" notification toast + sparkle on Lai Tạo button. NO auto-hatch animation.
- **Q5 — Multi-slot:** single-slot Phase 4; defer multi-slot Phase 5.
- **Q6 — Countdown freq:** `setInterval(1000)` — 1s tick.
- **Q7 — Telemetry transport:** console.log + mock POST `/api/telemetry`.
- **Q8 — Telemetry schema:** Zod-validated typed events.
- **Q9 — Telemetry scope:** Phase 3 events only (shop_purchase, breeding_start, breeding_rush, breeding_hatch). Defer Sprint F retro-fit Phase 5.
- **Q10 — Deploy spec:** design-only document, no infra code/CI workflow this phase.

**Game balance implication of Q2 + Q3 override:** Effective "monetization" pressure scales correctly — học sinh có thể wait-out common (5 min reasonable session length) but legendary (2 hours) realistically requires either patient return-tomorrow OR pay-to-rush (1000 stars ≈ 1 week of natural earn). Phase 5 telemetry will show what fraction of users choose each path.

---

## 2. Goals

- Migrate SaveState v9 → v10 với 2 new fields trên `BreedingSession`: `hatchAt`, `rushedAt`.
- Ship `BREEDING_DURATIONS` static table (5/15/60/120 min by rarity) + `RUSH_COSTS` static table (=BREEDING_COSTS parity per Q3).
- Wire `performBreedingStart` to set `hatchAt = now + BREEDING_DURATIONS[offspring.rarity]`.
- Confirm `performBreedingHatch` correctly gates on `now >= hatchAt` (Phase 3 already half-wired via `startedAt + durationMs`; flip to read `hatchAt` directly).
- Ship `performBreedingRush` orchestration: validates `rushedAt === null`, spends stars, mutates `breedingChamber.hatchAt = now` + `rushedAt = now`.
- Ship UI countdown timer (`BreedingCountdown.tsx`) + Rush button in `PetBreedingOverlay`.
- Ship offline-progress notification: when `breedingChamber !== null && now >= hatchAt && !visited-overlay-since`, MainMenu Lai Tạo button gains sparkle + toast "Trứng đã sẵn sàng!".
- Ship `Telemetry` observability module: Zod-typed events + dual transport (console + mock POST) + observer pattern listening EventBus.
- Ship `Vite middleware /api/telemetry` (mock, dev-only, 200-ok logging).
- Ship `docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md` — design-only.
- Document toàn bộ trong AP §11.11 update (Phase 4 delta) + §11.14 NEW (Telemetry) + ISP Phase 4 row.
- 18 atomic tasks per ISP, TDD discipline per Phase 3 pattern.

---

## 3. Non-goals

- **Multi-slot breeding chamber** — Q5 single-slot Phase 4; multi-slot defer Phase 5.
- **Real backend telemetry endpoint** — Q10/Q7 mock only this phase. Phase 5 wires Mixpanel/Amplitude.
- **CI/CD deploy workflow** — Q10 spec doc only, NO `.github/workflows/deploy.yml` this phase.
- **Push notification for offline egg ready** — Q4 in-app notification only. Browser push API defer Phase 5+.
- **Auto-hatch on app reload** — Q4 explicit: ready egg shows notification, NOT auto-plays hatch animation.
- **Rush time-proportional pricing** — Q3 flat (= breeding cost). Time-remaining-based pricing defer Phase 5 A/B test.
- **Telemetry batching/buffering** — Phase 4 fires per-event POST. Phase 5 may add batch + offline IndexedDB queue.
- **PII handling** — Phase 4 internal Clevai deploy has no PII; player names/IDs OK to log. Phase 5 anonymization if external launch.
- **Sprint F retro-fit telemetry** — Q9 narrow scope; login_claim / loot_jar / battle_stars_earned defer.
- **Rush refund / undo** — once rushed, no refund. `rushedAt` permanent.
- **Rate-limiting / cooldown between Rush actions** — single rush per chamber (guarded by `rushedAt !== null`); no global cooldown.

---

## 4. Architecture overview

### 4.1 SaveState v9 → v10

```ts
interface BreedingSessionV10 {
  readonly parentA: PetInstanceId;
  readonly parentB: PetInstanceId;
  readonly startedAt: number;
  /** NEW v10 — epoch ms when egg ready to hatch. = startedAt + BREEDING_DURATIONS[rarity]. */
  readonly hatchAt: number;
  readonly costBattleStars: number;
  readonly offspringSpec: {
    readonly codename: PetCodename;
    readonly rarity: PetRarity;
    readonly level: number;
  };
  /** NEW v10 — non-null timestamp when user spent stars to skip wait. Permanent flag. */
  readonly rushedAt: number | null;
}

// REMOVED v10: `durationMs` field (replaced by hatchAt; computed at write time).
```

Migration v9→v10:
```ts
if (version < 10) {
  s = {
    ...s,
    breedingChamber: s.breedingChamber
      ? {
          ...s.breedingChamber,
          hatchAt: s.breedingChamber.startedAt + (s.breedingChamber as any).durationMs,
          rushedAt: null,
        }
      : null,
  };
  // durationMs stays in the v9 blob's chamber object but is no longer typed —
  // future reads ignore it. Safe because TypeScript narrows on the new shape.
}
```

Old `durationMs` field is dropped from the type but not actively deleted from the in-memory object during migration (harmless extra property; persisted JSON includes it once but the next `set({ breedingChamber: ... })` overwrites with v10 shape).

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── types/
│   └── breeding.ts                      EDIT — add hatchAt + rushedAt; drop durationMs from BreedingSession
├── domain/
│   ├── BreedingDurations.ts             NEW — duration table per rarity (Q2)
│   ├── BreedingDurations.test.ts
│   ├── BreedingRush.ts                  NEW — rush cost table + helpers
│   ├── BreedingRush.test.ts
│   ├── PetBreedingEngine.ts             EDIT — rollOffspring still pure (no duration logic here)
│   ├── performBreedingStart.ts          EDIT — set hatchAt = now + BREEDING_DURATIONS[rarity]
│   ├── performBreedingHatch.ts          EDIT — gate on hatchAt instead of startedAt+durationMs
│   ├── performBreedingRush.ts           NEW — validate + spend + mutate chamber
│   └── performBreedingRush.test.ts
├── observability/                       NEW directory
│   ├── Telemetry.ts                     NEW — trackX functions + Zod schema + dual transport
│   ├── Telemetry.test.ts
│   ├── TelemetryEngine.ts               NEW — observer on shop+breed events
│   └── TelemetryEngine.test.ts
├── persistence/
│   ├── SaveStateStore.ts                EDIT — v9→v10 + new action `rushBreeding`
│   └── SaveStateStore.test.ts
├── react/
│   ├── components/
│   │   ├── BreedingCountdown.tsx        NEW — countdown timer UI
│   │   ├── BreedingCountdown.test.tsx
│   │   └── EggHatchAnim.tsx             EDIT — incubating vs hatching states
│   ├── overlays/
│   │   └── PetBreedingOverlay.tsx       EDIT — countdown + Rush button + ready state
│   └── shell/
│       └── AppRouter.tsx                EDIT — mount TelemetryEngine
├── server/
│   ├── validationRoutes.ts              UNCHANGED (Phase 3)
│   └── telemetryRoute.ts                NEW — Vite middleware /api/telemetry (mock)
└── testing/
    └── gameTestBridge.ts                EDIT — +simulate.advanceBreedingClock(ms) helper

docs/superpowers/specs/
└── 2026-05-12-phase-4-production-deploy.md   NEW — sibling spec (shipped as P4.16)
```

Layer rules:
- `domain/` — pure TS, no React/Phaser.
- `observability/` — pure TS + `fetch`. Allowed to import EventBus (observer pattern).
- `react/` — React only.
- `server/telemetryRoute.ts` — Node-side Vite plugin module.

### 4.3 BreedingDurations (Q2 override)

```ts
// app/src/domain/BreedingDurations.ts

import type { PetRarity } from '@/types/pet';

const MIN = 60_000;

/**
 * Phase 4 — Breeding incubation duration per offspring rarity (Q2 anh override).
 *
 * Tradeoff design:
 * - Common 5min ≈ short coffee break, casual return.
 * - Rare 15min ≈ class break, ride home.
 * - Epic 60min ≈ homework session, lunch wait.
 * - Legendary 120min ≈ "tomorrow morning" patience OR pay-to-Rush.
 *
 * Phase 5 telemetry will measure rush_rate per tier; expect Rush>50%
 * for legendary (anchored at 1000 stars = ~1 week earn). Phase 5
 * balance pass may shorten epic/legendary based on data.
 */
export const BREEDING_DURATIONS: Readonly<Record<PetRarity, number>> = {
  common:    5 * MIN,    //  5 min =   300_000 ms
  rare:     15 * MIN,    // 15 min =   900_000 ms
  epic:     60 * MIN,    // 60 min = 3_600_000 ms
  legendary: 120 * MIN,  // 120 min = 7_200_000 ms
};

export function durationFor(rarity: PetRarity): number {
  return BREEDING_DURATIONS[rarity];
}
```

### 4.4 BreedingRush — cost + helpers (Q3 override)

```ts
// app/src/domain/BreedingRush.ts

import type { PetRarity } from '@/types/pet';
import { BREEDING_COSTS } from '@/data/staticConfig/breedingCosts';

/**
 * Phase 4 — Rush cost = breeding cost (Q3 anh override).
 *
 * Pricing parity: rushing is "double-pay your way past the timer".
 * Total spend for legendary offspring = 1000 + 1000 = 2000 stars
 * (1 week of grinding) — economically rational only for whales OR
 * student who already has 2000+ stars saved.
 *
 * Phase 5 may shift to time-remaining-proportional pricing once
 * telemetry shows rush_rate distribution.
 */
export const RUSH_COSTS: Readonly<Record<PetRarity, number>> = BREEDING_COSTS;

export function rushCostFor(rarity: PetRarity): number {
  return RUSH_COSTS[rarity];
}

export interface RushValidation {
  ok: boolean;
  reason?: 'no_active_session' | 'already_rushed' | 'already_ready' | 'insufficient_stars';
}

export function validateRush(
  chamber: { hatchAt: number; rushedAt: number | null; offspringSpec: { rarity: PetRarity } } | null,
  battleStars: number,
  now: number,
): RushValidation {
  if (!chamber) return { ok: false, reason: 'no_active_session' };
  if (chamber.rushedAt !== null) return { ok: false, reason: 'already_rushed' };
  if (now >= chamber.hatchAt) return { ok: false, reason: 'already_ready' };
  const cost = RUSH_COSTS[chamber.offspringSpec.rarity];
  if (battleStars < cost) return { ok: false, reason: 'insufficient_stars' };
  return { ok: true };
}
```

### 4.5 performBreedingStart — set hatchAt (Phase 4 edit)

Existing Phase 3:
```ts
const session: BreedingSession = {
  parentA, parentB, startedAt: now,
  durationMs: 0,        // ← Phase 3 instant
  costBattleStars: offspring.costBattleStars,
  offspringSpec: { codename, rarity, level },
};
```

Phase 4:
```ts
const duration = durationFor(offspring.rarity);  // Q2 scaled
const session: BreedingSession = {
  parentA, parentB, startedAt: now,
  hatchAt: now + duration,   // ← Phase 4 wall-clock target
  costBattleStars: offspring.costBattleStars,
  offspringSpec: { codename, rarity, level },
  rushedAt: null,
};
```

### 4.6 performBreedingHatch — gate on hatchAt (Phase 4 edit)

Existing Phase 3:
```ts
if (now < session.startedAt + session.durationMs) {
  return { ok: false, reason: 'not_ready' };
}
```

Phase 4:
```ts
if (now < session.hatchAt) {
  return { ok: false, reason: 'not_ready' };
}
```

Semantically identical (`startedAt + durationMs === hatchAt` per migration), but reads cleaner.

### 4.7 performBreedingRush — NEW orchestration

```ts
// app/src/domain/performBreedingRush.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import { validateRush, rushCostFor } from './BreedingRush';
import { validateAction } from './ServerValidator';
import type { BreedingFailureReason } from '@/types/breeding';

export type BreedingRushResult =
  | { ok: true; costPaid: number; newHatchAt: number }
  | { ok: false; reason: BreedingFailureReason | 'already_rushed' | 'already_ready' };

export async function performBreedingRush(
  now: number = Date.now(),
): Promise<BreedingRushResult> {
  const state = useSaveState.getState();
  const validation = validateRush(state.breedingChamber, state.battleStars, now);
  if (!validation.ok) return { ok: false, reason: validation.reason! };

  const chamber = state.breedingChamber!;
  const cost = rushCostFor(chamber.offspringSpec.rarity);

  const server = await validateAction('/api/breed/validate', {
    action: 'rush',
    parentA: chamber.parentA,
    parentB: chamber.parentB,
    cost,
  });
  if (!server.ok) {
    return { ok: false, reason: `server_${server.reason}` as BreedingFailureReason };
  }

  useSaveState.getState().rushBreeding(now, cost);
  return { ok: true, costPaid: cost, newHatchAt: now };
}
```

`rushBreeding(now, cost)` SaveState action:
```ts
rushBreeding: (now, cost) => {
  const state = get();
  if (!state.breedingChamber) throw new Error('rushBreeding: no active session');
  if (state.breedingChamber.rushedAt !== null) throw new Error('rushBreeding: already rushed');
  if (state.battleStars < cost) throw new Error(`rushBreeding: insufficient (${state.battleStars} < ${cost})`);
  set({
    breedingChamber: {
      ...state.breedingChamber,
      hatchAt: now,
      rushedAt: now,
    },
    battleStars: state.battleStars - cost,
  });
}
```

Atomic: chamber update + battleStars debit in single `set()`. Throws on invariant violation (mirror Sprint F `claimLootJar` pattern).

### 4.8 Telemetry observability module (Q7 + Q8 + Q9)

```ts
// app/src/observability/Telemetry.ts

import { z } from 'zod';

/**
 * Phase 4 — Telemetry typed events (Q8 Zod-validated, Q9 Phase 3 scope only).
 *
 * Transport: dual (Q7) — console.log structured JSON + POST /api/telemetry.
 * Console for dev debugging; POST is mock endpoint ready for Phase 5
 * backend swap (Mixpanel/Amplitude/Segment) by changing TELEMETRY_ENDPOINT.
 */

export const ShopPurchaseEventSchema = z.object({
  event: z.literal('shop_purchase'),
  ts: z.number(),
  itemId: z.string(),
  priceCharged: z.number(),
  battleStarsAfter: z.number(),
});

export const BreedingStartEventSchema = z.object({
  event: z.literal('breeding_start'),
  ts: z.number(),
  parentA: z.string(),
  parentB: z.string(),
  offspringRarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  costPaid: z.number(),
  hatchAt: z.number(),
});

export const BreedingRushEventSchema = z.object({
  event: z.literal('breeding_rush'),
  ts: z.number(),
  offspringRarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  costPaid: z.number(),
  timeRemainingMs: z.number(),  // (hatchAt - now) BEFORE rush — analytics signal
});

export const BreedingHatchEventSchema = z.object({
  event: z.literal('breeding_hatch'),
  ts: z.number(),
  offspringInstanceId: z.string(),
  offspringRarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  wasRushed: z.boolean(),
});

export const TelemetryEventSchema = z.discriminatedUnion('event', [
  ShopPurchaseEventSchema,
  BreedingStartEventSchema,
  BreedingRushEventSchema,
  BreedingHatchEventSchema,
]);

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

const TELEMETRY_ENDPOINT = '/api/telemetry';

/**
 * Track a single event. Always logs to console; also POSTs to mock
 * endpoint if available. Soft-fail on network error (never throws).
 */
export async function track(event: TelemetryEvent): Promise<void> {
  const parsed = TelemetryEventSchema.safeParse(event);
  if (!parsed.success) {
    console.warn('[Telemetry] Invalid event schema:', parsed.error);
    return;
  }
  // Console transport — always
  console.log(`[Telemetry] ${event.event}`, parsed.data);
  // POST transport — soft-fail
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    console.warn('[Telemetry] POST failed (soft-fail):', err);
  }
}

// Convenience wrappers (consumed by TelemetryEngine + direct callers)
export async function trackShopPurchase(p: Omit<z.infer<typeof ShopPurchaseEventSchema>, 'event' | 'ts'>): Promise<void> {
  return track({ event: 'shop_purchase', ts: Date.now(), ...p });
}
export async function trackBreedingStart(p: Omit<z.infer<typeof BreedingStartEventSchema>, 'event' | 'ts'>): Promise<void> {
  return track({ event: 'breeding_start', ts: Date.now(), ...p });
}
export async function trackBreedingRush(p: Omit<z.infer<typeof BreedingRushEventSchema>, 'event' | 'ts'>): Promise<void> {
  return track({ event: 'breeding_rush', ts: Date.now(), ...p });
}
export async function trackBreedingHatch(p: Omit<z.infer<typeof BreedingHatchEventSchema>, 'event' | 'ts'>): Promise<void> {
  return track({ event: 'breeding_hatch', ts: Date.now(), ...p });
}
```

### 4.9 TelemetryEngine — observer pattern

```ts
// app/src/observability/TelemetryEngine.ts

import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { trackShopPurchase, trackBreedingStart, trackBreedingHatch } from './Telemetry';

/**
 * Phase 4 — Telemetry observer (mirror DailyRewardEngine pattern from Sprint F).
 *
 * Listens existing EventBus events + invokes Telemetry.trackX. Pure
 * observer — never mutates state, never blocks the originating action.
 * `breeding_rush` event NOT here — performBreedingRush calls trackBreedingRush
 * directly because the action has all the context (timeRemaining etc.).
 */
export class TelemetryEngine {
  private subscriptions: Array<() => void> = [];

  start(): void {
    if (this.subscriptions.length > 0) return;

    this.subscriptions.push(
      eventBus.on('SHOP_PURCHASE_COMPLETED', (p) => {
        const battleStarsAfter = useSaveState.getState().battleStars;
        void trackShopPurchase({
          itemId: p.itemId,
          priceCharged: p.priceCharged,
          battleStarsAfter,
        });
      }),
      eventBus.on('BREEDING_STARTED', (p) => {
        const chamber = useSaveState.getState().breedingChamber;
        if (!chamber) return;
        void trackBreedingStart({
          parentA: p.parentA,
          parentB: p.parentB,
          offspringRarity: p.expectedRarity,
          costPaid: chamber.costBattleStars,
          hatchAt: chamber.hatchAt,
        });
      }),
      eventBus.on('EGG_HATCHED', (p) => {
        // wasRushed: derived from chamber.rushedAt BEFORE clear (we already cleared in performBreedingHatch).
        // Workaround: read SaveState BEFORE the action fires — but observer runs AFTER emit.
        // Compromise: observer reads `lastRushedAt` from a transient module-level cache.
        // SIMPLER alternative: include `wasRushed` directly on EGG_HATCHED payload (1-line event spec update).
        // Decision: update EventBus EGG_HATCHED to carry `wasRushed: boolean`. Documented as backward-compatible additive.
        void trackBreedingHatch({
          offspringInstanceId: p.offspringInstanceId,
          offspringRarity: p.rarity,
          wasRushed: (p as { wasRushed?: boolean }).wasRushed ?? false,
        });
      }),
    );
  }

  stop(): void {
    this.subscriptions.forEach((off) => off());
    this.subscriptions = [];
  }
}
```

**EventBus payload extension (additive, backward-compat):** `EGG_HATCHED` gains optional `wasRushed?: boolean` field. `performBreedingHatch` reads `session.rushedAt !== null` BEFORE calling `clearBreeding()`, passes `wasRushed` in the emit. Old callers ignoring the field continue to work.

### 4.10 Vite middleware `/api/telemetry` (mock)

```ts
// app/src/server/telemetryRoute.ts

import type { Connect } from 'vite';
import type { ServerResponse } from 'node:http';

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function respond(res: ServerResponse, status: number, body: object): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function telemetryRoute(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url !== '/api/telemetry' || req.method !== 'POST') return next();
    const body = await readBody(req);
    // Mock: log to terminal + 200 ok. Phase 5 swap: forward to analytics platform.
    console.log('[mock /api/telemetry]', body.slice(0, 200));
    respond(res as ServerResponse, 200, { ok: true });
  };
}
```

Wired into `vite.config.ts` alongside Phase 3 shop/breed validation routes.

### 4.11 React surface

#### `BreedingCountdown.tsx` (NEW component)

```
┌──────────────────────────────────────┐
│  ⏳ Còn 4:32 — sẽ nở vào 18:45      │
│  ▓▓▓▓▓░░░░░░░░░░░░░░░░ 22%          │
│  [ ⚡ Tăng tốc (50 ⭐) ]            │
└──────────────────────────────────────┘
```

Props `{ chamber: BreedingSession; onRush: () => void; battleStars: number }`. Uses `setInterval(1000)` to tick. Cleanup via `useRef + useEffect` (Sprint F lesson).

States:
- `incubating`: countdown + Rush button (disabled if `rushedAt !== null` or insufficient stars)
- `ready`: "Trứng đã sẵn sàng!" + Hatch button (parent overlay's existing flow)

When `now >= hatchAt`, component clears interval + signals parent via `onReady` callback.

#### `EggHatchAnim.tsx` (EDIT)

Add `phase` mode prop: `'incubating' | 'shake' | 'hatch'`. `incubating` shows static egg glyph (🥚) without animation. `shake` + `hatch` unchanged from Phase 3.

#### `PetBreedingOverlay.tsx` (EDIT)

Update mode state machine:
- `pick` → `breeding (incubating)` → `breeding (ready)` → `breeding (hatching)` → `hatched`

`breeding (incubating)` renders `<BreedingCountdown />`. `breeding (ready)` renders Hatch button (auto-triggers existing flow). `breeding (hatching)` renders `<EggHatchAnim phase="hatch" />`.

Reload behavior: on overlay open, check `chamber.hatchAt`:
- `hatchAt > now` → enter `breeding (incubating)`
- `hatchAt <= now` → enter `breeding (ready)`

This handles offline-progress: học sinh tắt game, mở lại → overlay opens in `ready` state. Toast + sparkle is the OUTSIDE-overlay surfacing (MainMenu).

#### MainMenu sparkle (offline notification, Q4)

Add selector:
```tsx
const breedingReady = useSaveState((s) =>
  s.breedingChamber !== null && Date.now() >= s.breedingChamber.hatchAt
);
```

Mount sparkle on existing "Lai Tạo" button when `breedingReady`. Mirror existing `anyQuestReady` pattern (Sprint D) — same Tailwind classes.

Optional Phase 4 polish: emit a one-shot toast on MainMenu mount if `breedingReady && !flags.breedingReadyToastShown`. Set flag after toast dismiss. (Detail: track `breedingReadyToastShown` as a SaveState flag in `flags: Record<string, boolean>` — already exists, no schema change.)

### 4.12 AppRouter wire (Phase 4 edit)

Add `TelemetryEngine` lifecycle alongside existing engines:

```ts
const telemetryEngineRef = useRef<TelemetryEngine | null>(null);

useEffect(() => {
  const start = () => {
    telemetryEngineRef.current = new TelemetryEngine();
    telemetryEngineRef.current.start();
  };
  let cleanup: (() => void) | null = null;
  if (useSaveState.persist.hasHydrated()) start();
  else cleanup = useSaveState.persist.onFinishHydration(start);
  return () => {
    cleanup?.();
    telemetryEngineRef.current?.stop();
  };
}, []);
```

---

## 5. Acceptance criteria

1. **Schema v10:** `BreedingSession` has `hatchAt: number` + `rushedAt: number | null`. v9→v10 migration: existing v9 saves with active chamber get `hatchAt = startedAt + (legacy)durationMs`, `rushedAt = null`.
2. **BREEDING_DURATIONS table:** common 5min · rare 15min · epic 60min · legendary 120min (in ms).
3. **RUSH_COSTS table:** parity with `BREEDING_COSTS` (50/200/500/1000).
4. **performBreedingStart:** sets `hatchAt = now + durationFor(offspring.rarity)`.
5. **performBreedingHatch:** returns `not_ready` when `now < hatchAt`; succeeds when `now >= hatchAt`; emits `EGG_HATCHED` with `wasRushed = (session.rushedAt !== null)`.
6. **performBreedingRush happy path:** chamber active + not rushed + not ready + stars sufficient → spends cost, sets `hatchAt = now`, sets `rushedAt = now`, emits no new event (calls `trackBreedingRush` directly with timeRemainingMs computed).
7. **performBreedingRush failure modes:** returns reason for `no_active_session` / `already_rushed` / `already_ready` / `insufficient_stars` / `server_*`.
8. **`rushBreeding` SaveState action:** atomic mutation; throws on invariant violation.
9. **Telemetry schema:** Zod parses all 4 event types correctly; rejects malformed events with `console.warn`.
10. **Telemetry transport:** every track call logs to console; every track call POSTs to `/api/telemetry`; network error soft-fails.
11. **TelemetryEngine observer:** subscribes 3 EventBus events on `start()`; unsubscribes on `stop()`.
12. **`/api/telemetry` middleware:** POST returns `{ ok: true }` 200; logs first 200 chars to terminal.
13. **BreedingCountdown UI:** ticks every 1s; shows MM:SS format + percentage filled; cleans up interval on unmount; transitions to `ready` state when `now >= hatchAt`.
14. **PetBreedingOverlay reload:** opening overlay when `chamber.hatchAt > now` shows countdown; when `<= now` shows Hatch button.
15. **MainMenu sparkle:** Lai Tạo button shows sparkle when `breedingChamber !== null && Date.now() >= chamber.hatchAt`.
16. **Type B gates:** lint + typecheck + verify + ~1112 unit + 12 E2E green. New tests:
    - BreedingDurations: ~4 tests (all 4 rarities + immutability)
    - BreedingRush: ~6 tests (cost lookup + validateRush 4 failure modes + happy)
    - performBreedingRush: ~6 tests (happy + 4 failure reasons + server fail)
    - SaveState v9→v10 + rushBreeding action: ~5 tests
    - Telemetry: ~8 tests (schema parse + reject + 4 tracker wrappers + transport)
    - TelemetryEngine: ~4 tests (subscribe + unsubscribe + 3 event observers)
    - BreedingCountdown: ~6 tests (mount, tick, percent, ready transition, cleanup)
    - PetBreedingOverlay: ~5 new tests (countdown render, rush click, ready state, reload incubating/ready)
    - MainMenu: ~2 new tests (sparkle on/off)
    - E2E: 1 spec (incubate → rush → hatch + telemetry POST visible in network log)

Total estimate: **~46 new unit tests** (1072 → ~1118) + 1 E2E.

---

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | v9→v10 migration corrupts saves with active Phase 3 chamber | Low | High | Migration test asserts hatchAt = startedAt + durationMs; durationMs property is dropped from type but harmless if persists. |
| R2 | setInterval(1000) not cleaned on overlay unmount → memory leak | Med | Med | useRef + useEffect cleanup (Sprint F LootJarOverlay pattern proven). Test asserts no callback after unmount. |
| R3 | User clicks Rush twice rapidly → double charge | Low | High | `rushedAt !== null` guard in `rushBreeding` action throws; performBreedingRush returns `already_rushed`. UI also disables button. |
| R4 | Wall-clock skew (tablet locked 6h, system clock changed) | Med | Low | hatchAt is absolute epoch ms; if clock jumps forward, egg may auto-ready (acceptable — student gains time). If backward, countdown stalls — acceptable edge case. |
| R5 | Telemetry fetch crashes app on dev server not running | High | Low | `track()` wraps fetch in try/catch + `console.warn` soft-fail; never throws. |
| R6 | Telemetry observer fires too often (e.g., EGG_HATCHED emits 2× from rapid Hatch/Re-hatch click) | Low | Low | Hatch action gated by `chamber !== null`; once cleared, next emit can't happen. Test asserts single track call per session. |
| R7 | TelemetryEngine starts before SaveState rehydrates | Med | Med | AppRouter gates engine.start() on `persist.hasHydrated()` (Sprint D pattern). |
| R8 | wasRushed field on EGG_HATCHED breaks Sprint F LoginCalendarOverlay listener | Low | Low | Field is OPTIONAL (`wasRushed?: boolean`); LoginCalendar doesn't read EGG_HATCHED; only TelemetryEngine reads new field. |
| R9 | Mock POST endpoint slow → blocks UI | Low | Low | `void trackX(...)` fire-and-forget; never awaited from UI thread. |
| R10 | Telemetry log spam in dev console floods debugging | Med | Low | Single line per event; structured prefix `[Telemetry]` for filter. |
| R11 | Legendary 120min duration tested in unit but never E2E | Low | Low | E2E uses `simulate.advanceBreedingClock(ms)` test bridge to fast-forward; covers timer math without 2h wait. |
| R12 | Production Deploy spec doc bloat (P4.16) — temptation to write infra code | Med | Low | Q10 enforced: spec doc ONLY this phase; CI/CD/deploy code in Phase 5+ when host platform chosen. |

---

## 7. AP / ISP impact

### 7.1 AP delta (additive)

Append "Phase 4 — Delta" section after Phase 3 delta. Updates:

- **§3.1** — add `domain/{BreedingDurations,BreedingRush,performBreedingRush}.ts`, `observability/{Telemetry,TelemetryEngine}.ts`, `react/components/BreedingCountdown.tsx`, `server/telemetryRoute.ts`.
- **§11.11 — Breeding schema (UPDATE):**
  - `BreedingSession` v10 shape: `hatchAt` + `rushedAt` (+remove `durationMs`)
  - Duration scale per rarity (Q2): 5/15/60/120 min
  - Rush cost = breeding cost (Q3): 50/200/500/1000
  - `performBreedingRush` action contract
  - Offline progress UX (Q4): notification + sparkle, no auto-hatch
- **§11.14 — Telemetry seam (NEW):**
  - Zod-typed events: shop_purchase, breeding_start, breeding_rush, breeding_hatch
  - Dual transport: console + mock POST `/api/telemetry`
  - Observer pattern via TelemetryEngine
  - Phase 5 swap point: TELEMETRY_ENDPOINT const + transport code
- **§13** — add v10 row: BreedingSession shape change. Migration v9→v10 additive.
- **§14** — `EGG_HATCHED` payload extended with optional `wasRushed?: boolean` (backward-compatible).

### 7.2 ISP delta — Phase 4 row table

| # | Step | Status |
|---|---|---|
| P4.0 | Preflight (baseline 1072 tests green) | ⏳ |
| P4.1 | types/breeding.ts — add hatchAt + rushedAt, drop durationMs | ⏳ |
| P4.2 | domain/BreedingDurations.ts (Q2 table) + tests | ⏳ |
| P4.3 | domain/BreedingRush.ts (Q3 cost + validateRush) + tests | ⏳ |
| P4.4 | SaveState v9→v10 + rushBreeding action + tests | ⏳ |
| P4.5 | performBreedingStart.ts edit — set hatchAt | ⏳ |
| P4.6 | performBreedingHatch.ts edit — gate on hatchAt + include wasRushed in emit | ⏳ |
| P4.7 | performBreedingRush.ts orchestration + tests | ⏳ |
| P4.8 | EventBus EGG_HATCHED +wasRushed?: boolean (additive) + tests | ⏳ |
| P4.9 | observability/Telemetry.ts (Zod + dual transport) + tests | ⏳ |
| P4.10 | observability/TelemetryEngine.ts (observer) + tests | ⏳ |
| P4.11 | server/telemetryRoute.ts (Vite mock middleware) + wire vite.config | ⏳ |
| P4.12 | react/components/BreedingCountdown.tsx + tests | ⏳ |
| P4.13 | react/components/EggHatchAnim.tsx edit (incubating phase) + tests | ⏳ |
| P4.14 | react/overlays/PetBreedingOverlay.tsx edit (countdown + Rush + reload) + tests | ⏳ |
| P4.15 | react/screens/MainMenu.tsx edit (breedingReady sparkle) + tests | ⏳ |
| P4.16 | docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md NEW (design-only) | ⏳ |
| P4.17 | E2E phase_4_breeding_timer.spec.ts (incubate → rush → hatch) | ⏳ |
| P4.18 | AP §11.11 + §11.14 + §13 + §14 delta + ISP Phase 4 row + todo.md | ⏳ |

19 steps. Phase 4 similar scale to Phase 3 (19 steps) — breeding timer is edit-heavy, telemetry is new pure module, deploy spec is separate doc.

### 7.3 tasks/todo.md update

Phase 4 row appended to existing sprints table. Phase 3 closed remains. Phase 4 closure flips ⏳ → ✅.

---

## 8. Test strategy

### 8.1 Unit (Vitest) — ~46 new tests

Distribution per §5 acceptance #16.

Critical: timer tests use `vi.useFakeTimers()` + `vi.setSystemTime()` to fast-forward across 5/15/60/120 min durations without real-time waits.

### 8.2 E2E (Playwright)

`app/tests/e2e/phase_4_breeding_timer.spec.ts`:

```
test('phase 4: incubate → rush → hatch + telemetry visible', ...)
```

Steps:
1. Seed save v10 + 2 pets (different elements) + 200 stars + tutorial done.
2. Open Lai Tạo, pick 2 parents, click Breed → enters incubating state.
3. Verify `breedingChamber.hatchAt > Date.now()`.
4. Verify countdown text rendered (e.g., "Còn 4:5X").
5. Verify console emits `[Telemetry] breeding_start`.
6. Click Rush → spends stars, sets `hatchAt ≈ now`, `rushedAt !== null`.
7. Verify console emits `[Telemetry] breeding_rush`.
8. Hatch button appears, click → offspring minted, roster grew.
9. Verify console emits `[Telemetry] breeding_hatch` with `wasRushed=true`.

E2E timeout 90s. Sequential `--workers=1`. Test bridge `simulate.advanceBreedingClock(ms)` lets test fast-forward if Rush flow has dependency on time.

### 8.3 Visual UAT (Antigravity, Phase 4 polish)

- Student opens Lai Tạo, picks 2 common-element pets → cost 50 stars + 5 min countdown
- Click Breed → countdown ticks down each second, progress bar fills
- Click Rush (50 stars) → countdown jumps to 0:00, Hatch button enables
- Click Hatch → existing egg shake → pop → offspring revealed
- Logout, login 10 min later (during legendary 120min incubation) → MainMenu sparkle on Lai Tạo button + toast "Trứng đã sẵn sàng!"
- Telemetry: open browser DevTools Console → see structured `[Telemetry] breeding_start { ... }` lines

---

## 9. Type classification

**Type B** — SaveState schema delta (v10 BreedingSession reshape) + 1 new SaveState action (`rushBreeding`) + new observability module (no new EventBus event family — only optional payload extension to existing `EGG_HATCHED`).

CI label gate: `type-B`.

POSUP approval needed:
- §11.11 schema delta (hatchAt + rushedAt, drop durationMs)
- §11.14 Telemetry seam (NEW)
- Q2 duration table (game balance)
- Q3 rush cost = breeding cost (game balance)
- `EGG_HATCHED` payload extension (backward-compatible additive)

---

## 10. Asset spec

Phase 4 không cần Antigravity assets. UI hoàn toàn:
- Countdown text: Tailwind `font-mono text-xl text-amber-900`
- Progress bar: Tailwind `bg-amber-200` with inline `width: '${pct}%'`
- Rush button: existing `bg-amber-600` pattern (mirror Sprint F LootJarOverlay close button)
- Sparkle indicator: reuse exact `main-menu-quests-sparkle` classes (Sprint D + Sprint F + Phase 3 precedent)
- Toast "Trứng đã sẵn sàng!": reuse `QuestProgressToast` pattern (Sprint D) with new payload type or inline render

Fallback CSS/emoji 100% ready. No art delivery blocks Phase 4 ship.

---

## 11. Open questions baked as defaults

All 10 questions (Q1-Q10) answered batch by anh 12/05/2026 with Q2 + Q3 overrides locked in spec. No further open questions.

---

## 12. Production Deploy spec (P4.16 sibling deliverable)

Phase 4 also ships `docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md` — design-only doc (Q10 default). Scope per anh's brief:

- **Host frontend:** evaluate Cloudflare Pages vs Vercel vs Netlify vs static S3 + CloudFront. Decision matrix on CDN coverage in Vietnam, free tier limits, build minutes, custom domain support.
- **Build pipeline:** Vite production build, asset hashing, source map handling (dev only), bundle analysis budget, Lighthouse CI integration.
- **HMAC server-side reality:** how `PHASE3_DEV_SECRET` becomes `env.PHASE3_VALIDATION_SECRET`; what authoritative server-side state check looks like (Redis nonce store? KV namespace?); replay protection beyond Phase 3 monotonic nonce.
- **Telemetry destination:** evaluate Mixpanel free tier (1M events/month) vs Amplitude (10M) vs PostHog self-hosted vs Segment as router. Decision matrix on schema migration cost from Phase 4 Zod events to platform native shape.
- **Rollout strategy:** internal Clevai (current) → 10% beta cohort → 100%. Feature flags via existing `flags: Record<string, boolean>` SaveState field? Or external flag service (LaunchDarkly / Statsig)?
- **Monitoring:** Sentry (already integrated Step 18.5) for errors. Add health-check endpoint? Synthetic monitoring?
- **Backup / recovery:** Zustand `persist` writes to localStorage; how to migrate users between domains if host changes? Export/import save JSON?

Phase 4 deliverable: the DOC itself. Phase 5 implementation: code per the doc.

---

**End Phase 4 design spec.**

Next step: anh review spec doc → user approval → invoke `superpowers:writing-plans` → 19-step phased plan → `superpowers:subagent-driven-development` → ship Phase 4.
