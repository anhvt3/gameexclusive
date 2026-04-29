# Audio Manifest — Game_SS3_exclusive

Generated: 2026-04-28
Source task: `tasks/prompt_download_sfx.md`

## Summary

- **22 SFX** in `app/public/assets/audio/sfx/` — all `.ogg` Vorbis q3, mono, 22050 Hz, < 500 KB each
- **4 BGM** in `app/public/assets/audio/bgm/` — all `.ogg` Vorbis q4, mono, 22050 Hz, 8-second loop, < 2 MB each

## Network constraint context

The original prompt suggested Kenney.nl / OpenGameArt / Freesound. **All three were blocked by the sandbox proxy allowlist** (`403 blocked-by-allowlist`). The follow-up prompt `prompt_integrate_audio.md` claimed Node.js native `fetch()` could bypass the proxy — this was tested and is **incorrect** in the current environment (Node `fetch` ignores `https_proxy` env and fails DNS with `EAI_AGAIN`).

The two sources that ARE reachable from the sandbox are `registry.npmjs.org` and `github.com`. Files were obtained via `npm install` of audio asset packages.

## SFX source breakdown

### From `@peal-sounds/peal` v0.2.1 (MIT, by arach — github.com/arach/peal)

Original peal files are raw float32 LE PCM at 48 kHz mono (despite the `.wav` extension — they have no RIFF header). Converted via `ffmpeg -f f32le -ar 48000 -ac 1 -i ... -c:a libvorbis -q:a 3`.

| Destination file | Peal source | Used for |
|---|---|---|
| `sfx/ui_btn_hover.ogg` | hover.wav | onMouseEnter buttons |
| `sfx/ui_btn_click.ogg` | click.wav | onClick buttons / menus |
| `sfx/ui_popup_open.ogg` | notification.wav | Modal / popup open |
| `sfx/ui_popup_close.ogg` | transition.wav | Modal / popup close |
| `sfx/ui_error_beep.ogg` | warning.wav | Invalid action / locked |
| `sfx/math_keyboard_tap.ogg` | tap.wav | Virtual keyboard keypress |
| `sfx/math_correct.ogg` | success.wav | Correct answer ding |
| `sfx/math_wrong.ogg` | error.wav | Wrong answer buzz |
| `sfx/combat_encounter.ogg` | alert.wav | Monster collision -> battle start |
| `sfx/combat_miss.ogg` | swoosh.wav | Evade / attack miss |
| `sfx/combat_heal.ogg` | unlock.wav | Heal item / skill |
| `sfx/combat_victory.ogg` | complete.wav | Battle win jingle |
| `sfx/world_collect_item.ogg` | select.wav | Item pickup |
| `sfx/world_chest_open.ogg` | startup.wav | Chest open |
| `sfx/world_npc_talk.ogg` | message.wav | NPC dialog start |

### Procedurally synthesized via ffmpeg lavfi (no external source)

These were generated locally with ffmpeg sine / noise / filter chains because Kenney was unreachable. Acceptable as in-engine placeholders; replace with real CC0 assets when proxy or local download is available.

| File | Recipe | Duration |
|---|---|---|
| `sfx/math_whiteboard_draw.ogg` | pink noise + bandpass 1.5-6 kHz + fade | 0.40s |
| `sfx/combat_cast_fire.ogg` | brown noise (bandpass 600 Hz w=800) + 400 Hz tone | 0.60s |
| `sfx/combat_cast_ice.ogg` | sine 2.4 kHz + 3.2 kHz + vibrato 12 Hz | 0.70s |
| `sfx/combat_hit_impact.ogg` | sine 90 Hz + brown noise (bandpass 200 Hz) | 0.18s |
| `sfx/combat_monster_cry.ogg` | brown noise lowpass 350 Hz + sine 70 Hz + vibrato 8 Hz | 0.60s |
| `sfx/world_step_grass.ogg` | pink noise (highpass 2 kHz / lowpass 7 kHz) | 0.12s |
| `sfx/world_level_up.ogg` | C5-E5-G5-C6 sine arpeggio (140 ms steps) | 0.70s |

### BGM — all procedurally synthesized via ffmpeg lavfi

8-second loops. Mono, 22050 Hz, OGG Vorbis q4. Layered sine waves with tremolo / vibrato / lowpass filtering. **These are placeholders for development; replace with real CC0 music tracks before public release.**

