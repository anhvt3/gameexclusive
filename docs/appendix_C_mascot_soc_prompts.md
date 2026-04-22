# APPENDIX C — Mascot Sóc Clevai — Full Spec & Prompts

> Companion to `architecturepack_Game_SS3_exclusive_v1.0_22042026.md` Section 4.
> Phương án đã chốt: **D — NPC Guide + Combat Evolved Form**

---

## C.1 Design Philosophy

**Brand values Clevai thể hiện qua mascot:**
- **Ấm áp** (warm) — màu cam/nâu chủ đạo, không dùng đỏ gắt
- **Thông minh** (wise) — mắt to, biểu cảm tò mò, cử chỉ suy nghĩ
- **Thân thiện** (friendly) — tỷ lệ chibi, cười hiền, không fangs/claws đe dọa
- **Năng lượng** (energetic) — tail bushy, đuôi cong lên, pose active

**Không được:**
- ❌ Không giống sóc thực tế quá (không muốn "động vật")
- ❌ Không anthropomorphic 100% (không mặc suit, mang giày) — chỉ phụ kiện magical
- ❌ Không aggressive/dark — Sóc là "friend", không "warrior"

**Palette chính thức:**
```
Primary:    #D4691E (Clevai warm orange — lưng, đuôi chính)
Secondary:  #F4A261 (light tan — bụng, mặt)
Accent:     #8B4513 (dark brown — outline, vằn)
Magical:    #7209B7 (purple — magical accessories only)
Highlight:  #FFD700 (gold — evolution form crown/trim)
```

---

## C.2 Form 1 — Sóc Guide (NPC form, Phase 1 MUST-HAVE)

### Role
- NPC dẫn chuyện, xuất hiện ở Main Menu, Tutorial, HUB, trước boss fights
- KHÔNG tham gia combat
- Gương mặt tròn, biểu cảm thân thiện, luôn có book hoặc wand nhỏ kèm

### 4 Pose states

#### Pose C1 — Greet (default / main menu)
```
[STYLE]: chibi mascot 2D, Clevai warm-friendly, thick outline 2px, 3-tone cel-shaded
[PALETTE]: #D4691E, #F4A261, #8B4513, #7209B7 purple wand tip, #FFD700 accent
[SUBJECT]: Sóc Clevai — a chibi red-orange squirrel with round body, big curious amber eyes, fluffy bushy tail curled upward, tiny purple wizard hat, holding a small floating spellbook that glows softly
[POSE - greet]: standing on hind legs, front paws raised in a welcoming wave, tail curled high, big warm smile, eyes bright
[ANIMATION]: 4-frame idle loop (tail sway, blink every 3s)
[SIZE]: 512x512 character, portrait + full body separate files
[NEGATIVE]: no realistic squirrel texture, no aggressive fangs, no shoes or pants, no background, no shadow
```

#### Pose C2 — Talk (dialog mode)
```
[POSE - talk]: slightly leaning forward, one paw gesturing, book open mid-air next to him, mouth animated open-close cycle, eyes focused and kind
[ANIMATION]: 2-frame mouth + head bob
[USE]: WF6 Mascot Dialog
```

#### Pose C3 — Cheer (success / reward)
```
[POSE - cheer]: jumping with both paws raised high, tail fully fluffed, eyes closed in joy, sparkles around him, wizard hat tilted
[ANIMATION]: jump + confetti burst (1s one-shot)
[USE]: Quest complete, level up, correct answer
```

#### Pose C4 — Think (hint / encouragement)
```
[POSE - think]: one paw on chin, head tilted slightly, eyes looking up thoughtfully, book floating and pages turning, a small question mark bubble
[ANIMATION]: 3-frame subtle bob + question mark fade in/out
[USE]: Shown when student fails 3 quizzes in a row — "Để Sóc gợi ý nhé!"
```

---

## C.3 Form 2 — Sóc Combat (Evolved battle form, Phase 2+)

### Trigger Lore
- Sau khi học sinh hoàn thành Tutorial + first boss, Sóc Clevai "evolve" thành Battle Form
- Từ đó, Sóc thành Pet đi theo player trong combat, cast spell lửa (hệ Fire starter)
- Học sinh có thể cho Sóc level up qua combat success

### Design direction
- Vẫn là Sóc, nhưng **fluffier, larger, more magical**
- Mặc **armor nhẹ bằng gỗ/vải magical** (không kim loại nặng)
- Cầm **staff phép thuật** (không phải wand nhỏ nữa)
- **Mắt phát sáng amber** khi cast spell
- Tail có **aura lửa nhỏ** (hệ Fire element)

### 4 Pose states

