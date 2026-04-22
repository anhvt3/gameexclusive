# APPENDIX D — Mock JSON Samples (Phase 1)

> Companion to `architecturepack_Game_SS3_exclusive_v1.0_22042026.md` Section 5.
> Schema đồng nhất 100% với Supham response để Phase 3 switch sang live API không cần refactor.

---

## D.1 File Layout

```
app/src/data/mocks/
├── learningObjects/
│   ├── multiple_choice_math_g5.json        (quiz_type_id = 3)
│   ├── multiple_choice_ken_g8.json         (quiz_type_id = 3)
│   ├── cloze_ken_g4.json                   (quiz_type_id = 1)
│   ├── cloze_math_g7.json                  (quiz_type_id = 1)
│   ├── dragdrop_ken_g6.json                (quiz_type_id = 8)
│   └── dragdrop_math_g3.json               (quiz_type_id = 8)
├── quizTypes.json                          (11 types registry)
└── monsterRoster.json                      (20 quái, theo Appendix A)
```

---

## D.2 Quiz Type Registry (`quizTypes.json`)

```json
[
  { "id": 1, "quiz_type_name": "Điền từ (Cloze with text)", "has_answer": true, "has_possible_options": false, "has_inline_components": true, "has_ordering": false, "phase_supported": 1 },
  { "id": 2, "quiz_type_name": "Sắp xếp (Order list)", "has_answer": true, "has_possible_options": true, "has_inline_components": false, "has_ordering": true, "phase_supported": 2 },
  { "id": 3, "quiz_type_name": "Trắc nghiệm (Multiple choices)", "has_answer": true, "has_possible_options": true, "has_inline_components": false, "has_ordering": false, "phase_supported": 1 },
  { "id": 4, "quiz_type_name": "Kéo thả (Cloze with drag and drop)", "has_answer": true, "has_possible_options": true, "has_inline_components": true, "has_ordering": false, "phase_supported": 2 },
  { "id": 5, "quiz_type_name": "Tự luận", "has_answer": false, "has_possible_options": false, "has_inline_components": false, "has_ordering": false, "phase_supported": 3 },
  { "id": 6, "quiz_type_name": "Phát âm (speak)", "has_answer": true, "has_possible_options": false, "has_inline_components": true, "has_ordering": false, "phase_supported": 4 },
  { "id": 7, "quiz_type_name": "Điền đáp án đúng (IF)", "has_answer": true, "has_possible_options": true, "has_inline_components": false, "has_ordering": false, "phase_supported": 2 },
  { "id": 8, "quiz_type_name": "Kéo thả (DD)", "has_answer": true, "has_possible_options": true, "has_inline_components": false, "has_ordering": false, "phase_supported": 1 },
  { "id": 9, "quiz_type_name": "Visual choice (VC)", "has_answer": true, "has_possible_options": true, "has_inline_components": false, "has_ordering": false, "phase_supported": 2 },
  { "id": 10, "quiz_type_name": "AITutor Speak", "has_answer": false, "has_possible_options": false, "has_inline_components": false, "has_ordering": false, "phase_supported": 5 },
  { "id": 11, "quiz_type_name": "AITutor H247", "has_answer": false, "has_possible_options": false, "has_inline_components": false, "has_ordering": false, "phase_supported": 5 }
]
```

---

## D.3 Multiple Choice Sample (quiz_type_id = 3)

### `multiple_choice_math_g5.json`

