# Sprint B — World Map + Zone Map + Boss Hall — Design Spec

**Phase:** 2.5 Prodigy-Parity
**Type:** C (Event Layer + Scene chain delta + Entity Schema delta — POSUP+ARCH approval)
**Author:** Claude (Game_SS3 worktree `claude/zealous-dewdney-0c63aa`)
**Status:** Draft → awaiting POSUP review (02/05/2026)
**Roadmap parent:** `docs/roadmap_phase2.5_prodigy_parity.md` (§ Sprint B)
**Predecessor:** Sprint A (Multi-Party Combat Refactor) — merged @ `ed6dbee`

---

## 1. Why this sprint

Phase 1+1.5 ships exactly one Phaser scene of "world content" — `WorldScene`,
a single 30×20 tile placeholder grid where 5 monsters spawn at hard-coded
positions and overlap launches `CombatScene`. The 148-frame Prodigy-parity
audit (POSUP, 29/04/2026) showed reference RPGs deliver world content as a
**three-layer macro/zone/boss architecture**:

1. A **macro World Map** with multiple themed islands the student picks
   between (sense of place + aspiration).
2. A **Zone interior** of 2-3 connected screens per island (sense of
   journey within the chosen island).
3. A **Boss Hall** as the climactic final screen of every island
   (sense of payoff + a discrete drop event).

Without these, `WorldScene`'s flat field cannot grow into the
8-elemental-island fantasy the Prodigy-parity goal demands. Sprint B
replaces the placeholder with the 3-layer architecture for the first
3 islands (Forest already drafted, Volcanic + Frozen new) and stubs
the remaining 5 islands as locked tiles with "Sắp ra mắt" labels.

POSUP-approved decisions (02/05/2026, audited by Antigravity Product
Auditor against reference Prodigy build):

- **Q1 — World Map composition:** 3 active islands (Forest, Volcanic,
  Frozen) + 5 locked islands rendered as silhouette / "Sắp ra mắt"
  banner. No level gate yet — the 3 active islands are all-unlocked.
- **Q2 — Zone layout:** every island has exactly 3 screens in a
  fixed sequence: **Entrance → Path → Boss Hall**.
- **Q3 / Q5 — Travel UX & tilemap tech:** point-and-click pathfinding
  on a static 1280×720 background PNG. No Tiled editor, no tilemap
  JSON. A walkable mask PNG (B/W) defines which pixels the player
  may stand on; A* finds the path; the player auto-walks along the
  computed waypoints. Touching a wandering monster sprite while
  walking → switch to `CombatScene` exactly like Phase 1.
- **Q4 — Boss Hall:** the final screen in the zone sequence (not a
  flag on `CombatScene`). Boss Hall is a dedicated `BossHallScene`
  because (a) the chest-drop flow is unique to it, (b) the
  persistent-defeat flag lives there, and (c) the backdrop art is
  always interior architecture rather than the outdoor zone biome.
- **Q6 — Persistence:** boss kills are permanent
  (`SaveState.defeatedBossIds: string[]`); regular monsters respawn
  every time the player re-enters a zone (no per-monster persistence).
  Chest-claim state is also permanent
  (`SaveState.claimedChestIds: string[]`).
- **Q7 — Boss reward flow:** boss death does NOT auto-route the
  player anywhere. The defeated boss sprite is removed; a chest
  sprite is spawned in its place; the player clicks the chest to
  open a `ChestRewardOverlay` (React, reuses `RewardChestOverlay`
  from Step 22.14); the overlay shows the loot and a single
  prominent "Về Bản Đồ" button that returns to `WorldMapScene`.
  No automatic teleport.

## 2. Goals

- Replace the placeholder `WorldScene` flow with a Prodigy-parity
  3-layer scene chain: `WorldMapScene → ZoneScene → BossHallScene`.
- Ship 3 active islands (Forest, Volcanic, Frozen) wired end-to-end:
  pick from world map → walk through entrance + path screens → defeat
  boss in boss hall → claim chest → return to world map.
- Persist boss-kill and chest-claim flags so the same player never
  re-fights the same boss; regular monsters always respawn so the
  zone is grindable for XP.
- Render every visual via Antigravity-delivered art only — exact
  filenames and prompts specified in §11. No placeholder PNGs ship.
- Reuse Sprint A's `CombatScene` / `CombatEntity[]` / `TurnQueue` /
  `ElementMatrix` / `CombatResolver` unchanged. Sprint B touches the
  scene chain and event bus around combat, not combat itself.
- Stay within 5 days of code work + 8 days of Antigravity asset work
  (parallel) per the roadmap budget.

## 3. Non-goals

- 5 remaining islands (Astral / Shadow / Storm / Ocean / Sky) — they
  render as locked silhouettes only. Active gameplay defers to
  Phase 3.
- Per-island level gating (Q1 explicitly chose all-unlocked for the
  3 active islands). A `requiredLevel` field on `IslandDef` is
  declared but unused this sprint; the gate evaluator is stubbed
  to `true` and tested.
- Pet rescue mechanic — Sprint C territory, even though pets battle
  alongside the hero in `CombatScene` from Sprint A.