#### Pose C5 — Combat Idle
```
[STYLE]: chibi mascot battle form, Clevai warm, thick outline, cel-shaded, magical aura
[PALETTE]: #D4691E, #F4A261, #8B4513, fire orange #FF6B35, gold armor trim #FFD700
[SUBJECT]: Sóc Clevai — Evolved combat form. Larger and fluffier chibi squirrel, wearing light magical armor of woven leaves and wood with gold trim, holding a wooden staff topped with a glowing amber crystal, tail tipped with small magical flame
[POSE - idle]: standing on hind legs, staff planted in ground diagonally, chest out, tail aflame gently flickering, warm determined smile
[ANIMATION]: 4-frame idle (tail flame flicker + tail sway)
[SIZE]: 256x256
[NEGATIVE]: no heavy metal armor, no scary expression, no demonic red eyes, no weapons looking sharp/deadly
```

#### Pose C6 — Combat Attack (cast spell)
```
[POSE - attack]: staff raised high both paws, amber crystal erupting into fire burst, tail flame enlarged, eyes glowing bright amber, body leaning forward mid-cast
[ANIMATION]: 6-frame spell cast (windup → release → recoil)
[USE]: CombatScene when Sóc-pet casts spell
```

#### Pose C7 — Combat Hurt
```
[POSE - hurt]: staff dropped to one paw, other paw clutching chest, staggered backward one step, wincing with eyes closed, tail flame shrinking
[ANIMATION]: 3-frame flinch + shake
```

#### Pose C8 — Evolution Cutscene (one-time)
```
[POSE - evolving]: standing proud, bathed in golden light pillar from above, eyes closed peacefully, particles of sparkle rising around, transforming silhouette from small Guide form to larger Combat form
[ANIMATION]: 24-frame hero transformation scene (2s at 12fps)
[USE]: One-time cutscene after tutorial completion, save to localStorage flag so never replays
[SIZE]: 512x512 for dramatic effect
```

---

## C.4 Portrait variants (for dialog UI)

Portraits are cropped to **256x256**, head + shoulders only, showing emotional expression clearly:

| Portrait ID | Emotion | Use case |
|---|---|---|
| `soc_portrait_happy` | Smiling warmly | Default, greetings |
| `soc_portrait_excited` | Eyes wide, open mouth | Quest given, big reveal |
| `soc_portrait_worried` | Eyebrows furrowed, paw on cheek | Player failing a lot |
| `soc_portrait_proud` | Smug smile, arms crossed | Player completing milestone |
| `soc_portrait_sad` | Downcast eyes, ears drooping | Game over / session end |
| `soc_portrait_thinking` | Looking up, paw on chin | Hint delivery |
| `soc_portrait_combat_fierce` | (combat form) Determined eyes, fire aura | Boss battle intro |

**Portrait prompt template:**
```
[STYLE]: chibi mascot portrait, Clevai brand, close-up head+shoulders, thick outline, cel-shaded
[PALETTE]: same as form palette
[SUBJECT]: Sóc Clevai {form} — {emotion description}
[EXPRESSION]: {specific facial details}
[FRAMING]: centered head, looking 3/4 angle, shoulders visible at bottom crop
[SIZE]: 256x256 square
[NEGATIVE]: no full body, no background, no text, no props beyond wizard hat / staff tip
```

---

## C.5 Usage Decision Tree

```
First login?
├─ Yes → Form 1 (Greet) + Tutorial sequence
└─ No →
    ├─ In WorldScene HUB? → Form 1 (Talk) waiting at HUB center
    ├─ In Combat? → Form 2 (Combat Idle) beside player
    ├─ Evolution cutscene pending? → Pose C8 one-time
    └─ Post-quiz feedback?
        ├─ Correct → Pose C3 (Cheer)
        ├─ Wrong (1st-2nd) → Pose C2 (Talk) encouraging
        └─ Wrong 3+ in a row → Pose C4 (Think) offering hint
```

---

## C.6 Animation Delivery Spec

| Pose | Frames | Size | Frame rate | Loop? |
|---|---|---|---|---|
| C1 Greet | 4 | 512×512 | 4 fps | Yes |
| C2 Talk | 2 | 256×256 | 6 fps | Yes (during speech) |
| C3 Cheer | 8 | 512×512 | 12 fps | No (one-shot) |
| C4 Think | 3 | 256×256 | 3 fps | Yes |
| C5 Combat Idle | 4 | 256×256 | 4 fps | Yes |
| C6 Combat Attack | 6 | 256×256 | 12 fps | No (one-shot) |
| C7 Combat Hurt | 3 | 256×256 | 8 fps | No (one-shot) |
| C8 Evolution | 24 | 512×512 | 12 fps | No (one-time) |
| Portraits × 7 | 1 each | 256×256 | — | Static |

**Tổng: ~80 PNG frames + 7 portraits = ~87 files cho Sóc.**
