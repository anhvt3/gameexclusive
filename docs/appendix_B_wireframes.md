# APPENDIX B — UI Wireframes (ASCII)

> Companion to `architecturepack_Game_SS3_exclusive_v1.0_22042026.md` Section 2.3.
> Base resolution: **1280×720** (Phase 1 desktop/tablet landscape).

---

## WF1 — Main Menu (React)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│              [Clevai Logo]                                       │
│                                                                  │
│                                                                  │
│          ╔═══════════════════════════════╗                       │
│          ║                               ║                       │
│          ║      🐿️ SÓC CLEVAI            ║                       │
│          ║    (animated greeting)        ║                       │
│          ║                               ║                       │
│          ╚═══════════════════════════════╝                       │
│                                                                  │
│                                                                  │
│           ┌─────────────────────────────┐                        │
│           │  BẮT ĐẦU CUỘC PHIÊU LƯU    │  ← primary CTA          │
│           └─────────────────────────────┘                        │
│                                                                  │
│           ┌─────────────────────────────┐                        │
│           │       TIẾP TỤC              │  ← disabled if no save  │
│           └─────────────────────────────┘                        │
│                                                                  │
│           ┌──────────┐  ┌──────────┐                             │
│           │ CÀI ĐẶT  │  │  GIỚI THIỆU │                          │
│           └──────────┘  └──────────┘                             │
│                                                                  │
│                                            v1.0  © Clevai 2026  │
└──────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Sóc Clevai animated idle: blink every 3s, tail wag loop 1.5s
- Hover CTA → Sóc pose "excited" + glow outline
- Click CTA → fade to WF2 (world) or tutorial if first-time

---

## WF2 — World Map (Phaser WorldScene)

```
┌──────────────────────────────────────────────────────────────────┐
│ [HUD top] 💖 HP ████████░░ 80/100  💎 MP ██████░░░░ 60/100       │
│           ⭐ Lv.5  📖 Quest: Tiêu diệt 3 quái lửa (1/3)          │
│                                                                  │
│    🌳  🌳        🌳                                  ┌────────┐  │
│       🌳   🐸←quái                                   │ MAP    │  │
│            🌳       ┌──────────┐                     │ [mini] │  │
│  🌳                 │          │     🌳              │        │  │
│          🌳         │   🧙‍♂️    │              🐉←quái│   ●    │  │
│                     │   PLAYER │                     │        │  │
│       🌊            │          │         🌳          │        │  │
│                     └──────────┘                     └────────┘  │
│  🌊     🌊                             🌳                        │
│                        🌳                                        │
│              🐢←NPC       🌳                                     │
│                                                                  │
│ [HUD bottom] 🎒 Inv  📚 Spells  🐿️ Pets  ⚙️ Menu                │
└──────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- WASD / Arrow keys + touch joystick (tablet) để di chuyển
- Arcade Physics collision: cây/nước block đường
- Overlap với 🐸 quái → pause → transition to WF3 (CombatScene)
- Click NPC 🐢 → WF6 mascot dialog (nhưng là NPC khác, không phải Sóc)
- Minimap top-right tự update theo player position

---

## WF3 — Combat Scene (Phaser CombatScene)

```
┌──────────────────────────────────────────────────────────────────┐
│  🌋 BACKGROUND: biome-matched (rừng/hang/biển)                   │
│                                                                  │
│                                                                  │
│  ┌─────────────────┐                    ┌─────────────────┐      │
│  │  🐸 Embershed   │                    │    🧙‍♂️ Player   │      │
│  │  Lv.3           │                    │    Lv.5         │      │
│  │  ❤️ ████░░ 28/40│                    │  ❤️ ████████ 80 │      │
│  │  🔥 Weak: Water │                    │  💎 ████░░ 60  │      │
│  └─────────────────┘                    └─────────────────┘      │
│                                                                  │
│  ┌─────────────────┐                    ┌─────────────────┐      │
│  │  [Monster sprite]                    │  [Player sprite] │      │
│  │   facing right                       │   facing left    │      │
│  │   (Phaser 3/4 view)                  │                  │      │
│  └─────────────────┘                    └─────────────────┘      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  CHỌN CHIÊU THỨC:                                                │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                          │
│  │ 💧   │  │ 🔥   │  │ 🌿   │  │ ⚡   │                          │
│  │Water │  │Fire  │  │Plant │  │Storm │                          │
│  │Jet   │  │Blast │  │Whip  │  │Bolt  │                          │
│  │pwr 2.2│ │pwr 1.8│ │pwr 2.0│ │pwr 1.9│                          │
│  └──────┘  └──────┘  └──────┘  └──────┘                          │
│                                                                  │
│  [🛡️ Phòng thủ]  [🎒 Vật phẩm]  [🏃 Chạy trốn]                   │
└──────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click spell → Phaser pause → emit `OPEN_QUIZ` → fade to WF4 overlay
- Nếu spell có element mạnh (weak-match) → border màu đỏ nhấp nháy + hint "Hiệu quả cao!"
- HP bar animated tween khi dmg
- Victory → particle firework → WF5 reward popup

---

## WF4 — Quiz Overlay (React, đè lên Phaser)