- Quest panel hooks for "explore zone N" objectives — Sprint D.
- Boss multi-target abilities, minion spawns alongside the boss,
  scripted boss phases — Sprint B ships single-boss-only Boss Hall;
  multi-entity Boss Hall is a Phase 3 expansion.
- Tilemap (Tiled) authoring — explicitly rejected per Q3/Q5 in favor
  of static-background + walkable-mask + A*. The codebase will keep
  the existing `forest_tileset` asset reference for `WorldScene`
  legacy tests (do not delete) but no new tilemap is authored.
- Mini-map / fog-of-war — out of scope.
- Audio re-design — sprint reuses `world_walk`, `combat_enter`,
  `chest_open`, `victory_fanfare` SFX from Phase 1.5 audio bank.
  One new SFX requested: `world_island_select` (clicking an island
  on the world map). Antigravity audio bank already includes a
  generic `ui_click` we can route to it; no new audio file required.

## 4. Architecture overview

### 4.1 Scene chain delta

```
Phase 1 (today, on `main`):
  BootScene → PreloadScene → WorldScene ⇄ CombatScene

Sprint B (this spec):
  BootScene → PreloadScene → WorldMapScene
                              │
                              ▼ click active island
                              ZoneScene(zoneId, screen='entrance')
                              │
                              ▼ click "Đi vào"
                              ZoneScene(zoneId, screen='path')
                                  ├── overlap monster → CombatScene → resume
                                  └── click "Đi tiếp"
                              ▼
                              BossHallScene(zoneId)
                                  ├── click boss → CombatScene
                                  └── post-victory → click chest
                              ▼
                              ChestRewardOverlay (React)
                              │
                              ▼ click "Về Bản Đồ"
                              WorldMapScene
```

`WorldScene` (Phase 1) is **kept and frozen** behind a feature flag
`useLegacyWorldScene` defaulting `false`. Phase 1 E2E tests
(`smoke.spec.ts`, `full_flow.spec.ts`, `boss_quest.spec.ts`) flip the
flag to `true` so they keep passing during Sprint B development.
Sprint B authors the new chain on top; once the new E2E suite is
green, the legacy flag is removed in a Sprint B cleanup commit
referenced by the implementation plan.

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── game/scenes/
│   ├── WorldMapScene.ts       NEW — Phaser scene
│   ├── ZoneScene.ts           NEW — Phaser scene (param: zoneId, screen)
│   ├── BossHallScene.ts       NEW — Phaser scene
│   ├── WorldScene.ts          KEEP — frozen, legacy flag only
│   ├── CombatScene.ts         UNCHANGED
│   ├── BootScene.ts           UNCHANGED
│   └── PreloadScene.ts        EDIT — preload zone backgrounds + masks
├── domain/
│   ├── pathfinding/
│   │   ├── WalkableMask.ts    NEW — walkable mask reader
│   │   ├── AStar.ts           NEW — pure A* (no Phaser deps)
│   │   └── waypoints.ts       NEW — waypoint smoothing
│   └── ZoneRegistry.ts        NEW — IslandDef + ZoneDef pure data
├── data/staticConfig/
│   └── islands.ts             NEW — 8 IslandDef entries (3 active, 5 locked)
├── react/
│   ├── overlays/
│   │   ├── ChestRewardOverlay.tsx  EDIT — extend Step 22.14 overlay
│   │   │                            with "Về Bản Đồ" button + zone reward table
│   │   └── LockedIslandTooltip.tsx NEW — hover tooltip on locked island
│   └── screens/
│       └── (no change)
├── events/
│   └── (no new event store; reuse existing)
├── persistence/
│   └── SaveStateStore.ts      EDIT — v3 → v4 migration adding 3 fields
├── bus/
│   └── EventBus.ts            EDIT — add ENTER_ZONE, EXIT_ZONE,
│                              BOSS_DEFEATED, CHEST_OPENED events
└── types/
    └── zone.ts                NEW — IslandId, ZoneScreen, ChestDef types
```

Layer rules (AP §3.1, ESLint `boundaries/element-types`):

- `react/` MAY NOT import `phaser`. The chest overlay is React because
  it is overlaid on the canvas via a React portal (same pattern as
  `QuizOverlay`, `RewardChestOverlay`).
- `game/` MAY NOT import React. Phaser scenes communicate with React
  via the EventBus only.
- `domain/pathfinding/` is **pure TS** with **no Phaser, no DOM, no
  React imports** so it can be unit-tested headless.
- `data/staticConfig/islands.ts` is pure TS const data, importable
  from any layer.

### 4.3 Pathfinding tech (Q3/Q5 detail)

Static background (`forest-path_bg_1280x720.png`) renders as a single
`Phaser.GameObjects.Image` at depth 0. A walkable mask PNG
(`forest-path_walkable_1280x720.png`, palette: black `#000` =
walkable, white `#FFF` = blocked) is loaded as a hidden texture and
read once per scene-`create()` into a `Uint8Array` of length
`1280 × 720` via an off-screen canvas + `getImageData`. The mask
loader lives in `domain/pathfinding/WalkableMask.ts` and exposes:

