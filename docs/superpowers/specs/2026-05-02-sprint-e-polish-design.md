# Sprint E — Polish & Onboarding — Design Spec

**Phase:** 2.5 Prodigy-Parity
**Type:** **B** (Entity Schema delta + SaveState v6→v7 — POSUP approval). **Spec drift from roadmap §E** which classified as Type A (UI only) — practically impossible since 4 new persisted SaveState fields are required.
**Author:** Claude (Game_SS3 worktree `claude/sprint-e-polish`)
**Status:** Draft → awaiting POSUP review (02/05/2026)
**Roadmap parent:** `docs/roadmap_phase2.5_prodigy_parity.md` (§ Sprint E)
**Predecessors:** Sprint A (`ed6dbee`), Sprint B (`c5a78b4`), Sprint C (`b79f3ac`), Sprint D (`9388301`)

---

## 1. Why this sprint

Sprints A-D delivered the gameplay loop (combat → maps → pets → quests).
Sprint E layers on the **onboarding + identity + control surface** that
turns a one-time visitor into a returning player:

- **Identity:** student picks a name and a wizard look (gender + hair).
  HUD personalizes — "Khách" placeholder becomes the chosen name across
  MainMenu, CombatScene HUD, Quests Panel, etc.
- **Onboarding:** the existing 4-beat Sóc tutorial extends to 8 beats
  covering Sprint A-D features (zones, pets, quests, claim) with
  hybrid Phaser-canvas + React-DOM gesture overlays pointing at the
  exact UI element being explained.
- **Settings:** student gets agency over the experience — mute audio,
  pick quiz hint difficulty (50% / 25% / 0% hint visibility), reset
  save with confirm, replay tutorial.

POSUP-approved decisions (02/05/2026, brainstorming Q1-Q6):

- **Spec drift confirmation:** Sprint E is **Type B**, not Type A as
  roadmap states. Reason: 4 new persisted SaveState fields cannot
  fit in existing `flags: Record<string, boolean>` (no string types).
- **Q1 — Onboarding flow:** *MainMenu-first*. First launch → MainMenu
  shows `playerName = null` placeholder "Khách". Click "Bắt đầu" → if
  not yet onboarded → modal sequence: 8-beat tutorial → name picker
  → customization → mark `TUTORIAL_FLAG=true` + persist name + persist
  customization → navigate `/play` as normal. Subsequent launches
  skip the modal sequence.
- **Q2 — Name selection:** *preset list of 12 Vietnamese names + Random
  button*. No free-text input. Names: 6 male (Minh, Nam, Bảo, Khải, An,
  Khoa) + 6 female (Linh, Hương, Trang, Mai, Vy, Châu). Selection sets
  `playerName` and `gender` together (each preset name carries an
  associated gender).
- **Q3 — Customization knobs:** *gender + hair*. Skip outfit color
  (existing equipment slot in `/inventory` handles it). 2 genders × 4
  hair styles = 8 combos. **Antigravity has delivered all 8 hair
  PNGs** (1024×1024 PNG-32 RGBA) at
  `app/public/assets/player/hair/{male|female}_hair_{a,b,c,d}.png`
  (verified post-spec-draft, 02/05/2026). Sprint E ships with real
  sprite assets — preloaded into Phaser texture cache + rendered as
  `<img>` tags in the React customization UI.
- **Q4 — Tutorial extension:** *4 new beats covering Sprint A-D
  features* with exact POSUP-approved wording (see §4.4). Style aligned
  to existing beats 1-4 ("bạn" addressing throughout — Beat 6 corrected
  from "em" to "bạn" per POSUP review 02/05/2026):
  - Beat 5: World Map 3 islands
  - Beat 6: Pet rescue post-combat
  - Beat 7: Open Quests panel
  - Beat 8: Sparkle bell on ready quest
- **Q5 — Gesture overlay:** *hybrid* — `TutorialStep.target` declares
  `{ type: 'canvas' | 'dom'; selector: string }`. Engine routes to a
  Phaser canvas arrow OR a React DOM arrow (CSS-positioned via
  `getBoundingClientRect()`) per target type.
- **Q6a — Hint difficulty:** *quiz hint frequency only*. Easy = 50% of
  quiz cards show a hint button, Medium = 25%, Hard = 0%. Combat help
  text already covered by element-icon UI from Phase 1.5.
