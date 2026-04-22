# APPENDIX E — Task Classification Examples (A / B / C)

> Companion to `architecturepack_Game_SS3_exclusive_v1.0_22042026.md` Section 3.2.
> 15 ví dụ cụ thể để dev team tự phân loại task mới, biết cần ai duyệt.

---

## E.1 Quick Reference

| Loại | Tiêu chí | Duyệt | Typical LOC |
|---|---|---|---|
| **A** | UI/API client / không đổi Entity Schema, không đụng Event Layer | Dev tự merge sau code review | < 500 |
| **B** | Sửa Entity Schema, KHÔNG read/write Event hoặc CalculateKR | POSUP duyệt AP delta trước code | 100-2000 |
| **C** | Đụng Event Layer / EventDetails / CalculateKR / ExtractEvent | POSUP + ARCH duyệt AP delta trước code | bất kỳ |

---

## E.2 — 15 Examples

### Task #1: Đổi màu HP bar từ đỏ sang cam theo brand
**Loại: A**
- Chỉ sửa CSS/Tailwind class trong `src/react/hud/HpBar.tsx`
- Không đổi schema, không đụng event
→ Dev tự merge.

---

### Task #2: Thêm animation "spell cast" mới cho skill Fire Blast
**Loại: A**
- Thêm sprite sheet mới `public/assets/sprites/spells/fire_blast_v2.png`
- Sửa `src/game/systems/SpellSystem.ts` load asset mới
- Không đổi `Spell` entity, không đụng event
→ Dev merge.

---

### Task #3: Thêm tilemap mới cho biome "Sa mạc"
**Loại: A**
- Tạo `public/assets/tilemaps/desert.json` từ Tiled
- Đăng ký trong `biomeMapping.ts`
- Không thêm entity mới (dùng `Monster.biome` string)
→ Dev merge.

---

### Task #4: Đổi copy tutorial text của Sóc Clevai
**Loại: A**
- Sửa i18n file `locales/vi/tutorial.json`
- Không đụng logic
→ Dev merge.

---

### Task #5: Cải thiện QuizFactory load dynamic theo mountpoint
**Loại: A**
- Refactor `src/react/quiz/QuizFactory.ts` dùng React.lazy
- Không đổi interface QuizRenderer
- Không đổi schema Event
→ Dev merge.

---

### Task #6: Thêm field `Monster.rarity` ("common" | "rare" | "legendary")
**Loại: B**
- Đổi schema `Monster` entity
- Không read/write Event hoặc CalculateKR
- Cần migration file config `monsters.ts`
→ **POSUP duyệt AP delta** trước khi code. AP v1.1 cần update section 1.2.

---

### Task #7: Thêm bảng `Achievement` (entity mới) ghi thành tựu của student
**Loại: B** (nếu Achievement ghi độc lập, không cross event stream)
- Thêm entity `Achievement { id, student_id, code, unlocked_at }`
- Không đụng QuizAnsweredEvent / CombatEvent
- Tuy nhiên TRIGGER achievement có thể listen event → nếu listen mà không write ngược → vẫn loại B

**Nếu Achievement TRIGGER ghi vào CalculateKR** (VD: aggregate unlock count) → **loại C**.

→ POSUP duyệt.

---

### Task #8: Thêm cột `SaveState.last_biome_id` track biome đã mở khóa
**Loại: B**
- Đổi schema `SaveState` entity, thêm column
- Migration persist layer
- Không đụng Event layer
→ POSUP duyệt.

---

### Task #9: Đổi formula element damage từ rock-paper-scissors 8-way sang 6-way
**Loại: B** (nếu chỉ đổi `ElementSystem.ts` matrix — logic)
- Pure logic change, không đổi schema, không đụng event
- **Thực tế là A** nếu ELEMENT_MATRIX là static config — review kỹ

**Borderline case**: nếu có `Element` entity trong DB và mình đổi schema matrix table → **B**.

→ Mặc định A, escalate B nếu chạm DB entity.

---

