# Game_SS3_exclusive — Claude Agent Instructions

## Project context

Dự án Game Giáo Dục thế hệ 3 của Clevai — RPG lấy cảm hứng từ Prodigy cho học sinh 5-18 tuổi (internal, không bán thương mại). Kiến trúc Hybrid **React + Phaser 3**.

**Users:** Active students hiện tại của Clevai (captive audience). Không phải sản phẩm commercial.

## Source of truth documents (đọc TRƯỚC khi làm bất cứ việc gì)

- **Architecture Pack:** `docs/architecturepack_Game_SS3_exclusive_v1.0_22042026.md`
- **Incremental Step Plan:** `docs/IncrementalStepPlan-Game_SS3_exclusive.md`
- **Appendices:** `docs/appendix_{A,B,C,D,E}_*.md`
- **Harness Checklist:** `docs/harness_checklist_Game_SS3_exclusive.md`

## Workflow (quy trình 9 bước)

Tham chiếu `~/.claude/projects/D--projectlocal-clevai-Game-exclusive/memory/workflow_sdlc.md`.

Mọi bug/feature phát hiện ở UAT (bước 5/7/8) ĐỀU quay về **bước 2 (AP update)** trước khi sửa code. AP là single source of truth.

## Harness Engineering Principles

Tuân thủ 5 nguyên tắc sau mỗi khi code / review / merge:

1. **Rule trong md = yếu. Rule trong code = mạnh.**
   Luôn hỏi: "Rule này có thể enforce bằng code không?"
   - Layer boundary (AP 3.1) → ESLint `boundaries/element-types`
   - EventBus on/off pair (AP 7.4) → API trả cleanup function (`src/bus/EventBus.ts`)
   - Clevai term no-hallucination → `scripts/verify.ts` grep-based gate
   - AP doc size ≤ 20kb → `scripts/verify.ts`
   - Task A/B/C approval → `.github/workflows/ci.yml` label check

2. **Không claim "done" khi verify chưa pass.**
   Chạy `npm run verify` + `npm run test:run` + `npm run lint` + `npm run typecheck` trước khi report back.

3. **Mọi run log vào `app/runs.jsonl`** qua `verify.ts` hoặc `log-run.ts`.

4. **Tool output phải có `--json` mode** cho machine consumption khi LLM gọi thường xuyên.

5. **Workflow lặp >2 lần → đóng gói thành skill.**

## Task Classification (A/B/C)

Xem `docs/appendix_E_task_classification_examples.md`.
- **Type A** → dev tự merge
- **Type B** → POSUP duyệt AP delta (Entity Schema thay đổi)
- **Type C** → POSUP + ARCH duyệt AP delta (Event Layer / CalculateKR / ExtractEvent)
- Khi không chắc → escalate lên cấp cao hơn (A→B→C)

CI label gate tự động enforce: PR phải có label `type-A`, `type-B`, hoặc `type-C`.

## Khi gặp khái niệm / mã PT / viết tắt Clevai

**TUYỆT ĐỐI KHÔNG BỊA (No Hallucination).** Tra theo thứ tự:

1. **Ưu tiên 1** — MemPalace MCP (`mempalace_search`) nếu có access
2. **Ưu tiên 2** — `D:/projectlocal/clevai/wiki/entities/` và `D:/projectlocal/clevai/wiki/chunks/`

Báo cáo "Tôi đã tìm thấy định nghĩa như sau..." trước khi viết code liên quan logic vận hành.

`scripts/verify.ts` sẽ fail nếu code dùng Clevai term (KEN/KMA/DY1/HRG/USI/CUIE/L4E...) mà không có reference `// wiki: path/to/entity.md` trong ±3 dòng gần đó.

## Tech Stack (per `docs/---Clevai_Tech_Stack_Prefer-v1.md`)

- Runtime: React 19, Phaser 3.90, Zustand 5, mitt 3, Zod 4, react-router-dom 7
- Tooling: Vite 8, TypeScript 5.6, Vitest 4, Playwright 1.59
- Lint: ESLint 9 flat config + boundaries plugin + prettier
- Styles: Tailwind CSS 3

## Folder structure (AP Section 3.1)

```
app/src/
├── react/        # Layer 1 Presentation — KHÔNG import Phaser
├── game/         # Layer 2 Engine — KHÔNG import React
├── bus/          # Layer 3 Event Bus — type-safe mitt
├── domain/       # Layer 4 Business rules — pure TS
├── data/         # Layer 5 Data Access — chỉ nơi fetch()
├── persistence/  # Layer 6 Zustand + localStorage + IndexedDB
├── events/       # Event Layer append-only
├── types/        # Shared TS types
└── utils/        # Pure helpers
```

## Memory

Memory files tại `~/.claude/projects/D--projectlocal-clevai-Game-exclusive/memory/`.
Đọc `MEMORY.md` để biết index.

## Current Status (2026-04-22)

**Bước 2+3 của SDLC (AP + ISP đã xong), harness Sprint 1 đang setup.**
Tiếp theo: update AP v1.1 + ISP v1.1 với CEO review decisions, rồi mới sang bước 4 (build).
