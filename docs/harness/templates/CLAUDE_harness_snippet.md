<!-- Append this section into Game_exclusive/CLAUDE.md -->

## Harness Engineering Principles — Game_SS3_exclusive

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

3. **Mọi run phải log vào `app/runs.jsonl`.**
   Dùng `npm run log-run -- <type> <status> [duration_ms]` hoặc chạy tự động qua `verify.ts`.

4. **Tool output phải có `--json` mode cho machine consumption.**
   Script LLM gọi thường xuyên phải có schema ổn định, không phải log string.

5. **Workflow lặp >2 lần → đóng gói thành skill.**
   Ví dụ: "execute ISP step N" sẽ thành skill sau khi chạy qua 2-3 step.

## Reference Documents

Khi làm bất cứ task nào liên quan game:
- **Architecture Pack:** `Game_exclusive/docs/architecturepack_Game_SS3_exclusive_v1.x_*.md`
- **Incremental Step Plan:** `Game_exclusive/docs/IncrementalStepPlan-Game_SS3_exclusive.md`
- **Appendices:** `Game_exclusive/docs/appendix_{A,B,C,D,E}_*.md`
- **Harness Checklist:** `Game_exclusive/docs/harness_checklist_Game_SS3_exclusive.md`
- **Memory (this project):** `~/.claude/projects/D--projectlocal-clevai-Game-exclusive/memory/`

## Task Workflow (quy trình 9 bước)

Xem `~/.claude/projects/D--projectlocal-clevai-Game-exclusive/memory/workflow_sdlc.md`.
Mọi bug/feature phát hiện ở bước 5/7/8 ĐỀU quay về **bước 2 (AP update)** trước khi sửa code.

## Task Type A/B/C

Xem `Game_exclusive/docs/appendix_E_task_classification_examples.md`.
- Type A → dev tự merge
- Type B → POSUP duyệt AP delta
- Type C → POSUP + ARCH duyệt AP delta
- Khi không chắc → escalate lên cấp cao hơn (A→B→C)

## Khi gặp khái niệm / mã PT / viết tắt Clevai

**TUYỆT ĐỐI KHÔNG BỊA.** Tra theo thứ tự:
1. MemPalace MCP (nếu có)
2. `D:/projectlocal/clevai/wiki/entities/` và `D:/projectlocal/clevai/wiki/chunks/`

Báo cáo "Tôi đã tìm thấy định nghĩa như sau..." trước khi viết code liên quan logic vận hành.

`scripts/verify.ts` sẽ fail nếu code dùng Clevai term mà không có reference `// wiki: path/to/entity.md` trong ±3 dòng gần đó.