```ts
export interface WalkableMask {
  readonly width: number;
  readonly height: number;
  isWalkable(x: number, y: number): boolean;  // O(1)
}
export function loadWalkableMask(
  textureSource: HTMLImageElement | HTMLCanvasElement
): WalkableMask;
```

A* is implemented in `domain/pathfinding/AStar.ts` on a downsampled
grid (block size 16 px → 80 × 45 cells per screen). 16 px keeps
search cheap (<3600 cells) while still letting the player squeeze
between trees. Heuristic = octile distance (8-direction movement
allowed). Output is a list of waypoints in **pixel coordinates**.

`waypoints.ts` smooths the raw cell-aligned path with a one-pass
line-of-sight collinear-merge so the player walks in straight diagonals
when possible, eliminating staircase wobble. Merging requires every
intermediate cell along the LOS segment to be walkable (Bresenham
sampling); when blocked we keep the original waypoint pair.

`ZoneScene` consumes waypoints, tweens the player sprite along them
at a fixed pixel-per-second speed (`PLAYER_WALK_SPEED = 220`), and
re-runs A* if the player re-clicks mid-walk (cancels current tween,
plans new path, walks). If A* returns no path (clicked on blocked
pixel), play a short "no" SFX and ignore.

Determinism requirement (verify.ts gate, harness rule 1): A* with
the same (start, goal, mask) inputs must return identical waypoint
list across runs — A* tie-breaks by lower `f` then lower `h` then
lower index, no `Math.random()` anywhere.

### 4.4 Monster encounter on Path screen

`ZoneScene` for the **path** screen pre-spawns N monsters (N = 3 per
zone, declared in `ZoneDef.pathMonsters: MonsterId[]`) at the
hard-coded waypoint coordinates declared in `islands.ts`. Each
monster sprite has a small wander tween (±40 px around its anchor,
4 s loop, additive on top of static position). Player overlap with
any monster's bounding box during their walk-tween fires
`ENTER_COMBAT { monster_id }`, pauses `ZoneScene`, launches
`CombatScene`. `EXIT_COMBAT { won: true, monster_id }` removes the
monster sprite (this run), resumes `ZoneScene`. On re-entry to the
zone, monsters respawn fresh (Q6).

### 4.5 Boss Hall flow

`BossHallScene` renders a 1280×720 static interior background
(`forest-boss-hall_bg_1280x720.png`), a single boss sprite anchored
at coordinates declared in `IslandDef.bossAnchor` (bottom-center of
the hall typically), and a "Quay lại" button bottom-left for retreat.
Click on the boss → `ENTER_COMBAT { monster_id: bossId }` →
`CombatScene` with the boss as the sole enemy entity (Sprint A's
`buildEntities` already supports 1 enemy).

`EXIT_COMBAT { won: true, monster_id: bossId }` →
`useSaveState.getState().addDefeatedBoss(bossId)` →
remove boss sprite → spawn chest sprite at `IslandDef.chestAnchor`
(slight offset from boss anchor so the spatial transition reads).
Click chest → emit `CHEST_OPENED { chestId, zoneId, items[] }` →
React opens `ChestRewardOverlay`. Overlay shows reward list + single
"Về Bản Đồ" button. Click → `eventBus.emit('EXIT_ZONE', { zoneId })`
→ `BossHallScene.shutdown` → `WorldMapScene.start`.

If the player has already defeated this boss
(`defeatedBossIds.includes(bossId)`), `BossHallScene.create` skips
boss + chest spawn and renders only a static "Đã chinh phục"
banner + "Quay lại" button. No re-fight, no re-claim.

### 4.6 Persistence (Q6 detail) — SaveState v3 → v4

```ts
interface SaveStateV4 extends SaveStateV3 {
  defeatedBossIds: string[];      // boss MonsterId list, deduped
  claimedChestIds: string[];      // chest id list, deduped
  currentZoneId: string | null;   // resume hint, null when on world map
}
```

Migration `v3→v4`: additive only. Old saves get all three fields
defaulted to `[]` / `null`. Migration unit-tested against fixed
v3 snapshot in `SaveStateStore.test.ts`.

Why use `string[]` instead of `Set<string>` despite handoff calling
it `Set`: Zustand `persist` middleware can't serialize `Set` without
a custom `replacer`/`reviver`, and the Phase 1 codebase already
chose `string[]` for `flags` and `inventory`. We keep the same
shape and dedupe inside the action (`addDefeatedBoss(id)` only
pushes if `!includes(id)`). Type alias `BossId = string` and
`ChestId = string` declared in `types/zone.ts`.

Resume policy: on app start, if `currentZoneId !== null`, the router
opens `ZoneScene(currentZoneId, 'entrance')` instead of
`WorldMapScene`. Click "Quay lại" anywhere clears `currentZoneId`.
This keeps the resume behavior consistent with Phase 1's
"resume where you left off" pattern.

### 4.7 EventBus delta