- **Q6b — Settings panel scope:** **4 controls ship Sprint E:** audio
  mute, hint difficulty (3-way segmented), reset save (with confirm
  dialog), replay tutorial (clears `TUTORIAL_FLAG` + navigates to
  onboarding sequence).

## 2. Goals

- Ship the 8-beat tutorial + onboarding sequence + name picker +
  customization preview + settings panel end-to-end.
- Add 4 new persisted fields to SaveState v7: `playerName`, `gender`,
  `hairStyle`, `hintDifficulty`.
- Personalize the existing UI surface (MainMenu, CombatScene HUD,
  QuestsPanel header) to read `playerName` with "Khách" fallback.
- Wire `hintDifficulty` into `QuizFactory` / quiz card rendering so
  hint button visibility respects the setting.
- Extend `TutorialSequence` with hybrid gesture-overlay support
  (Phaser canvas arrow + React DOM arrow) routed by `target.type`.
- All changes documented in **AP §11.8 (NEW)** and **ISP** Sprint E
  row table per project rule.
- Stay within the 2-day code budget.
- No new asset files block ship — placeholder hue-rotate substitutes
  for the 8 hair PNGs until Antigravity delivers.

## 3. Non-goals

- **Free-text name input** (Q2 explicitly preset-only).
- **Outfit color customization** in onboarding (Q3 — equipment slot
  already handles outfits).
- **Language selector** (Vi/En toggle) — Phase 3+.
- **Tutorial branch logic** — linear 8-beat sequence only; no
  conditional branches based on student level/completion state.
- **Voice-over for tutorial** — text-only Sóc dialog; audio polish
  defer to Phase 3+.
- **Sprite swap on customization** — placeholder hue-rotate; real
  per-hair sprites land when Antigravity delivers (separate art-only
  follow-up commit).
- **Full re-localization of existing UI** — only personalization
  callsites (HUD, headers) updated. Misc UI text stays unchanged.
- **Settings persistence to server** — local-only, Phase 3 sync.

## 4. Architecture overview

### 4.1 SaveState v6 → v7

```ts
interface SaveStateV7 extends SaveStateV6 {
  playerName: string | null;          // null = "Khách" placeholder, onboarding pending
  gender: 'male' | 'female';          // default 'male'
  hairStyle: 'a' | 'b' | 'c' | 'd';   // default 'a'
  hintDifficulty: 'easy' | 'medium' | 'hard';  // default 'medium'
}
```

Migration v6→v7: additive — old saves get all 4 defaults
(`playerName: null`, `gender: 'male'`, `hairStyle: 'a'`,
`hintDifficulty: 'medium'`). `playerName: null` is the trigger for
the onboarding sequence — once set non-null, sequence is skipped.

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── types/
│   └── identity.ts                  NEW — Gender, HairStyle, HintDifficulty unions + name presets
├── data/staticConfig/
│   └── namePresets.ts               NEW — 12 preset Vietnamese names with gender mapping
├── react/
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx       NEW — orchestrates tutorial → name → customization sequence
│   │   ├── OnboardingFlow.test.tsx
│   │   ├── NamePicker.tsx           NEW — 12-preset grid + Random button
│   │   ├── NamePicker.test.tsx
│   │   ├── CustomizationPicker.tsx  NEW — gender × hair preview
│   │   └── CustomizationPicker.test.tsx
│   ├── mascot/
│   │   ├── TutorialSequence.tsx     EDIT — add gesture overlay support per step
│   │   ├── TutorialSequence.test.tsx
│   │   ├── tutorialSteps.ts         EDIT — add 4 beats + target field
│   │   ├── tutorialSteps.test.ts    EDIT
│   │   └── TutorialArrow.tsx        NEW — hybrid Phaser/DOM arrow overlay
│   ├── screens/
│   │   ├── SettingsPanel.tsx        NEW — /settings route
│   │   ├── SettingsPanel.test.tsx
│   │   └── MainMenu.tsx             EDIT — playerName display + "Settings" button + onboarding trigger
│   └── shell/
│       └── AppRouter.tsx            EDIT — register /settings route
└── react/quiz/
    └── QuizCard.tsx                 EDIT — hint button visibility respects hintDifficulty