```json
{
  "total": 3,
  "list": [
    {
      "id": 100001,
      "learning_object_code": "MATH_G5_FRAC_ADD_01",
      "learning_object_name": "Cộng hai phân số khác mẫu số — Ví dụ 1",
      "short_name": "Cộng phân số khác mẫu",
      "grade_name": "G5",
      "subject_name": "Math",
      "learning_object_level": { "id": 4, "learning_object_level_code": "LO_4", "learning_object_level_name": "Learning object level 4" },
      "learning_object_difficulty": { "id": null, "learning_object_difficulty_code": null, "learning_object_difficulty_name": "2" },
      "quiz_type_id": 3,
      "quiz_example": "",
      "quiz_explanation_example": "Quy đồng mẫu số rồi cộng tử số.",
      "question_text": "Kết quả của 1/2 + 1/4 = ?",
      "options": [
        { "id": "a", "text": "1/6" },
        { "id": "b", "text": "3/4" },
        { "id": "c", "text": "2/6" },
        { "id": "d", "text": "1/8" }
      ],
      "correct_option_id": "b",
      "explanation": "1/2 = 2/4, nên 2/4 + 1/4 = 3/4",
      "time_limit_sec": 60,
      "min_time_sec": 3
    },
    {
      "id": 100002,
      "learning_object_code": "MATH_G5_FRAC_ADD_02",
      "learning_object_name": "Cộng hai phân số khác mẫu số — Ví dụ 2",
      "short_name": "Cộng phân số khác mẫu",
      "grade_name": "G5",
      "subject_name": "Math",
      "learning_object_level": { "id": 4, "learning_object_level_code": "LO_4", "learning_object_level_name": "Learning object level 4" },
      "learning_object_difficulty": { "id": null, "learning_object_difficulty_code": null, "learning_object_difficulty_name": "3" },
      "quiz_type_id": 3,
      "question_text": "2/3 + 1/6 = ?",
      "options": [
        { "id": "a", "text": "3/9" },
        { "id": "b", "text": "5/6" },
        { "id": "c", "text": "3/6" },
        { "id": "d", "text": "1/2" }
      ],
      "correct_option_id": "b",
      "explanation": "2/3 = 4/6, nên 4/6 + 1/6 = 5/6",
      "time_limit_sec": 60,
      "min_time_sec": 3
    },
    {
      "id": 100003,
      "learning_object_code": "MATH_G5_GEO_AREA_PARALLELOGRAM",
      "learning_object_name": "Diện tích hình bình hành",
      "short_name": "Diện tích HBH",
      "grade_name": "G5",
      "subject_name": "Math",
      "learning_object_difficulty": { "learning_object_difficulty_name": "3" },
      "quiz_type_id": 3,
      "question_text": "Hình bình hành có đáy 8 cm và chiều cao 5 cm. Diện tích bằng?",
      "options": [
        { "id": "a", "text": "13 cm²" },
        { "id": "b", "text": "40 cm²" },
        { "id": "c", "text": "26 cm²" },
        { "id": "d", "text": "20 cm²" }
      ],
      "correct_option_id": "b",
      "explanation": "S = đáy × chiều cao = 8 × 5 = 40 cm²",
      "time_limit_sec": 90,
      "min_time_sec": 5
    }
  ]
}
```

### `multiple_choice_ken_g8.json` (English KEN sample)

```json
{
  "total": 2,
  "list": [
    {
      "id": 200001,
      "learning_object_code": "L4E_1833_GRAM_TENSE_01",
      "learning_object_name": "Thì hiện tại đơn — Trắc nghiệm",
      "grade_name": "G8",
      "subject_name": "KEN",
      "learning_object_difficulty": { "learning_object_difficulty_name": "2" },
      "quiz_type_id": 3,
      "question_text": "Choose the correct form: She ___ to school every day.",
      "options": [
        { "id": "a", "text": "go" },
        { "id": "b", "text": "goes" },
        { "id": "c", "text": "going" },
        { "id": "d", "text": "gone" }
      ],
      "correct_option_id": "b",
      "explanation": "Chủ ngữ She (third person singular) → động từ thêm -s/-es",
      "time_limit_sec": 45,
      "min_time_sec": 2
    }
  ]
}
```

---

## D.4 Cloze Sample (quiz_type_id = 1)

### `cloze_ken_g4.json`

```json
{
  "total": 2,
  "list": [
    {
      "id": 300001,
      "learning_object_code": "L4E_1832_CLOZE_PRESENT_01",
      "learning_object_name": "Điền từ — Thì hiện tại đơn",
      "grade_name": "G4",
      "subject_name": "KEN",
      "learning_object_difficulty": { "learning_object_difficulty_name": "2" },
      "quiz_type_id": 1,
      "question_text": "She ___(1)___ to school every day and ___(2)___ her homework at 5pm.",
      "blanks": [
        {
          "id": 1,
          "correct_answer": "goes",
          "alternatives": ["goes", "Goes"],
          "hint": "verb — present simple, 3rd person singular"
        },
        {
          "id": 2,
          "correct_answer": "does",
          "alternatives": ["does", "Does"],
          "hint": "verb — present simple, 3rd person singular"
        }
      ],
      "case_sensitive": false,
      "time_limit_sec": 60,
      "min_time_sec": 5
    },
    {
      "id": 300002,
      "learning_object_code": "L4E_1832_CLOZE_NOUN_01",
      "learning_object_name": "Điền từ — Danh từ",
      "grade_name": "G4",
      "subject_name": "KEN",
      "learning_object_difficulty": { "learning_object_difficulty_name": "1" },
      "quiz_type_id": 1,
      "question_text": "I have two ___(1)___ and one ___(2)___.",
      "blanks": [
        { "id": 1, "correct_answer": "cats", "alternatives": ["cats"], "hint": "noun plural" },
        { "id": 2, "correct_answer": "dog", "alternatives": ["dog"], "hint": "noun singular" }
      ],
      "case_sensitive": false,
      "time_limit_sec": 45,
      "min_time_sec": 4
    }
  ]
}
```

### `cloze_math_g7.json`