| Event | Payload | Direction | Replaces |
|---|---|---|---|
| `ENTER_ZONE` | `{ zoneId: string }` | scene → bus | none (new) |
| `EXIT_ZONE` | `{ zoneId: string, reason: 'retreat'\|'completed' }` | scene → bus | none (new) |
| `BOSS_DEFEATED` | `{ bossId: string, zoneId: string }` | resolver → bus | none (new) |
| `CHEST_OPENED` | `{ chestId: string, zoneId: string, items: InventoryItem[] }` | scene → bus → React overlay | none (new) |

Existing `ENTER_COMBAT`, `EXIT_COMBAT`, `TURN_RESOLVED` are unchanged.
`ENTER_COMBAT` is emitted from `ZoneScene` and `BossHallScene`
exactly as `WorldScene` emits it today.

Type-safe registration: extend `GameEvent` discriminated union in
`bus/EventBus.ts`. Sentry breadcrumb wiring already auto-captures
all bus events, no code change needed there.

### 4.8 Zone & Island registries (data layer)

`data/staticConfig/islands.ts`:

```ts
export interface ChestDef {
  id: string;                              // 'forest-boss-chest'
  rewardItems: { itemId: string; qty: number }[];
}

export interface ZoneDef {
  id: string;                              // 'forest-island'
  islandId: IslandId;
  bgEntrance: string;                      // texture key
  bgPath: string;
  bgBossHall: string;
  walkableEntrance: string;                // mask texture key
  walkablePath: string;
  walkableBossHall: string;                // mostly all-walkable but kept for symmetry
  pathMonsters: MonsterId[];               // length 3
  bossId: MonsterId;
  bossAnchor: { x: number; y: number };
  chestAnchor: { x: number; y: number };
  chest: ChestDef;
  playerSpawn: {                           // per-screen spawn coord
    entrance: { x: number; y: number };
    path: { x: number; y: number };
    bossHall: { x: number; y: number };
  };
}

export interface IslandDef {
  id: IslandId;                            // 'forest' | 'volcanic' | 'frozen' | ...
  displayName: string;                     // 'Đảo Rừng Xanh'
  element: ElementId;                      // dominant element
  status: 'active' | 'locked';
  worldMapAnchor: { x: number; y: number }; // position on World Map illustration
  iconKey: string;                         // texture key for the island marker
  zone: ZoneDef | null;                    // null when locked
  requiredLevel: number;                   // declared but unused this sprint
}

export const ISLANDS: IslandDef[] = [...];  // 3 active + 5 locked
```

8 islands: Forest (Plant), Volcanic (Fire), Frozen (Ice), Storm,
Ocean (Water), Earth, Astral, Shadow. First 3 = `status: 'active'`,
last 5 = `status: 'locked'`. Locked islands have `zone: null` and
render greyscale on the world map.

### 4.9 Scene-to-scene contract (Phaser scene data passing)

Phaser scene `start(key, data)` passes a typed payload:

```ts
interface ZoneSceneData {
  zoneId: string;
  screen: 'entrance' | 'path';
}
interface BossHallSceneData {
  zoneId: string;
}
interface CombatSceneData {     // existing, unchanged
  monsterId: MonsterId;
}
```

Each scene's `create(data: SceneData)` validates with Zod and falls
back to a safe default (`'forest-island'`, screen `'entrance'`) on
parse fail, logging a `console.error`. This matches the existing
`CombatScene.init` defensive pattern.

### 4.10 Why a single `ZoneScene` for entrance + path (not 3 separate)

Entrance and Path screens share 95% of code: static background image,
walkable mask + A*, click-to-walk player tween, "Đi tiếp" button,
shutdown logic. The only differences are (a) which background asset,
(b) which walkable mask, (c) whether monsters spawn. We pass
`screen: 'entrance' | 'path'` to one `ZoneScene` class and switch on
that field. This keeps the Phaser scene tree shallow (one class
covers 6 visual screens across 3 islands) and keeps testing surface
area small.

`BossHallScene` is separate because it has fundamentally different
state: defeated-boss flag, chest spawn, no walkable monsters, no
"Đi tiếp" button, special "Đã chinh phục" banner branch. Sharing a
class would push the entire boss-state machine into `ZoneScene`'s
already-busy `create()`.

## 5. Acceptance criteria

A feature is shippable when **all** of:

1. World Map renders 8 islands at the anchors declared in
   `islands.ts`. Active islands are full-color + clickable; locked
   islands are greyscale + show `LockedIslandTooltip` on hover and
   ignore clicks.
2. Clicking an active island calls
   `scene.start('ZoneScene', { zoneId, screen: 'entrance' })`.
3. Entrance screen shows the entrance background, the player at
   `playerSpawn.entrance`, and a "Đi vào" button. Click → re-enter
   `ZoneScene` with `screen: 'path'`.
4. Path screen renders the path background, 3 wandering monsters at
   declared positions, the player at `playerSpawn.path`, and a
   "Đi tiếp" button. Click anywhere walkable → A* walks the player
   there. Walking into a monster → `CombatScene`. Clicking
   "Đi tiếp" → `BossHallScene`.
5. Boss Hall renders the boss-hall background. If
   `defeatedBossIds.includes(bossId)`, render banner only; otherwise
   render boss + click-to-fight. Beating the boss spawns chest at
   `chestAnchor`; clicking chest opens `ChestRewardOverlay`.
