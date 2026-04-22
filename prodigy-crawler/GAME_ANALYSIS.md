# Prodigy Math Game — Game Design Analysis (for Clevai Clone)

*Phân tích từ 7,945 wiki pages đã crawl. Mục tiêu: blueprint để xây game math-RPG cho Clevai.*

---

## 1. Core Loop (Vòng lặp chính của game)

```
  [Explore world map]
        ↓
  [Encounter monster / NPC quest]
        ↓
  [Battle bắt đầu]
        ↓
  ┌──[Turn của player]────────────────────┐
  │  1. Chọn spell (consume MP)           │
  │  2. Game hiện 1 math question         │
  │  3. Player trả lời                    │
  │     - Đúng → spell cast, deal damage  │
  │     - Sai → fumble, lose turn         │
  │  4. Trả lời đúng còn được +MP         │
  └───────────────────────────────────────┘
        ↓
  [Turn của enemy — random AI]
        ↓
  [Lặp lại cho tới khi 1 bên HP=0]
        ↓
  Win → Battle Stars (XP) + Gold + Items + chance Rescue pet
  Lose → Respawn at safe zone
        ↓
  Level up → Unlock wands/spells/areas
        ↓
  Quay lại Explore
```

**Điểm mấu chốt của thiết kế Prodigy:**
- Math ko phải là mini-game tách rời — math LÀ cơ chế combat. Trả lời đúng = mana + hit, sai = miss.
- Câu hỏi math được adapt theo grade level (1-8) trong profile học sinh → cùng 1 battle, mỗi học sinh nhận câu hỏi khác nhau.

---

## 2. Combat System (Hệ chiến đấu)

### 2.1 Lối chơi
- **Turn-based** (JRPG style), không real-time
- Team size: **up to 3 pets** (trước đây là 5)
- Wizard cũng là 1 combatant (element = Physical từ 2025, trước là Astral)

### 2.2 Stats của 1 entity (Pet/Wizard/Boss)

| Stat | Ký hiệu | Ý nghĩa |
|------|---------|---------|
| **Hearts** | HP | Máu — chết khi về 0 |
| **Power** | P | Tăng damage output |
| **Defense** | D | Giảm damage non-elemental nhận vào |
| **Order** | O | Thứ tự turn (cao = đánh trước). *Từ 2025 thay cho "Speed"* |
| **Dodge** | Dg | Xác suất né attack của địch & tỉ lệ hit |
| **MP** | MP | Magic Points — resource cast spells, hồi khi trả lời math đúng |

**Scaling**: max_stat ≈ 10 × base_stat (ví dụ Acromi: HP 221 → 2210 ở max level).

### 2.3 Elements (9 hệ) & Synergy

| Attacker → Target | Plant | Ice | Fire | Water | Storm | Astral | Shadow | Physical | Neutral |
|-------------------|-------|-----|------|-------|-------|--------|--------|----------|---------|
| **Plant**         | 1 | 🔴0.57 | 1 | 1 | 🟢1.75 | 1 | 1 | 1 | 1 |
| **Ice**           | 🟢1.75 | 1 | 🔴0.57 | 1 | 1 | 1 | 1 | 1 | 1 |
| **Fire**          | 1 | 🟢1.75 | 1 | 🔴0.57 | 1 | 1 | 1 | 1 | 1 |
| **Water**         | 1 | 1 | 🟢1.75 | 1 | 🔴0.57 | 1 | 1 | 1 | 1 |
| **Storm**         | 🔴0.57 | 1 | 1 | 🟢1.75 | 1 | 1 | 1 | 1 | 1 |
| **Astral**        | 1 | 1 | 1 | 1 | 1 | 1 | 🟡1.45 | 1 | 1 |
| **Shadow**        | 1 | 1 | 1 | 1 | 1 | 🟡1.45 | 1 | 1 | 1 |
| **Physical**      | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| **Neutral**       | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

**Mô hình synergy**:
- 5 element "vòng tròn đá-bao-kéo": Plant → Storm → Water → Fire → Ice → Plant (strong vs next, weak vs prev)
- **Astral ↔ Shadow**: đối kháng song phương, nhẹ hơn (×1.45 thay vì ×1.75)
- **Physical & Neutral**: không có synergy, luôn ×1 — dùng cho wizard baseline & common enemies

### 2.4 Damage Formula (ước lượng từ wiki)

