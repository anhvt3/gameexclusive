<!--
  Game_SS3_exclusive — Pull Request Template
  Theo Architecture Pack v1.x Section 3.2 Task Classification.
-->

## Summary
<!-- 1-3 câu: task này làm gì, tại sao -->

## Task Classification (bắt buộc chọn 1)

> Xem `docs/appendix_E_task_classification_examples.md` nếu chưa rõ.

- [ ] **Type A** — Chỉ sửa UI / API client / không đổi Entity Schema, không đụng Event Layer
- [ ] **Type B** — Đổi Entity Schema, KHÔNG read/write Event hoặc CalculateKR (cần POSUP duyệt AP delta)
- [ ] **Type C** — Đụng Event Layer / EventDetails / CalculateKR / ExtractEvent (cần POSUP + ARCH duyệt AP delta)

**→ PR phải có label `type-A`, `type-B`, hoặc `type-C`. CI sẽ enforce.**

## AP Delta (chỉ cần cho Type B/C)

### Before
<!-- trạng thái entity/event hiện tại -->

### After
<!-- trạng thái entity/event sau task -->

### Migration
<!-- steps nếu có -->

### Backward Compat
<!-- plan xử lý data cũ -->

### Approvals
- [ ] POSUP approved by: _____ at _____
- [ ] ARCH approved by: _____ at _____ (nếu Type C)

## Harness Checks

- [ ] `npm run lint` zero errors
- [ ] `npm run typecheck` zero errors
- [ ] `npm run test:run` all pass
- [ ] `npm run verify` exit 0
- [ ] Added/updated tests for new code
- [ ] Coverage không giảm

## Test Plan
<!-- bullet markdown cho testing -->
- [ ] 
- [ ] 

## Related
- AP section: 
- ISP step: 
- TODO: 