6. Overlay's "Về Bản Đồ" button returns to `WorldMapScene` and
   sets `currentZoneId = null`.
7. Re-entering the same zone after boss kill: monsters respawn
   on path, but boss is gone (banner only). Chest is also gone
   (claimed flag).
8. Refresh during a zone visit (`currentZoneId === 'forest-island'`)
   resumes at the entrance screen of that zone, not at world map.
9. Type C gates: typecheck, lint, verify, full unit suite, full E2E
   suite all green. New tests required:
   - Unit: A* determinism (seeded inputs, frozen output snapshot)
   - Unit: WalkableMask reads correct pixels
   - Unit: ZoneRegistry (3 active + 5 locked, no duplicate IDs)
   - Unit: SaveState v3→v4 migration (additive, idempotent)
   - Unit: `addDefeatedBoss` / `addClaimedChest` dedupe
   - Unit: `WorldMapScene` (mocked Phaser) — locked islands ignore
     clicks, active islands emit `ENTER_ZONE`
   - Unit: `ZoneScene` entrance vs path branch correctness
   - Unit: `BossHallScene` defeated-boss branch (banner only)
   - E2E (Playwright, new spec
     `app/tests/e2e/sprint_b_zone_flow.spec.ts`): forest island
     full traverse — world map → entrance → path (skip a monster
     by walking around it) → boss hall → defeat boss → claim
     chest → return to world map. ~10 s runtime, 60 s timeout.
10. All 11 new PNG assets delivered by Antigravity (§11) and verified
    via `file <path>` (must report `PNG image data, ... 8-bit/color
    RGBA`). No placeholder PNG ships.

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Walkable-mask PNG accidentally not 1-bit (anti-aliased edges) → A* sees fuzzy walls | Med | Med | Loader thresholds at alpha < 128 = blocked; documented in Antigravity prompt as "no anti-aliasing on mask". Unit test asserts thresholding on a synthetic gradient. |
| R2 | A* on 80×45 grid hangs on pathological clicks (corner-trap) | Low | Low | Cap iterations at 5000 (worst-case 80×45 = 3600); on cap, return empty + log. |
| R3 | Player walks through monsters' wander tween before A* sees them | Med | Med | Monster overlap is checked every tick during the walk-tween, not only at click time. Tween's `onUpdate` runs the overlap test. |
| R4 | Antigravity ships entrance/path BGs but boss-hall BG slips schedule | High | Med | Spec splits the 3 backgrounds per island into independent prompts; entrance + path can ship without boss-hall, BossHallScene falls back to a CSS-styled solid color in dev only. Production blocks ship until all 9 BGs delivered. |
| R5 | Migration v3→v4 collides with v2→v3 from Sprint A on saves that are still v2 | Low | High | Migration runs sequentially: v2→v3 then v3→v4. Test both jumps from a fixed v2 snapshot. |
| R6 | `BossHallScene` wins-and-respawns chest because `EXIT_COMBAT` fires twice on edge cases (e.g. defeat retry) | Low | Med | `addClaimedChest` is the source of truth — the chest sprite checks the claimed-chest list before spawning. `EXIT_COMBAT` listener is `.once(...)`-shaped via a local `claimed` flag that resets on `shutdown`. |
| R7 | Player gets visually stuck "behind" a tree because depth ordering is off | Med | Low | Player sprite gets `setDepth(player.y)` updated each tick (Y-sort); decorative props in BG are baked into the BG PNG so no depth conflict. |
| R8 | E2E flake on the walk-tween timing (slower CI machine) | Med | Low | E2E uses `await scene.player.walkTo(x,y)` test-bridge helper that resolves on tween complete, not a fixed `await page.waitForTimeout`. |

## 7. AP / ISP impact

### 7.1 AP delta (v1.1 → addendum, no version bump per CEO veto on AP v1.2)

Append the following to AP v1.1 in a new commit `docs(ap): Sprint B
delta — scene chain, ENTER_ZONE/EXIT_ZONE/BOSS_DEFEATED/CHEST_OPENED,
SaveState v4`:

- **§3.1 (Folder structure)** — add `domain/pathfinding/`,
  `data/staticConfig/islands.ts`, `react/overlays/LockedIslandTooltip.tsx`,
  `types/zone.ts`. No layer rules change.
- **§6 (Navigation flow)** — diagram updated to the chain in §4.1.
- **§7 (Scene lifecycle)** — `WorldScene` marked legacy, new
  `WorldMapScene → ZoneScene → BossHallScene` lifecycle described.
- **§11 (Stat schema)** — no change; pet / hero stat shapes unchanged.
- **§13 (SaveState)** — v4 schema row added with the 3 new fields.
- **§14 (EventBus catalog)** — 4 new events with payload signatures.

### 7.2 ISP delta (v1.1 addendum)

Append a Phase 2.5 Sprint B row table to ISP v1.1 with steps S-B.1
through S-B.13 enumerated in the implementation plan. Sprint B
becomes a peer of Sprint A (✅ shipped) in the Phase 2.5 progression.

### 7.3 Appendix B (Wireframes) addendum