**Variant A — Multiple Choice (quiz_type_id = 3):**
```
┌──────────────────────────────────────────────────────────────────┐
│  [Phaser background, blurred, darkened 40%]                      │
│                                                                  │
│  ╔════════════════════════════════════════════════════════════╗  │
│  ║  ⏱️ 00:14        TRẢ LỜI ĐÚNG → TUNG PHÉP!     ✨ LO#12345 ║  │
│  ║                                                            ║  │
│  ║  📖 Toán - Lớp 5 - Phân số                                 ║  │
│  ║                                                            ║  │
│  ║  Kết quả của 1/2 + 1/4 = ?                                 ║  │
│  ║                                                            ║  │
│  ║  ┌────────────┐  ┌────────────┐                            ║  │
│  ║  │   A. 1/6   │  │   B. 3/4   │                            ║  │
│  ║  └────────────┘  └────────────┘                            ║  │
│  ║  ┌────────────┐  ┌────────────┐                            ║  │
│  ║  │   C. 2/6   │  │   D. 1/8   │                            ║  │
│  ║  └────────────┘  └────────────┘                            ║  │
│  ║                                                            ║  │
│  ║                      [XÁC NHẬN]                            ║  │
│  ╚════════════════════════════════════════════════════════════╝  │
│                                                     ┌──────────┐ │
│                                                     │ 🖊️ Nháp  │ │
│                                                     │  ảo      │ │
│                                                     └──────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Variant B — Cloze (quiz_type_id = 1):**
```
╔════════════════════════════════════════════════════════════╗
║  📖 KEN - Grade 8 - Grammar                                ║
║                                                            ║
║  Điền từ thích hợp vào chỗ trống:                          ║
║                                                            ║
║  "She ___(1)___ to school every day and ___(2)___ her     ║
║   homework at 5pm."                                        ║
║                                                            ║
║   (1): [ goes     ▼]   (2): [ does     ▼]                  ║
║                                                            ║
║                      [XÁC NHẬN]                            ║
╚════════════════════════════════════════════════════════════╝
```

**Variant C — Drag & Drop (quiz_type_id = 8):**
```
╔════════════════════════════════════════════════════════════╗
║  Kéo các từ vào ô trống phù hợp:                           ║
║                                                            ║
║  Danh từ (Noun):    [___]  [___]  [___]                    ║
║  Động từ (Verb):    [___]  [___]                           ║
║                                                            ║
║  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    ║
║  │ run    │ │ apple  │ │ jump   │ │ book   │ │ tree   │    ║
║  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    ║
║                                                            ║
║                      [XÁC NHẬN]                            ║
╚════════════════════════════════════════════════════════════╝
```

**Interactions:**
- Fade in 200ms
- Whiteboard tool góc phải dưới (ẩn/hiện bằng button)
- Submit → validate → emit `QUIZ_RESULT` → fade out 200ms
- Anti-cheat: nếu timeSpent < MIN_TIME → flag (không reject, chỉ telemetry)

---

## WF5 — HUD Overlay (React, luôn hiện ở WorldScene)

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐                                  [⚙️ Menu] │
│  │ 🧙‍♂️ Player      │                                             │
│  │ Lv.5  100 XP    │                                             │
│  │ ❤️ ████████ 80 │                                             │
│  │ 💎 █████░ 60   │                                             │
│  └─────────────────┘                                             │
│                                                                  │
│  📖 Quest Tracker:                                               │
│  ┌────────────────────────────────────────┐                      │
│  │ ➤ Tiêu diệt 3 quái lửa  (1/3)         │                      │
│  │ ➤ Thu thập 5 quả táo    (3/5)         │                      │
│  └────────────────────────────────────────┘                      │
│                                                                  │
│                                                                  │
│                                                                  │
│                                                                  │
│                                      ┌─────────────────────────┐ │
│                                      │ 🎒 🐿️ 📚 🎵            │ │
│                                      │ Inv Pet Spl Set         │ │
│                                      └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## WF6 — Mascot Sóc Dialog (React)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Phaser dimmed background]                                      │
│                                                                  │
│                                                                  │
│                                                                  │
│  ┌──────────┐                                                    │
│  │          │                                                    │
│  │  🐿️     │                                                    │
│  │  SÓC     │                                                    │
│  │  CLEVAI  │                                                    │
│  │          │                                                    │
│  └──────────┘                                                    │
│  ╔════════════════════════════════════════════════════════════╗  │
│  ║ SÓC CLEVAI: "Chào con! Để mở khóa hang động băng,          ║  │
│  ║  con cần giải được 5 bài Toán lớp 3 nhé. Sẵn sàng chưa?"   ║  │
│  ║                                                            ║  │
│  ║                  [ĐỒNG Ý!]    [ĐỂ LÁT]                     ║  │
│  ╚════════════════════════════════════════════════════════════╝  │
│                                                                  │
│                                                         [Space]→ │
└──────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Typewriter text effect (30ms/char)
- Space / Enter → skip typewriter → full text
- Portrait Sóc có 4 pose swap theo mood (greet / talk / cheer / think)
- Dialog branching — khác nhau theo grade của student + progress flags

---

## B.7 Responsive Notes

| Breakpoint | Device | Layout |
|---|---|---|
| 1920×1080 | Desktop full | Canvas 1280×720 centered, letterbox |
| 1280×720 | Desktop base | Canvas fill |
| 1024×768 | iPad | Canvas scale-fit, HUD slightly larger |
| 960×540 | Android tablet | Canvas scale-fit, touch joystick appears |
| < 768px | Mobile portrait | ❌ Phase 1 KHÔNG SUPPORT — hiện rotation prompt |

---

## B.8 Z-Index / Layering

```
z:0   Phaser canvas (WorldScene / CombatScene)
z:10  HUD (React, pointer-events: none except icons)
z:100 Quiz Overlay (React, fullscreen modal)
z:200 Mascot Dialog (React, can appear over quiz)
z:500 Notification toast
z:999 Debug panel (dev only)
```