```
raw_damage = base_damage
           × spell.power
           × (1 + attacker.Power / 100)
           × elemental_multiplier (0.57 / 1 / 1.45 / 1.75)
           × critical_multiplier (nếu crit: ~1.5-2x, theo spell.critical %)
           / (1 + target.Defense / 100)

final_damage = clamp(raw_damage, 1, 9999)

hit_chance = spell.accuracy × (1 + (attacker.Dodge - target.Dodge) / 100)
if random() > hit_chance: miss (dodge)
```

- Spells có `power` (0.5–3.5 tùy spell) và `accuracy` (0.6–1.0)
- Crit rate thường 10-90% tùy spell
- All-Out Attack: min 100 damage, không có max xác định — ultimate move

### 2.5 Turn Mechanics
- 1 action / turn: cast spell HOẶC rescue wild pet
- **Fumble**: trả lời math sai → mất turn
- **Rest**: tất cả spells đang cooldown → skip turn
- **Recharge (cooldown)**: mỗi spell có `recharge` value (số turn phải chờ)
- **Warmup**: số turn charge trước khi cast (các spell mạnh có warmup > 0)

### 2.6 Combat Modes
| Mode | Đặc điểm |
|------|----------|
| **Regular Battle** | Encounter monster, 3v3, turn-based |
| **Team Battles** (Titan Grounds) | 3 player wizards co-op đánh Titan boss; turn order dựa trên tốc độ trả lời math |
| **Wizard Dash** | Liên tiếp nhiều battle không nghỉ/heal, đến khi hết team |
| **Rift Run** (Dragon Isle) | Back-to-back battles, chọn debuff giữa mỗi stage, mỗi pet chỉ dùng 1 lần |

---

## 3. Pets & Monsters (477 unique)

### 3.1 Schema data
Từ sample pet Acromi (Storm element, Rare rarity):
```yaml
name: Acromi
element: Storm
rarity: R  # Common, Rare, Heroic, Legendary, Mythic...
type: Versatile  # hoặc Speedy / Tank / Defender
evolutions:
  from: [Browl, Hootbeak]
  to: null
locations: [Shiverchill Mountains, Skywatch, Dragon Isle, Lamplight Town]
obtainment: [Evolve, Purchase, Rescue]
stats:
  base:  { health: 221, power: 115, defense: 106, dodge: 129, order: 119 }
  max:   { health: 2210, power: 1150, defense: 1060, dodge: 1290 }
capture_cost: 160  # gold để rescue trong wild
evolution_cost: 120  # gold để evolve
moveset:  # 4 spells unlock theo level
  - { level: 1,  spell: "Weakening Talons 3" }
  - { level: 13, spell: "Owl Screech" }
  - { level: 26, spell: "Powered Moxy 3" }
  - { level: 52, spell: "Thunder Riot" }
flavor_text: "The eyes of an Acromi are so big and bright, that they are often mistaken for stars in the night."
```

### 3.2 Evolution Chain
- Pet tiến hóa theo chain, unlock ở level cố định
- VD: Browl (L1) → **L20 evolve** → Hootbeak → **L40 evolve** → Acromi
- Evolve phải trả gold → progression sink

### 3.3 Cách obtain pet
1. **Rescue** từ wild (sau khi battle defeated nó, trả capture_cost) — main method
2. **Evolve** từ pet tiền evolution
3. **Purchase** ở Pet Shop hoặc bundles/packs (Storm Power Pack 325 MC)
4. **Rewards** từ quest / event

---

## 4. Spells (857 unique)

### 4.1 Schema
```yaml
name: Acid Rain
element: Water
type: WaterMulti1  # Single / Multi (AoE) / Status / Healing
power: 2.2        # damage multiplier
accuracy: 0.8     # 80% hit base
recharge: 1       # 1 turn cooldown
warmup: 0         # cast ngay
critical: 90%     # crit chance
generation: "2023-Present"
id: 515
```

### 4.2 Categories
- **Damage**: Single-target (Plant/Single) hoặc Multi-target AoE (WaterMulti1)
- **Status**: buffs/debuffs
- **Healing**: `Absorb` rút máu địch → hồi bản thân
- **Ultimate**: All-Out Attack (min 100 dmg)

### 4.3 Learnset
- Mỗi pet có 4 spells unlock ở level 1/13/26/52
- Wizard học spell qua **wand equipped** (mỗi wand cho access vài spell)