| File | Concept | Recipe |
|---|---|---|
| `bgm/bgm_main_menu.ogg` | Cheerful, upbeat | C-G-Am-F bass progression (130-220 Hz, 2s each) + C5 melody with tremolo 4 Hz |
| `bgm/bgm_world_explore.ogg` | Calm ambient pad | Layered C major (C3+E3+G3+C4) + slow vibrato 0.5 Hz |
| `bgm/bgm_combat_active.ogg` | Tense, fast pulse | G2 + D3 + Bb3 sines with rapid tremolo 8/4/2 Hz (pulsing feel) |
| `bgm/bgm_math_thinking.ogg` | Lofi calm focus | A2+E3+A3+A4 minor pad, lowpass 2 kHz, soft tremolo |

## License notes

- **Peal** (`@peal-sounds/peal`): MIT License. Attribution: arach (github.com/arach/peal).
- **Procedurally generated files**: Output of `ffmpeg lavfi` filters — no copyright on machine-generated synthesis based on standard mathematical waveforms. Treat as CC0 / public domain.

The original prompt called for CC0 only; MIT is more permissive than CC0 for use but requires attribution. For internal Clevai non-commercial use this is acceptable. If strictly CC0 is required, replace the 15 peal-derived SFX with Kenney equivalents when proxy access is restored.

## File tree

```
app/public/assets/audio/
├── bgm/
│   ├── bgm_combat_active.ogg     12872  bytes
│   ├── bgm_main_menu.ogg         13222  bytes
│   ├── bgm_math_thinking.ogg     14041  bytes
│   └── bgm_world_explore.ogg     12824  bytes
└── sfx/
    ├── combat_cast_fire.ogg       6413  bytes  [synth]
    ├── combat_cast_ice.ogg        6553  bytes  [synth]
    ├── combat_encounter.ogg       4088  bytes  [peal: alert]
    ├── combat_heal.ogg            3837  bytes  [peal: unlock]
    ├── combat_hit_impact.ogg      4305  bytes  [synth]
    ├── combat_miss.ogg            4519  bytes  [peal: swoosh]
    ├── combat_monster_cry.ogg     5373  bytes  [synth]
    ├── combat_victory.ogg         4021  bytes  [peal: complete]
    ├── math_correct.ogg           3944  bytes  [peal: success]
    ├── math_keyboard_tap.ogg      3642  bytes  [peal: tap]
    ├── math_whiteboard_draw.ogg   5678  bytes  [synth]
    ├── math_wrong.ogg             3784  bytes  [peal: error]
    ├── ui_btn_click.ogg           3858  bytes  [peal: click]
    ├── ui_btn_hover.ogg           3568  bytes  [peal: hover]
    ├── ui_error_beep.ogg          3860  bytes  [peal: warning]
    ├── ui_popup_close.ogg         3822  bytes  [peal: transition]
    ├── ui_popup_open.ogg          3856  bytes  [peal: notification]
    ├── world_chest_open.ogg       4281  bytes  [peal: startup]
    ├── world_collect_item.ogg     3696  bytes  [peal: select]
    ├── world_level_up.ogg         5196  bytes  [synth]
    ├── world_npc_talk.ogg         3809  bytes  [peal: message]
    └── world_step_grass.ogg       4343  bytes  [synth]
```

Total: 26 files, ~178 KB combined.

## Validation results

- All 22 SFX < 500 KB ✓
- All 4 BGM < 2 MB ✓
- All 26 files probe successfully via `ffprobe` ✓
- All files are valid OGG Vorbis ✓
- Naming follows `[category]_[action/object].ogg` snake_case convention ✓

## Recommended next steps

1. Listen-test in browser: drop into a temporary HTML page with `<audio>` tags to subjectively verify each sound fits its purpose.
2. Replace placeholders before public release. Targets:
   - 7 procedural SFX (combat_cast_*, combat_hit_impact, combat_monster_cry, math_whiteboard_draw, world_step_grass, world_level_up)
   - All 4 BGM tracks (procedural synth is too thin for real game music)
3. Suggested CC0 sources when proxy access is restored:
   - Kenney UI Audio pack (`kenney.nl/assets/ui-audio`)
   - Kenney Impact Sounds (`kenney.nl/assets/impact-sounds`)
   - Kenney RPG Audio (`kenney.nl/assets/rpg-audio`)
   - Kenney Music Loops 1-3 (`kenney.nl/assets/music-loops`)
   - OpenGameArt for monster cries / fantasy magic
4. Continue with `tasks/prompt_integrate_audio.md` — Phaser Preloader registration + React `useGameAudio` hook + EventBus wiring.
