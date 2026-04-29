# Audio wire — deferred SFX

These SFX keys exist in the AudioManager registry and have asset files,
but no suitable call-site exists in Phase 1+1.5 code. Per the task
prompt rule "Đừng force-fit", they are deferred until the underlying
feature ships.

## Deferred keys

### `ui_error_beep`
- **Intended call-sites (per spec):**
  - `InventoryScreen.tsx` — equip locked item → no "locked item" concept
    in Phase 1 (`SaveStateStore.equipItem` always succeeds, no `locked`
    field on `ItemDef`).
  - `CombatScene.ts` — cast spell with insufficient MP → no MP system
    in Phase 1 (combat uses flat damage formula, no resource gate).
- **Unblock when:** Phase 2 introduces MP costs OR item-lock mechanic.
- **Owner:** POSUP (decide whether MP gate is in-scope for Phase 2 ISP).

### `world_collect_item`
- **Intended call-site:** `WorldScene.ts` — pickup item drop on world map.
- **Why deferred:** Phase 1 has no on-map item drops. Item rewards flow
  through `LEVEL_UP` event → `RewardChestOverlay` (no world pickup).
- **Unblock when:** Phase 2 introduces field-drop mechanic (Pet Breeding
  shards / quest tokens picked up while exploring).

## Already wired

| Key | File | Line ref |
|---|---|---|
| `ui_btn_hover` | `MainMenu.tsx`, `InventoryScreen.tsx`, `GuildLeaderboard.tsx`, `MascotDialog.tsx`, `QuizOverlay.tsx` | onMouseEnter handlers |
| `ui_btn_click` | Same files as above | onClick handlers |
| `ui_popup_open` | `MascotDialog.tsx`, `QuizOverlay.tsx` | mount useEffect |
| `ui_popup_close` | `MascotDialog.tsx`, `QuizOverlay.tsx` | unmount cleanup |
| `math_correct` / `math_wrong` | `QuizOverlay.tsx` | handleSubmit |
| `math_whiteboard_draw` | `WhiteboardPad.tsx:79` | continueStroke (80ms throttle) |
| `combat_monster_cry` | `CombatScene.ts:194` | scene mount |
| `combat_hit_impact` | `CombatScene.ts:311, 327` | player + monster damage |
| `combat_miss` | `CombatScene.ts:311` | dmg=0 branch |
| `combat_encounter` | `appLifecycle.ts` | ENTER_COMBAT |
| `combat_victory` | `appLifecycle.ts` | EXIT_COMBAT(won) |
| `combat_cast_fire` / `combat_cast_ice` | `appLifecycle.ts` | CAST_SPELL element switch |
| `combat_heal` | (no heal mechanic) | DEFER same as ui_error_beep |
| `world_step_grass` | `Player.ts:78` | update() throttled 350ms |
| `world_chest_open` | `RewardChestOverlay.tsx:76, 95` | wobble→open + skip |
| `world_npc_talk` | `MascotDialog.tsx:48` | text non-empty mount |
| `world_level_up` | `appLifecycle.ts` | LEVEL_UP |
| `math_keyboard_tap` | (no numeric input on Phase 1 quiz) | DEFER until quiz adds numeric pad |

## Re-flag rule

When Phase 2 features land that map to deferred keys, that PR's
description must explicitly say "wires deferred audio key X per
audio_wire_blockers.md".