Append rough wireframes (ASCII or markdown sketch is fine; Antigravity
delivers the polished BG) for World Map, Zone Entrance, Zone Path,
Boss Hall, Chest Reward Overlay layouts.

## 8. Test strategy

### 8.1 Unit (Vitest, headless)

- `domain/pathfinding/AStar.test.ts` — fixed mask + seeded inputs,
  snapshot the waypoint list. Test: straight line, corner detour,
  no-path-found returns `[]`, iteration cap fires.
- `domain/pathfinding/WalkableMask.test.ts` — synthetic 4×4 mask,
  verify `isWalkable` matches expected matrix. Threshold at alpha
  < 128 boundary case.
- `domain/pathfinding/waypoints.test.ts` — collinear merge, LOS
  block (cannot merge across an obstacle), single-segment passthrough.
- `domain/ZoneRegistry.test.ts` — 3 active + 5 locked invariants;
  no duplicate IDs; every active island has a non-null zone with
  3 path monsters and 1 boss.
- `data/staticConfig/islands.test.ts` — every texture key referenced
  exists in the preload manifest (cross-table consistency check).
- `persistence/SaveStateStore.test.ts` — extend with v3→v4 migration
  cases; idempotent re-migration; partial corruption fallback.
- `game/scenes/WorldMapScene.test.ts` — mocked Phaser; click an
  active island → emits `ENTER_ZONE`; click a locked island → no
  emit, tooltip flag set.
- `game/scenes/ZoneScene.test.ts` — entrance branch: renders
  bg+player+button; path branch: renders bg+player+monsters+button;
  click on walkable point → A* runs and `playerWalkTween` set;
  click on blocked point → no tween, error SFX path.
- `game/scenes/BossHallScene.test.ts` — fresh: renders boss + chest
  hidden; after `EXIT_COMBAT(won=true)` → boss removed, chest
  visible; click chest → `CHEST_OPENED` emitted; defeated-boss
  branch: banner only.
- `react/overlays/ChestRewardOverlay.test.tsx` — renders rewards;
  "Về Bản Đồ" button click triggers `EXIT_ZONE` emit.

Target: ≥ 60 new unit tests across these files (existing 545 +
60 = 605 minimum).

### 8.2 E2E (Playwright)

New spec `app/tests/e2e/sprint_b_zone_flow.spec.ts`:

```
test('forest island full traverse', async ({ page }) => {
  await page.goto('/');
  await waitForGame(page);
  // World Map appears
  await page.evaluate(() => window.__GAME__.startWorldMap());
  // Click Forest island
  await page.evaluate(() => window.__GAME__.clickIsland('forest'));
  // Entrance → Path
  await page.evaluate(() => window.__GAME__.advanceZoneScreen());
  // Walk to boss-hall door, dodging monsters
  await page.evaluate(() => window.__GAME__.walkPathSafe());
  // Boss Hall → fight boss
  await page.evaluate(() => window.__GAME__.engageBoss());
  await answerQuizCorrectly(page); // hero turn — Sprint A bridge
  await answerQuizCorrectly(page); // pet auto-acts; loop until victory
  // Claim chest
  await page.evaluate(() => window.__GAME__.clickChest());
  await page.click('[data-testid="chest-overlay-back-to-world-map"]');
  // Back at World Map; persistence check
  const saveState = await page.evaluate(
    () => window.__GAME__.getSaveState()
  );
  expect(saveState.defeatedBossIds).toContain('forest-boss');
  expect(saveState.claimedChestIds).toContain('forest-boss-chest');
});
```

Required test-bridge additions (`gameTestBridge.ts`):

- `startWorldMap()` — start `WorldMapScene` clean
- `clickIsland(islandId)` — synthesize click on island marker
- `advanceZoneScreen()` — synthesize click on "Đi vào" / "Đi tiếp"
- `walkPathSafe()` — A* to the screen's "exit" anchor avoiding
  monsters; resolves on tween complete
- `engageBoss()` — synthesize click on boss sprite
- `clickChest()` — synthesize click on chest sprite

E2E timeout 60 s (Phase 1.5 setting). Test runs ~12-15 s on local.

### 8.3 Visual regression (Antigravity-assisted UAT)

Per `agent_roles.md`, Antigravity runs the real-Chromium UAT with
the staged builds. Sprint B UAT script:

- Open World Map screenshot ⇒ 8 islands visible, 3 in color, 5 grey
- Click Forest ⇒ entrance loads in <500 ms, no console error
- Walk to a monster on Path ⇒ combat transition matches Phase 1 polish
- Beat boss in BossHall ⇒ chest spawns within 200 ms of victory
- Claim chest ⇒ overlay opens, "Về Bản Đồ" returns to World Map
- Re-enter Forest ⇒ boss is gone, monsters respawn

Antigravity files bugs as ISP-flag-spec-drift entries; each becomes
its own commit before code lands (per `feedback_flag_spec_drift.md`).

## 9. Implementation sequencing (preview)

The implementation plan (`writing-plans` step) will own this exactly,
but to anchor expectations the plan will sequence as:

- **S-B.1** — `types/zone.ts` + `data/staticConfig/islands.ts`
  (3 active zones, 5 locked stubs, fixture data only)