```json
{
  "total": 1,
  "list": [
    {
      "id": 310001,
      "learning_object_code": "MATH_G7_EQUATION_LINEAR_01",
      "learning_object_name": "Giải phương trình bậc nhất",
      "grade_name": "G7",
      "subject_name": "Math",
      "learning_object_difficulty": { "learning_object_difficulty_name": "3" },
      "quiz_type_id": 1,
      "question_text": "Giải: 2x + 5 = 13 → x = ___(1)___",
      "blanks": [
        { "id": 1, "correct_answer": "4", "alternatives": ["4", "4.0", "+4"], "hint": "số nguyên" }
      ],
      "case_sensitive": false,
      "time_limit_sec": 90,
      "min_time_sec": 8
    }
  ]
}
```

---

## D.5 Drag & Drop Sample (quiz_type_id = 8)

### `dragdrop_ken_g6.json`

```json
{
  "total": 1,
  "list": [
    {
      "id": 400001,
      "learning_object_code": "L4E_1833_DD_POS_01",
      "learning_object_name": "Phân loại danh từ và động từ",
      "grade_name": "G6",
      "subject_name": "KEN",
      "learning_object_difficulty": { "learning_object_difficulty_name": "2" },
      "quiz_type_id": 8,
      "question_text": "Kéo các từ sau vào ô phù hợp:",
      "drop_zones": [
        { "id": "nouns", "label": "Danh từ (Noun)", "capacity": 3, "correct_items": ["apple", "book", "tree"] },
        { "id": "verbs", "label": "Động từ (Verb)", "capacity": 2, "correct_items": ["run", "jump"] }
      ],
      "draggable_items": [
        { "id": "run", "text": "run" },
        { "id": "apple", "text": "apple" },
        { "id": "jump", "text": "jump" },
        { "id": "book", "text": "book" },
        { "id": "tree", "text": "tree" }
      ],
      "time_limit_sec": 90,
      "min_time_sec": 10
    }
  ]
}
```

### `dragdrop_math_g3.json`

```json
{
  "total": 1,
  "list": [
    {
      "id": 410001,
      "learning_object_code": "MATH_G3_SORT_ODD_EVEN",
      "learning_object_name": "Phân loại số chẵn lẻ",
      "grade_name": "G3",
      "subject_name": "Math",
      "learning_object_difficulty": { "learning_object_difficulty_name": "1" },
      "quiz_type_id": 8,
      "question_text": "Kéo các số vào nhóm đúng:",
      "drop_zones": [
        { "id": "even", "label": "Số chẵn", "capacity": 3, "correct_items": ["2", "4", "8"] },
        { "id": "odd", "label": "Số lẻ", "capacity": 3, "correct_items": ["1", "5", "7"] }
      ],
      "draggable_items": [
        { "id": "1", "text": "1" },
        { "id": "2", "text": "2" },
        { "id": "4", "text": "4" },
        { "id": "5", "text": "5" },
        { "id": "7", "text": "7" },
        { "id": "8", "text": "8" }
      ],
      "time_limit_sec": 60,
      "min_time_sec": 6
    }
  ]
}
```

---

## D.6 Event Payload Sample

### `QuizAnsweredEvent` (emitted from client)

```json
{
  "event_id": "evt_01HQWXYZ123",
  "event_type": "QUIZ_ANSWERED",
  "occurred_at": "2026-04-22T10:34:12.458Z",
  "student_id": 987654,
  "lo_id": 100001,
  "quiz_type_id": 3,
  "monster_id": 1,
  "is_correct": true,
  "time_spent_ms": 7520,
  "attempts": 1,
  "anti_cheat_flags": [],
  "client_session_id": "sess_abcdef",
  "client_seq_number": 42
}
```

### Batch Sync Request

```http
POST /api/game-progress/batch
Content-Type: application/json
Authorization: Bearer {jwt}
Idempotency-Key: sess_abcdef:batch_7

{
  "student_id": 987654,
  "events": [ /* array of QuizAnsweredEvent */ ],
  "combat_events": [ /* array of CombatEvent */ ]
}
```

### Response (success)

```json
{
  "synced_event_ids": ["evt_01HQWXYZ123", "evt_01HQWXYZ124"],
  "conflicts": [],
  "next_recommended_los": [100004, 100005]
}
```

---

## D.7 Validation Schema (Zod — áp dụng runtime)

```ts
import { z } from 'zod';

export const LearningObjectSchema = z.object({
  id: z.number(),
  learning_object_code: z.string(),
  learning_object_name: z.string(),
  grade_name: z.enum(['G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12']),
  subject_name: z.string(),
  quiz_type_id: z.number().min(1).max(11),
  learning_object_difficulty: z.object({
    learning_object_difficulty_name: z.enum(['1','2','3','4','5'])
  }),
  time_limit_sec: z.number().optional(),
  min_time_sec: z.number().optional(),
  // polymorphic fields
  question_text: z.string().optional(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correct_option_id: z.string().optional(),
  blanks: z.array(z.object({ id: z.number(), correct_answer: z.string() })).optional(),
  drop_zones: z.array(z.any()).optional(),
  draggable_items: z.array(z.any()).optional(),
});
```

Validate mỗi response từ Supham trước khi đưa vào QuizFactory → fail-fast nếu schema lệch.