```

(`react/onboarding/` is a new subfolder, paralleling Sprint C's
`react/overlays/PetRescueOverlay.tsx` location pattern.)

Layer rules:
- `types/identity.ts`, `data/staticConfig/namePresets.ts` — pure data.
- `react/onboarding/`, `react/mascot/TutorialArrow.tsx`,
  `react/screens/SettingsPanel.tsx` — React only, NO Phaser imports.
- `TutorialArrow.tsx` for `target.type === 'canvas'` reads
  `phaserCanvasElement.getBoundingClientRect()` from the canvas DOM
  node (which IS DOM-side); the arrow itself is rendered as a CSS
  div over the canvas, NOT as a Phaser sprite. This keeps the arrow
  layer-clean (no `react/` → `phaser` import).

### 4.3 Onboarding flow (Q1 detail)

```
First launch (playerName === null):
  ┌─ User opens app at /
  │
  ├─ MainMenu renders with playerName="Khách" placeholder
  │
  ├─ User clicks "Bắt đầu" button
  │
  ├─ AppRouter.beforeNavigate('/play') intercepts:
  │     if (!playerName && !flags.tutorial_completed) {
  │       open <OnboardingFlow />, pause /play navigation
  │     }
  │
  ├─ OnboardingFlow modal sequence:
  │   ├─ Step 1: 8-beat <TutorialSequence />
  │   │           (existing 4 beats + 4 new beats, all gesture overlays)
  │   ├─ Step 2: <NamePicker />
  │   │           User taps preset → set playerName + gender
  │   │           Or clicks "Ngẫu nhiên" → random preset
  │   ├─ Step 3: <CustomizationPicker />
  │   │           User picks gender (overrides Step 2 if differs) + hair (a/b/c/d)
  │   │           "Hoàn tất" button → setState({ gender, hairStyle })
  │   │
  │   └─ On complete:
  │       useSaveState.setFlag(TUTORIAL_FLAG, true)
  │       (playerName + gender + hairStyle already persisted)
  │       Resume /play navigation
  │
  └─ Subsequent launches: playerName !== null → MainMenu personalizes,
                          "Bắt đầu" navigates straight to /play

Settings → "Replay Tutorial" button:
  useSaveState.setFlag(TUTORIAL_FLAG, false)
  Open <OnboardingFlow startStep="tutorial" /> with name+customization
  steps disabled (only tutorial replays). On complete, set TUTORIAL_FLAG=true.
```

**State transitions:**
- `playerName === null && !tutorial_completed` → first launch (full sequence)
- `playerName === null && tutorial_completed` → impossible state (defensive: re-run name+customization)
- `playerName !== null && tutorial_completed` → normal play
- `playerName !== null && !tutorial_completed` (after Replay) → tutorial-only

### 4.4 Tutorial 8 beats with gesture targets

```ts
// types/identity.ts
export type GestureTarget =
  | { type: 'canvas'; selector: string }   // selector = Phaser scene key + named anchor, e.g. 'WorldScene:player'
  | { type: 'dom'; selector: string };     // selector = data-testid on a React element

// react/mascot/tutorialSteps.ts
export interface TutorialStep {
  portraitFile: string;
  text: string;
  target?: GestureTarget;   // NEW Sprint E
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  // Beats 1-4 (existing, no targets) — preserve current wording exactly
  { portraitFile: 'soc_guide_greet.png',
    text: 'Chào bạn! Mình là Sóc — bạn đồng hành của bạn trong thế giới Elemagica.' },
  { portraitFile: 'soc_guide_talk.png',
    text: 'Thế giới này có quái vật mang 8 nguyên tố. Chạm vào quái là bạn bước vào trận đấu.',
    target: { type: 'canvas', selector: 'WorldScene:enemy' } },
  { portraitFile: 'soc_guide_think.png',
    text: 'Mỗi trận: chọn phép, trả lời câu đố. Trả lời đúng → gây sát thương. Sai → quái phản công.' },
  { portraitFile: 'soc_guide_cheer.png',
    text: 'Sẵn sàng chưa? Cùng bắt đầu phiêu lưu nào!' },