- **S-B.2** — `domain/pathfinding/WalkableMask.ts` + tests
- **S-B.3** — `domain/pathfinding/AStar.ts` + tests
- **S-B.4** — `domain/pathfinding/waypoints.ts` + tests
- **S-B.5** — SaveState v3→v4 migration + actions + tests
- **S-B.6** — EventBus delta (4 new events) + tests
- **S-B.7** — `PreloadScene` edit: load 11 BGs + masks + island icons
- **S-B.8** — `WorldMapScene` + tests + test-bridge `clickIsland`
- **S-B.9** — `ZoneScene` (entrance + path branches) + tests +
  test-bridge `advanceZoneScreen` / `walkPathSafe`
- **S-B.10** — `BossHallScene` + tests + test-bridge `engageBoss` /
  `clickChest`
- **S-B.11** — `ChestRewardOverlay` extension + `LockedIslandTooltip`
  + React tests
- **S-B.12** — Wire `PhaserGame.tsx` scene array; add legacy flag for
  `WorldScene`; gate Phase 1 E2E specs on the flag
- **S-B.13** — New E2E spec `sprint_b_zone_flow.spec.ts` + AP/ISP
  delta docs commit + final review

13 steps total, each landing as one TDD red→green commit per the
project's hard-discipline pattern from Sprint A. Step S-B.7 (preload)
blocks S-B.8 onward; everything else is roughly linear.

## 10. Type classification

**Type C** — multi-scene chain delta + 4 new EventBus events +
SaveState v4 migration. POSUP+ARCH approval required at spec stage.
Sprint A established the precedent; Sprint B follows the same gate.

CI label gate (`.github/workflows/ci.yml`): PR must carry `type-C`
label.

## 11. Asset spec — Antigravity prompts

All assets land under `app/public/assets/`. Style anchor (every
prompt repeats this): **flat 2D vector art, flash-game finish, clean
2px outline, 3-tone cel shading, palette warm-#D4691E + cool-#3399FF
+ accent-#FFD700**. PNG-32 RGBA. No anti-aliased mask edges (mask
PNGs are 1-bit B/W).

### 11.1 World Map illustration (1 file)

- **Path:** `app/public/assets/zones/world_map_bg_1920x1080.png`
- **Spec:** 1920×1080, hand-painted look matching the style anchor.
  Composition: a fantasy ocean seen from a slight bird's-eye
  perspective. 8 floating elemental islands arranged in a loose
  ring, each with a distinct biome silhouette readable at 200 px:
  Forest (top-left, lush green canopy + waterfall), Volcanic
  (top-right, basalt cone + lava), Frozen (right, ice peaks +
  aurora), Storm (bottom-right, thunderhead crown), Ocean (bottom,
  coral atoll), Earth (bottom-left, mesa + canyon), Astral (left,
  starfield bubble), Shadow (top, twilight hex). 5 locked islands
  (Storm, Ocean, Earth, Astral, Shadow) drawn ~30% darker / desaturated
  compared to the 3 active ones. A subtle world-map title cartouche
  at top center reading "Bản đồ Thế giới" in a fantasy serif.
- **Antigravity prompt to send:**

  > Hand-painted fantasy world-map illustration, 1920×1080, top-down
  > slight perspective. Eight floating elemental islands on an ocean
  > backdrop arranged in a ring: Forest (green canopy + waterfall),
  > Volcanic (basalt cone + lava), Frozen (ice peaks + aurora),
  > Storm (thunderhead), Ocean (coral atoll), Earth (mesa canyon),
  > Astral (starfield bubble), Shadow (twilight hex). Forest,
  > Volcanic, Frozen rendered full color and brightly lit; the
  > other five rendered desaturated and shadowy. Style: flat 2D
  > vector art, flash-game finish, clean 2px outline, 3-tone cel
  > shading, palette warm-#D4691E + cool-#3399FF + accent-#FFD700.
  > Add a small ornate cartouche at top center with the Vietnamese
  > text "Bản đồ Thế giới" in a fantasy serif. PNG-32 RGBA.

### 11.2 Island markers / icons (8 files)

- **Paths:**
  - `app/public/assets/zones/island-icon_forest_192x192.png`
  - `app/public/assets/zones/island-icon_volcanic_192x192.png`
  - `app/public/assets/zones/island-icon_frozen_192x192.png`
  - `app/public/assets/zones/island-icon_storm_192x192.png`
  - `app/public/assets/zones/island-icon_ocean_192x192.png`
  - `app/public/assets/zones/island-icon_earth_192x192.png`
  - `app/public/assets/zones/island-icon_astral_192x192.png`
  - `app/public/assets/zones/island-icon_shadow_192x192.png`
- **Spec:** 192×192 PNG-32, square frame, transparent background.
  Each icon is a single-color circular badge with the biome glyph
  centered (Forest = leaf cluster, Volcanic = volcano silhouette,
  Frozen = snowflake, Storm = lightning bolt, Ocean = wave curl,
  Earth = mountain triangle, Astral = star, Shadow = crescent moon).
  Active islands: full color. Locked islands: same glyph rendered
  in greyscale 50% saturation.