### Task #10: Thêm field `QuizAnsweredEvent.hint_used: boolean`
**Loại: C** ⚠️
- Đổi shape của Event trong Layer Event
- Ảnh hưởng EventDetails (cần migration stream + backward compat)
- Ảnh hưởng CalculateKR (aggregate có cần count hint_used không?)
→ **POSUP + ARCH duyệt** trước code. AP delta section 5.3 + section 3.1 (event schema).

---

### Task #11: Viết aggregator mới `DailyAccuracyRate` cho game_progress
**Loại: C** ⚠️
- Thêm logic ExtractEvent đọc từ QuizAnsweredEvent stream
- Ghi vào CalculateKR output (`game_daily_accuracy` table)
→ POSUP + ARCH duyệt.

---

### Task #12: Thêm endpoint `GET /api/parent/weekly-report/{student_id}`
**Loại: C** ⚠️
- Endpoint này đọc từ ExtractEvent layer (parent reporting)
- Expose data ra scope mới (phụ huynh)
- Impact: data privacy review, aggregation correctness
→ POSUP + ARCH + **Security review** (privacy COPPA).

---

### Task #13: Thêm `CombatEvent.xp_multiplier_reason` để track source XP (first_try, critical, event_bonus)
**Loại: C** ⚠️
- Đổi shape CombatEvent (Layer Event)
- Ảnh hưởng xp aggregator trong CalculateKR
→ POSUP + ARCH duyệt.

---

### Task #14: Thêm anti-cheat signal "copy_keystroke_detected" vào QuizAnsweredEvent.anti_cheat_flags
**Loại: C** ⚠️ (borderline)
- Field `anti_cheat_flags` đã là `string[]`, không đổi schema
- **NHƯNG** thêm logic detection + semantic flag mới → vẫn ảnh hưởng downstream aggregation (flag ratio có tính vào rủi ro không?)

**Decision rule:** 
- Nếu **CHỈ** thêm string trong enum client-side, downstream không xử lý → **A**
- Nếu downstream CalculateKR có business logic đọc flag đó → **C**

→ Khi không chắc: default ESCALATE lên C (an toàn hơn).

---

### Task #15: Thêm offline mode queue events vào IndexedDB
**Loại: B** (borderline C)
- Tạo entity mới `EventQueueRecord` trong IndexedDB (client-side storage)
- Không đổi shape của Event types
- Không đổi server aggregator

**Decision:** Nếu chỉ storage client, không đổi event contract → **B**.
Nếu offline queue có re-ordering / deduplication logic ảnh hưởng thứ tự events gửi lên → **C** (vì impact idempotency của CalculateKR).

→ Default **B**, upgrade C khi thấy impact server-side ordering.

---

## E.3 Decision Flowchart

```
[New Task] 
    │
    ▼
 Đụng Event Layer / EventDetails / CalculateKR / ExtractEvent?
    │
    ├── YES ──→ LOẠI C ──→ POSUP + ARCH duyệt AP delta
    │
    └── NO ──→ Đổi Entity Schema / DB migration?
                │
                ├── YES ──→ LOẠI B ──→ POSUP duyệt AP delta
                │
                └── NO ──→ LOẠI A ──→ Dev merge
```

---

## E.4 Rule of Thumb — Khi không chắc

1. **Có migration DB không?** → B hoặc C
2. **Có đổi shape event JSON không?** → C
3. **Có aggregate mới / report mới không?** → C
4. **Có expose data ra scope mới (parent/teacher)?** → C + Security review
5. **Chỉ code TypeScript client-side, không DB, không event?** → A

**Khi không chắc: luôn escalate lên cấp cao hơn (A→B→C).** Tốt hơn duyệt thừa còn hơn merge xong phát hiện vỡ aggregation.

---

## E.5 AP Delta Template (khi task loại B/C)

Khi submit task B/C, PR description phải kèm AP delta:

```markdown
## AP Delta — Task #{id}: {title}

**Classification:** B / C
**AP Section(s) Affected:** {1.2 / 3.1 / 5.3 ...}

### Before
- {trạng thái entity/event hiện tại}

### After
- {trạng thái entity/event sau task}

### Migration
- {data migration steps nếu có}

### Backward Compat
- {plan xử lý event cũ / data cũ}

### Approval
- [ ] POSUP approved by: ____ at ____
- [ ] ARCH approved by: ____ at ____ (nếu loại C)
```