  // Beats 5-8 (NEW Sprint E, exact wording per POSUP Q4)
  { portraitFile: 'soc_guide_talk.png',
    text: 'Bản đồ thế giới có 3 đảo: Forest, Volcanic, Frozen.',
    target: { type: 'dom', selector: 'main-menu-play' } },
  { portraitFile: 'soc_guide_cheer.png',
    text: 'Cứu pet sau combat → pet đi cùng bạn đánh nhau.',
    target: { type: 'canvas', selector: 'CombatScene:pet-slot' } },
  { portraitFile: 'soc_guide_talk.png',
    text: 'Mở bảng Quests để xem nhiệm vụ mỗi ngày nhé.',
    target: { type: 'dom', selector: 'main-menu-quests' } },
  { portraitFile: 'soc_guide_cheer.png',
    text: 'Bấm chuông 🔔 nhận thưởng khi thấy nhiệm vụ sáng vàng nha!',
    target: { type: 'dom', selector: 'main-menu-quests-sparkle' } },
];
```

**Stylistic alignment:** Beat 6 corrected from "em" → "bạn" per POSUP
review 02/05/2026 to match existing beats 1-4 addressing. Beats 5/7/8
have no addressing (no edit needed).

### 4.5 Hybrid gesture overlay (Q5 detail)

`TutorialArrow.tsx` renders an animated arrow over the active step's
target. Both target types use a CSS `<div>` with `position: fixed`
positioned via `getBoundingClientRect()`:

```tsx
// react/mascot/TutorialArrow.tsx
export function TutorialArrow({ target }: { target: GestureTarget }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const compute = () => {
      let element: HTMLElement | null = null;
      if (target.type === 'dom') {
        element = document.querySelector(`[data-testid="${target.selector}"]`);
      } else {
        // canvas type — read named anchor coordinates from the Phaser scene
        // and offset by canvas getBoundingClientRect.
        const canvas = document.querySelector('[data-testid="phaser-container"] canvas') as HTMLCanvasElement | null;
        if (!canvas) return;
        const sceneAnchor = readPhaserSceneAnchor(target.selector);
        if (!sceneAnchor) return;
        const rect = canvas.getBoundingClientRect();
        setPos({ x: rect.left + sceneAnchor.x, y: rect.top + sceneAnchor.y });
        return;
      }
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [target]);

  if (!pos) return null;
  return (
    <div
      data-testid="tutorial-arrow"
      className="pointer-events-none fixed z-50 animate-bounce"
      style={{ left: pos.x - 16, top: pos.y - 48 }}
    >
      <span className="text-4xl drop-shadow-lg">⬇️</span>
    </div>
  );
}
```

`readPhaserSceneAnchor(selector)` is a small helper that maps strings
like `'WorldScene:player'` → `{ x, y }` from a per-scene anchor
registry (a static `Record<string, { x, y }>` map maintained by each
scene). For Sprint E only 2 canvas targets are needed (`WorldScene:enemy`
and `CombatScene:pet-slot`); each scene declares its anchor map in a
new `getTutorialAnchors()` static method.

```ts
// e.g. game/scenes/WorldScene.ts
WorldScene.getTutorialAnchors = (): Record<string, { x: number; y: number }> => ({
  enemy: { x: 480, y: 320 },     // hardcoded near the first enemy spawn
});
```

This avoids React→Phaser import (the helper reads from a global registry
populated by scene `init()` hooks).

### 4.6 Name preset catalog (Q2 detail)

```ts
// data/staticConfig/namePresets.ts
export interface NamePreset {
  readonly name: string;
  readonly gender: 'male' | 'female';
}