---

## 5. Equipment System (2,539 items)

Slots (từ item category):
- **Wand** — spell access chính cho wizard
- **Hat**
- **Outfit** (robe/armor)
- **Boots**
- **Relic** — artifact accessory theo element (Ancient Fire Relic, Antique Storm Relic, etc.)
- **Amulet** — e.g. Academy Amulet (key item to warp)

Mỗi slot cho stat bonus + có thể có element affinity (VD: Fire Robe buff Fire spells).

**Tier hệ**: Academy Standard → Adamantium → Ancient → legendary
**Sets**: "Ancient Wizard Set" (Boots + Outfit + Wand) → set bonus

---

## 6. Currencies & Economy

| Currency | Tên | Dùng để |
|----------|-----|---------|
| **MC** | Magicoin (Gold) | Mua pets, items, evolve |
| **AP** | Academy Points | Academy shop exclusives |
| **HH** | Heart Honors | Bonfire Spire exclusives |
| **Crowns** | Premium currency | Real money / membership |
| **Tickets** | Event currency | Event-specific items |

**Monetization (Prodigy original)**: Membership subscription ($8.95/mo) unlocks:
- Full world access (Free chỉ được ~20% map)
- Premium outfits/wands
- Faster XP
- Exclusive pets & events

---

## 7. World Structure (Locations)

Có ~83 location articles. Các zone chính:
- **Lamplight Town** — starter hub
- **Shiverchill Mountains** — Ice zone
- **Skywatch** — Storm zone
- **Bonfire Spire** — Fire zone
- **Crystal Caverns** — Plant/Earth
- **Dragon Isle** — endgame, Rift Run
- **Academy** — unlock ở level 25, puzzle dungeon
- **Titan Grounds** — multiplayer boss arena
- **Harmony Island** — (removed) Rune Run zone

Mỗi zone có:
- Boss guardian (VD: Florian — Earth Tower, Ada — Ice Tower)
- Element theme → wild pets theo element
- Quest line tied với lore (cuộc chiến Cloaked Wizards vs Puppet Master)
- Shop riêng
- Difficulty: Normal / Hard mode

---

## 8. Progression System

### 8.1 Level-up
- **Battle Stars** từ win battles → fill XP bar → level up
- Mỗi level: +stat points cho wizard + unlock wand tier mới
- Max level ~100