- **Antigravity prompt:** sent in one batch with the 8 glyph
  descriptions above. Style anchor repeated.

### 11.3 Zone backgrounds (9 files = 3 zones × 3 screens)

For each of `forest`, `volcanic`, `frozen`:

- **Paths:**
  - `app/public/assets/zones/<biome>-entrance_bg_1280x720.png`
  - `app/public/assets/zones/<biome>-path_bg_1280x720.png`
  - `app/public/assets/zones/<biome>-boss-hall_bg_1280x720.png`
- **Spec:**
  - **Entrance** — outdoor wide shot, looking toward the path
    entrance (e.g. mossy archway for Forest, lava-rock gate for
    Volcanic, frozen pillars for Frozen). Walkable area: foreground
    plaza (~40% of canvas).
  - **Path** — winding outdoor route, decorative props (trees,
    rocks, bushes for Forest; obsidian boulders for Volcanic;
    snow drifts for Frozen). Walkable area: a meandering corridor
    with branches; 3 monster spawn anchors readable in the BG
    art via subtle clearings.
  - **Boss Hall** — interior architecture befitting the biome
    (Forest = vine-overgrown ancient gazebo; Volcanic = smelter
    cathedral; Frozen = ice palace throne hall). Single central
    dais where the boss stands; chest position offset slightly
    forward of the dais.
- **Antigravity prompt template (per file):**

  > Static 2D illustration backdrop, 1280×720, no UI elements,
  > no characters. Setting: <biome description above>. Style: flat
  > 2D vector art, flash-game finish, clean 2px outline, 3-tone
  > cel shading, palette warm-#D4691E + cool-#3399FF + accent-#FFD700.
  > Reserve approximately 60% walkable area in the lower 2/3 of
  > the canvas; props in the upper 1/3 and along the edges only.
  > PNG-32 RGBA.

### 11.4 Walkable masks (9 files = 1 per BG)

- **Paths:** alongside each BG, e.g.
  `app/public/assets/zones/forest-path_walkable_1280x720.png`
- **Spec:** 1280×720 PNG, **strictly black-or-white pixels (no
  anti-aliasing)**. Black = walkable. White = blocked. Same
  composition as the matching BG; mask out everything the player
  cannot stand on (props, water, lava, walls).
- **Antigravity prompt template:**

  > Pixel-accurate walkable mask for the matching background
  > illustration, 1280×720, strictly 1-bit (no anti-aliasing,
  > no greys). Black `#000000` = walkable area; white `#FFFFFF` =
  > blocked area (props, walls, edges of the painting). Trace
  > the playable floor of the original illustration and fill it
  > black; everything else white. Save as PNG-32 with alpha but
  > the channel content stays 1-bit.

### 11.5 Chest sprite (1 file, **reuses Phase 1.5 if available**)

- **Path:** `app/public/assets/juice/chest-zone_192x192.png` —
  if Step 22.14 already shipped a chest sprite at this path, reuse
  it and skip the new prompt.
- **Fallback prompt** (only if not present):

  > Treasure chest, 192×192, ¾ view, closed lid with golden trim,
  > slight gold glow halo. Style: flat 2D vector art, flash-game
  > finish, clean 2px outline, 3-tone cel shading, palette warm-#D4691E
  > + cool-#3399FF + accent-#FFD700. PNG-32 RGBA, transparent BG.

### 11.6 Asset count summary

- 1 World Map illustration
- 8 Island icons
- 9 Zone backgrounds
- 9 Walkable masks
- 0–1 Chest sprite (reuse Phase 1.5 if present)

**Total new PNGs to deliver: 27 (or 28 if chest is new).**

POSUP forwards prompts to Antigravity in 4 batches (world-map +
icons / forest set / volcanic set / frozen set) so partial deliveries
unblock partial dev.

## 12. Backwards compatibility & rollout

- Saves on v3 (post-Sprint-A) auto-migrate to v4 on first load.
- The legacy `WorldScene` stays in the build behind
  `useLegacyWorldScene` (default `false`). Phase 1 E2E specs flip
  it to `true` via `window.__GAME__.setLegacyWorldFlag(true)` in
  `beforeEach`; production never sets it.
- After Sprint B's E2E suite is green, a final commit in S-B.13
  removes the flag + the legacy `WorldScene` files (delete after
  verifying no test references remain).
- No external API surface changes — all of this is client-side.

## 13. Open questions (to flag during user spec review)

None blocking the plan. Two soft questions left for Antigravity to
answer during asset delivery:

- **OQ1:** does the `chest-zone_192x192.png` from Step 22.14 actually
  exist in the repo today? (S-B.10 falls back to drawing a primitive
  rectangle in dev if missing.) Plan step S-B.0 (preflight) checks
  this and either confirms reuse or queues the Antigravity prompt.
- **OQ2:** should the locked-island silhouettes show the biome glyph
  or a generic "?" mark? Spec defaults to the greyscale glyph
  (sneak-peek principle); change is one prompt edit if POSUP picks
  "?" instead.

---

**End Sprint B design spec.** Next step: `writing-plans` skill turns
this into `docs/superpowers/plans/2026-05-02-sprint-b-maps-plan.md`.