export const NAME_PRESETS: ReadonlyArray<NamePreset> = [
  { name: 'Minh',   gender: 'male' },
  { name: 'Nam',    gender: 'male' },
  { name: 'Bảo',    gender: 'male' },
  { name: 'Khải',   gender: 'male' },
  { name: 'An',     gender: 'male' },
  { name: 'Khoa',   gender: 'male' },
  { name: 'Linh',   gender: 'female' },
  { name: 'Hương',  gender: 'female' },
  { name: 'Trang',  gender: 'female' },
  { name: 'Mai',    gender: 'female' },
  { name: 'Vy',     gender: 'female' },
  { name: 'Châu',   gender: 'female' },
];
```

**Random button:** `randomPreset(rng = Math.random): NamePreset` returns
`NAME_PRESETS[Math.floor(rng() * NAME_PRESETS.length)]`. Test-injectable
rng for deterministic E2E.

### 4.7 Customization rendering (Q3 — real Antigravity assets)

8 hair PNG sprites (PNG-32 RGBA, 1024×1024) live at:

```
app/public/assets/player/hair/
├── male_hair_a.png       male_hair_b.png
├── male_hair_c.png       male_hair_d.png
├── female_hair_a.png     female_hair_b.png
└── female_hair_c.png     female_hair_d.png
```

**Two consumption paths**:

1. **React customization UI** — direct `<img>` tag in
   `CustomizationPicker.tsx`:

   ```tsx
   <img
     src={`/assets/player/hair/${gender}_hair_${hairStyle}.png`}
     alt={`${gender} hair ${hairStyle}`}
     className="h-32 w-32 object-contain"
   />
   ```

   Layered over the existing base-player sprite (`base_player_male.png`
   or `base_player_female.png`) using absolute positioning to compose
   the wizard preview (head + body).

2. **Phaser texture preload** — `PreloadScene.ts` adds 8 entries to
   `PHASE1_ASSETS.images` (mirroring Sprint B/C asset wiring pattern):

   ```ts
   { key: 'hair-male-a', path: '/assets/player/hair/male_hair_a.png' },
   { key: 'hair-male-b', path: '/assets/player/hair/male_hair_b.png' },
   { key: 'hair-male-c', path: '/assets/player/hair/male_hair_c.png' },
   { key: 'hair-male-d', path: '/assets/player/hair/male_hair_d.png' },
   { key: 'hair-female-a', path: '/assets/player/hair/female_hair_a.png' },
   { key: 'hair-female-b', path: '/assets/player/hair/female_hair_b.png' },
   { key: 'hair-female-c', path: '/assets/player/hair/female_hair_c.png' },
   { key: 'hair-female-d', path: '/assets/player/hair/female_hair_d.png' },
   ```

   Texture key convention: `hair-{gender}-{style}` (hyphen-separated to
   match Sprint A pet sprites + Sprint B zone backgrounds).

3. **In-game compositing** — `CombatScene` + `WorldScene` render the
   player using base sprite + selected hair sprite as two layered
   `Phaser.GameObjects.Sprite` instances at the player anchor. The
   `Player.ts` entity (Phase 1.5 base layered rendering, Step 22.12)
   already has a layering mechanism for equipment overlay; extend with
   a `hairSpriteKey` slot (sibling to existing equipment overlay
   slots).

The persisted `hairStyle` is `'a'|'b'|'c'|'d'`; texture key resolves
deterministically as `hair-${gender}-${hairStyle}`. No fallback art
needed — all 8 PNGs verified on disk pre-implementation.

### 4.8 Personalization callsites

`playerName` reads with "Khách" fallback at:
- `MainMenu.tsx` — header greeting "Xin chào, {name}!"
- `CombatScene.ts` — hero entity `name` field set from
  `useSaveState.getState().playerName ?? 'Khách'` at `buildEntities()`
- `QuestsPanel.tsx` — header subtitle "Nhiệm vụ của {name}"

The fallback constant `PLAYER_NAME_PLACEHOLDER = 'Khách'` lives in
`types/identity.ts` so all callsites import from one source.

### 4.9 Hint difficulty wiring (Q6a detail)

```ts
// react/quiz/QuizCard.tsx (or equivalent)
const HINT_VISIBILITY_PROBABILITY: Record<HintDifficulty, number> = {
  easy: 0.5,
  medium: 0.25,
  hard: 0,
};