### 8.2 Gating by Level
- Level 15 — unlock Academy (via Noot's Letter quest)
- Level 20/40 — pet evolution tiers
- Higher levels — endgame zones

### 8.3 Lore-driven progression
- Main story: Defeat Puppet Master (corrupted wizard controlling monsters)
- Side: 7 Cloaked Wizards (mỗi element có 1 boss wizard: Fire/Water/Earth/Ice/Storm/Astral/Shadow)
- Lore item: Warden Keystones (Bonfire Gem, Shiverchill Gem, etc.) unlock elemental dungeons

---

## 9. Math Integration — chi tiết mấu chốt cho Clevai

### 9.1 Cơ chế hiện tại của Prodigy
- Câu hỏi math pop up **mỗi khi cast spell** hoặc **enemy attack** (để "block/defend")
- Câu hỏi được pull từ **adaptive bank** theo profile:
  - Grade level của học sinh (1-8)
  - Topic teacher đã assign (giáo viên có dashboard assign homework)
  - Strength/weakness based on recent answers
- **Correct** → spell cast with full power, +MP
- **Wrong** → fumble (miss turn) HOẶC giảm power spell
- **Speed bonus** trong Team Battle/Wizard Dash: trả lời nhanh hơn → đánh trước

### 9.2 Teacher Dashboard (giáo viên)
- Assign specific topics (e.g. "Fractions for Week 3")
- Track từng student progress + weak areas
- Reports cho phụ huynh

### 9.3 **Gợi ý áp dụng cho Clevai**:
| Prodigy | Clevai clone (đề xuất) |
|---------|------------------------|
| Math grade 1-8, US Common Core | Toán lớp 1-9 Việt Nam, theo SGK + CT GDPT 2018 |
| Adaptive question bank | Dùng KB có sẵn của Clevai (DY1/DY2 items) — phân loại theo DU, XH |
| Teacher assigns homework | Tích hợp với **ULC** + **HRG** hiện có |
| Student grade profile | Dùng profile học sinh Clevai + **KEN** tracking |
| Prize wheel daily | Daily reward + streak cho gamification |

---

## 10. Social Features

- **Arena / Coliseum** — PvP battles giữa students
- **Wizard Dash** — competitive speedrun
- **Team Battles** — co-op 3-player raid Titans
- **Trading** — (không rõ có hay không, cần research thêm)
- **Friend list** + chat (filtered, kid-safe)

---

## 11. Events & Live-Ops

Từ events-rewards.md (85 articles):
- **Seasonal events**: Starlight Festival (Winter), Winter Fest, Halloween
- **Limited pets** via events
- **Daily login rewards** + Wheel of Wonder (spin for prizes)
- **Packs/Bundles**: Storm Power Pack, Fire Power Pack (premium)
- **Battle Pass style**: Academy Pages — collect để earn rewards

---

## 12. Đề xuất Tech Stack cho Clevai Clone

| Layer | Đề xuất |
|-------|---------|
| **Client** | Phaser 3 (2D JS game engine) + React UI overlay — browser-first để chạy trên Chromebook trường học |
| **Backend** | Nest.js (đã có trong AcaAutomation) + PostgreSQL + Redis |
| **Math Engine** | Reuse KB Clevai — API `/next-question?grade=X&topic=Y&student_id=Z` trả adaptive question |
| **Multiplayer** | WebSocket (Socket.io) cho Team Battle/Arena |
| **Content Pipeline** | JSON catalogs cho pets/spells/items (data-driven, ko hardcode) |
| **Analytics** | Reuse KEN tracking + custom events: `battle_start`, `question_answered`, `pet_captured` |
| **Teacher Dashboard** | Tích hợp vào **ULC** hiện có |

---

## 13. MVP Scope (Phase 1 — 3 tháng)

**Phải có**:
- [x] 1 wizard avatar (customizable minimal: 3 hats, 3 robes, 3 wands)
- [x] 3 elements (Fire, Water, Plant) — giảm complexity
- [x] 10 starter pets × 3 elements = 30 pets, có evolution chain
- [x] 20 spells cơ bản
- [x] 1 starter zone (Lamplight equivalent) + 3 wild encounter areas
- [x] Turn-based battle với 5 stats
- [x] Math integration với Clevai KB (Toán lớp 3-5)
- [x] Progression: Wizard level 1-30, pet evolve ở level 10/20
- [x] Gold economy: rescue/evolve/buy items
- [x] Save/load via Clevai student profile

**Không cần MVP**:
- Multiplayer (Phase 2)
- Academy dungeon (Phase 2)
- Events/seasonal (Phase 2)
- Membership tier (Phase 3 sau khi có product-market fit)

---

## 14. Risks & Open Questions

1. **Legal/IP**: Prodigy có trademark. Clone phải khác visual art, tên pets/spells, lore. **Chỉ sao chép cơ chế, ko copy assets.**
2. **Math bank size**: Prodigy có hàng vạn questions. Clevai đã có KB đủ chưa? Cần audit với wiki `D:\projectlocal\clevai\wiki\`.
3. **Art pipeline**: 477 pets là số lượng lớn. MVP 30 pets đã đòi commission ~30 sprite sets. Cân nhắc AI art generation pipeline.
4. **Balancing**: Prodigy đã tweak 13+ năm. Clevai cần playtesting framework + analytics.
5. **Parent/teacher UX**: Prodigy thành công nhờ school B2B. Clevai có access school channel → leverage ULC/HRG.

---

## 15. Nguồn dữ liệu

- Raw wiki data: `tools/prodigy-crawler/output/` (8 MD files, 16MB total)
- 7,945 article parsed
- Original wiki: https://prodigy-game.fandom.com
- 522 pages still pending (IP block) — ~10% coverage gap, chủ yếu là rare items

---

## Next Steps (đề xuất cho anh)

1. **Anh review & feedback** tài liệu này — điều chỉnh scope/đề xuất
2. **Em viết Technical Design Doc (TDD)** cho MVP: data schema (PostgreSQL tables for pets/spells/items/players), API contracts, battle state machine
3. **Em prototype 1 battle loop** — HTML/JS proof of concept với 2 pets đánh nhau + 1 math question
4. **Tích hợp Clevai KB** để lấy math question từ DU/XH thật
5. **Iterate**: anh chơi, em refine

Anh muốn em bắt đầu từ bước nào ạ?