// at render time:
const difficulty = useSaveState((s) => s.hintDifficulty);
const hintSeed = useMemo(() => Math.random(), [questionId]); // stable per question
const showHint = hintSeed < HINT_VISIBILITY_PROBABILITY[difficulty];
```

Per-question deterministic seed (`useMemo` keyed on `questionId`)
prevents hint flicker on re-render. Visibility decision is local to the
quiz component; no event bus involvement.

**If existing QuizCard component does not have a per-question id seam:**
add `questionId` prop and thread through. Verify before implementing.

### 4.10 Settings panel (Q6b detail)

```
+-----------------------------------------+
|  /settings                          [X] |
+-----------------------------------------+
| ⚙️ Cài đặt                              |
+-----------------------------------------+
| 🔊 Âm thanh         [ ON | OFF ]        |
| 💡 Độ khó gợi ý     [Dễ|Vừa|Khó]        |
| ↺ Chơi lại hướng dẫn   [Bắt đầu]        |
| 🗑️ Xoá lưu game        [Reset]          |
+-----------------------------------------+
```

- **Audio mute:** binds to `useSaveState.flags.audio_muted` (existing
  Phase 1.5 setup); flip toggles `audioManager.setMuted()`.
- **Hint difficulty:** 3-way segmented control writing to
  `useSaveState.setHintDifficulty()`.
- **Replay tutorial:** `setFlag(TUTORIAL_FLAG, false)` + navigate to
  `/onboarding-tutorial-only` (or open `<OnboardingFlow startStep="tutorial" />`
  modal in place).
- **Reset save:** opens confirm dialog "Xoá toàn bộ tiến trình? Không thể hoàn tác." → `useSaveState.reset()` + reload window.

### 4.11 EventBus delta

**No new events.** Sprint E is UI-and-state-driven; existing subscribers
(toast, sparkle, etc.) keep working. The `setHintDifficulty` /
`setPlayerName` / `setGender` / `setHairStyle` SaveState actions trigger
React re-renders via Zustand subscriptions — no event bus needed.

## 5. Acceptance criteria

1. **Schema v7:** `playerName` (default null), `gender` (default 'male'),
   `hairStyle` (default 'a'), `hintDifficulty` (default 'medium') exist.
   Old v6 saves migrate cleanly with these defaults.
2. **First-launch onboarding:** when `playerName === null` AND
   `!flags.tutorial_completed`, clicking "Bắt đầu" on MainMenu opens
   `<OnboardingFlow />` modal, blocking `/play` until name + customization
   are set.
3. **Subsequent launch:** when `playerName !== null` AND
   `flags.tutorial_completed`, clicking "Bắt đầu" navigates directly to
   `/play`.
4. **8-beat tutorial:** displays in sequence; beats with `target` show
   the gesture arrow; beats without don't.
5. **Gesture overlay:** DOM target arrow positions over a `data-testid`
   element; canvas target arrow positions over a Phaser scene anchor
   coordinate (via `getBoundingClientRect()` of the canvas).
6. **Name picker:** 12 preset cards rendered (6 male, 6 female grouped).
   Click sets `playerName` + `gender` together. "Ngẫu nhiên" button
   picks a random preset (deterministic with injected rng for tests).
7. **Customization picker:** 2 gender toggles + 4 hair toggles. Visual
   preview uses base-player sprite with CSS hue-rotate placeholder for
   the 4 hair variants. "Hoàn tất" persists `gender` + `hairStyle`.
8. **MainMenu personalization:** when `playerName !== null`, header
   reads "Xin chào, {playerName}!"; otherwise "Xin chào, Khách!".
9. **CombatScene HUD:** hero entity `name` reads `playerName ?? 'Khách'`.
10. **QuestsPanel header:** reads "Nhiệm vụ của {playerName ?? 'Khách'}".
11. **Hint difficulty:** at `easy`, ~50% of quiz questions show hint
    button; at `medium`, ~25%; at `hard`, 0%. Per-question deterministic
    (no flicker on re-render).
12. **Settings panel mounted at `/settings`:** 4 controls render.
    Audio mute toggle flips `flags.audio_muted` and calls
    `audioManager.setMuted`. Hint difficulty segmented writes
    `setHintDifficulty`. Replay tutorial clears `TUTORIAL_FLAG` +
    re-opens onboarding (tutorial-only mode). Reset save shows confirm,
    on confirm calls `useSaveState.reset()` + `window.location.reload()`.
13. **Type B gates:** lint + typecheck + verify + full unit suite green.
    New tests required (~50):
    - `types/identity.test.ts` — name presets shape + count
    - `data/staticConfig/namePresets.test.ts` — 12 entries (6M+6F),
      unique names, randomPreset uniformity
    - `react/onboarding/NamePicker.test.tsx` — render + click +
      random
    - `react/onboarding/CustomizationPicker.test.tsx` — toggles +
      hue-rotate preview
    - `react/onboarding/OnboardingFlow.test.tsx` — sequence
      orchestration + persist on complete
    - `react/mascot/tutorialSteps.test.ts` — 8 entries + 5 with
      target field
    - `react/mascot/TutorialSequence.test.tsx` — gesture arrow appears
      for steps with target
    - `react/mascot/TutorialArrow.test.tsx` — DOM target positions +
      canvas target positions (mocked)
    - `react/screens/SettingsPanel.test.tsx` — 4 controls + reset
      confirm + replay tutorial
    - `persistence/SaveStateStore.test.ts` — v6→v7 migration + 4 new
      setters
    - `react/screens/MainMenu.test.tsx` — playerName personalization
    - E2E `app/tests/e2e/sprint_e_onboarding.spec.ts` — first launch
      → tutorial → name pick → customization → /play with personalized
      HUD; subsequent launch skips onboarding.

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Hair PNG asset commit on main missed before Sprint E merge → 404 + visible UI breakage | Low | High | Pre-merge gate: `chore: commit Sprint E hair PNG assets` lands on main first (same pattern as Sprint A `49e5e79`). Documented in §10.3 + tasks/todo.md. |
| R2 | Per-question hint seed via `Math.random()` is non-deterministic in E2E | Low | Low | Inject seedable RNG via `useSaveState.getState().__hintRng()` test seam. Document in spec. Defer if Sprint D pattern matches. |
| R3 | Canvas tutorial arrow drift when window resizes mid-step | Med | Low | `useEffect` already adds `resize` listener; recomputes on every resize. |
| R4 | Reset save during active session leaves Phaser scenes in inconsistent state | Med | Med | Reset path forces `window.location.reload()` after `reset()` — guarantees a clean re-init. Confirm dialog warns "Sẽ tải lại trang". |
| R5 | "Replay tutorial" from Settings while on a non-MainMenu route reloads the user out of context | Med | Low | Replay tutorial NAVIGATES to `/` first then opens onboarding-tutorial-only modal. Spec wires it. |
| R6 | Tutorial style alignment | — | — | RESOLVED 02/05/2026 — Beat 6 changed from "em" to "bạn" per POSUP. All 8 beats now consistent. |
| R7 | `playerName === null && tutorial_completed` is an impossible state — but defensive check needed if user manually edits localStorage | Low | Low | OnboardingFlow checks both flags; if `tutorial_completed && !playerName`, skip tutorial step but still run name+customization. Test covers edge case. |
| R8 | Hint button visibility conflict with existing QuizCard if it lacks `questionId` seam | High | Med | Task plan reads QuizCard.tsx FIRST; if missing seam, propose minimal additive prop change inline. No surprise refactor. |
| R9 | Onboarding modal blocks `/play` route — if user closes browser mid-onboarding, returns to MainMenu with playerName still null → loop on next click | Low | Low | This is intended UX (forced onboarding). Document, no mitigation needed. |

## 7. AP / ISP impact

### 7.1 AP delta (additive, no version bump)

Append "Sprint E — Delta" section to AP v1.1:

- **§3.1** — add `react/onboarding/`, `react/mascot/TutorialArrow.tsx`,
  `react/screens/SettingsPanel.tsx`, `types/identity.ts`,
  `data/staticConfig/namePresets.ts`.
- **§11.8 — Identity & Settings schema (NEW):** Document `playerName`,
  `gender`, `hairStyle`, `hintDifficulty` semantics. State transitions
  for onboarding flow (null playerName → onboarding gate). Hint
  difficulty mapping to quiz hint visibility probability table.
- **§13** — SaveState v7 row: 4 new fields with defaults.
- **§14** — no event additions (Sprint E is state-driven).

### 7.2 ISP delta

Append a Sprint E row table:

| # | Step | Status |
|---|---|---|
| S-E.0 | Preflight | ⏳ |
| S-E.1 | `types/identity.ts` + `data/staticConfig/namePresets.ts` | ⏳ |
| S-E.2 | SaveState v6→v7 + 4 setters + tests | ⏳ |
| S-E.3 | `react/mascot/tutorialSteps.ts` extend (target field + 4 new beats) | ⏳ |
| S-E.4 | `react/mascot/TutorialArrow.tsx` (hybrid Phaser/DOM positioning) | ⏳ |
| S-E.5 | `react/mascot/TutorialSequence.tsx` integrates TutorialArrow | ⏳ |
| S-E.6 | `react/onboarding/NamePicker.tsx` | ⏳ |
| S-E.7 | `react/onboarding/CustomizationPicker.tsx` (real hair PNG layered render) | ⏳ |
| S-E.7b | `PreloadScene.ts` adds 8 hair PNG load entries; `Player.ts` adds hairSpriteKey slot for in-game render | ⏳ |
| S-E.8 | `react/onboarding/OnboardingFlow.tsx` (sequence orchestrator) | ⏳ |
| S-E.9 | `react/screens/MainMenu.tsx` personalization + onboarding trigger + Settings button | ⏳ |
| S-E.10 | `react/screens/SettingsPanel.tsx` (4 controls) | ⏳ |
| S-E.11 | `react/quiz/QuizCard.tsx` honors hintDifficulty | ⏳ |
| S-E.12 | `CombatScene.ts` + `QuestsPanel.tsx` personalization callsites | ⏳ |
| S-E.13 | `AppRouter.tsx` registers /settings route | ⏳ |
| S-E.14 | E2E `sprint_e_onboarding.spec.ts` | ⏳ |
| S-E.15 | AP §11.8 + §13 delta + ISP roll-up + tasks/todo.md | ⏳ |

16 steps. Larger surface than Sprint D (14) due to more React touchpoints
(name + customization + tutorial extension + settings + 3
personalization callsites) but each step stays focused.

## 8. Test strategy

### 8.1 Unit (Vitest) — target ≥ 50 new tests

Distribution mirrors §5 acceptance criteria one-to-one.

### 8.2 E2E (Playwright)

`app/tests/e2e/sprint_e_onboarding.spec.ts`:

```
test('sprint E first launch: tutorial → name pick → customization → /play', ...)
```

Steps:
1. Reset save state (clean slate, playerName=null, no tutorial_completed)
2. Navigate to /
3. Verify MainMenu shows "Xin chào, Khách!"
4. Click "Bắt đầu"
5. Onboarding modal opens with tutorial step 1
6. Click through 8 tutorial beats (use `[data-testid="tutorial-next"]`)
7. NamePicker appears, click preset "Minh" → verify gender=male persisted
8. CustomizationPicker appears, toggle hair to 'b' → verify hairStyle='b'
   persisted
9. Click "Hoàn tất"
10. Navigate to /play (combat or world map)
11. Verify HUD reads "Minh" not "Khách"
12. Reload page → confirm onboarding does NOT re-trigger

### 8.3 Visual UAT (Antigravity)

Real-Chromium walk-through:
- First launch shows "Khách" placeholder + onboarding triggers correctly
- Tutorial gesture arrows point to correct UI elements (canvas + DOM)
- Customization hue-rotate looks acceptable as placeholder (or flag for art replacement)
- Settings panel renders 4 controls, all functional

## 9. Type classification

**Type B** — Entity Schema delta (4 new persisted SaveState fields +
v7 migration). NOT Type C: no Event Layer changes.

CI label gate: `type-B`.

## 10. Asset spec — Antigravity status

### 10.1 Delivered (ship Sprint E with real assets)

- ✅ 8 hair PNGs (PNG-32 RGBA, 1024×1024, transparent BG):
  `app/public/assets/player/hair/{male|female}_hair_{a,b,c,d}.png`
  (verified 02/05/2026 post-spec-draft)

### 10.2 Optional / deferred (Tailwind fallback acceptable)

- 1 name picker UI plate: `name_picker_plate_800x120.png` (parchment
  scroll motif). Sprint E ships with Tailwind `bg-amber-100` gradient
  fallback if undelivered — non-blocking.

### 10.3 Asset commit follow-up

The 8 hair PNGs land in main from Antigravity outside the
`claude/sprint-e-polish` branch (currently sit untracked on main
worktree). A `chore: commit Sprint E hair PNG assets` commit needs to
land on main BEFORE merging the Sprint E branch — same pattern as
Sprint A pet PNGs (`49e5e79`) and Sprint A/B juice PNGs (`097a5aa`).
This is documented in tasks/todo.md as a pre-merge step.

## 11. Open questions baked as defaults (anh review khi review spec)

None — all 6 brainstorming questions + 2 sub-questions + spec drift
have explicit answers from POSUP. Beat 6 stylistic alignment also
resolved (em → bạn) per POSUP 02/05/2026.

---

**End Sprint E design spec.** Next step: anh review → user approval →
invoke `writing-plans` skill to produce the implementation plan.
