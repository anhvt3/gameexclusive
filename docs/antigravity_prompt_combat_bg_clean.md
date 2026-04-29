# Antigravity Prompt — Re-export combat_forest BG (xóa NPC trong nền)

> Paste vào Antigravity session mới. Đây là asset fix cho 1 file duy nhất.

---

```
# NHIỆM VỤ — Re-paint combat_forest_1280x720.png CLEAN (không có NPC trong nền)

File hiện tại: app/public/assets/backgrounds/combat_forest_1280x720.png

## Vấn đề
File hiện đang vẽ 5 nhân vật wizard/student đứng giữa rừng. Khi engine
render combat scene, sprite player được layered lên trên BG này → user
nhìn thấy 6 nhân vật cùng lúc (1 player thật + 5 NPC vẽ trong BG).
Confused, layout trông như có "đám đông" thay vì duel 1v1.

User feedback: "tại sao lại có 5 nhân vật người?"

## Yêu cầu
Re-paint cùng cảnh forest sunset HIỆN TẠI nhưng:
- ❌ XOÁ tất cả nhân vật người (5 wizard student trong BG)
- ✅ Giữ nguyên: cây thông, cây bụi, ánh hoàng hôn xuyên qua, đường
  mòn ở giữa, tone màu warm gold-orange-green
- ✅ Giữ nguyên kích thước 1280×720 (hoặc upscale 1024×1024 nhưng
  preserve aspect 16:9 khi crop về 1280×720)
- ✅ Format: PNG-32 RGBA hoặc PNG-24 (BG opaque OK, không cần alpha)
- ✅ Style anchor: Phase 1 chibi RPG cel-shaded, palette
  #D4691E/#F4A261/#8B4513

## Composition gợi ý
- Foreground: vài bụi cỏ + hoa wildflower rải rác viền dưới
- Mid-ground: clearing rộng (đất nâu nhạt) — khu vực battle chính,
  PHẢI để trống không có nhân vật / vật thể to
- Background: hàng cây thông xa, tia nắng xuyên qua tán
- Sky: hoàng hôn vàng cam dịu, vài đám mây mỏng

## Reference
File cũ (có NPC) → so sánh để biết phải xoá phần nào:
`app/public/assets/backgrounds/combat_forest_1280x720.png` (current)

## Output
Replace IN-PLACE: `app/public/assets/backgrounds/combat_forest_1280x720.png`
Optional: cũng update `combat_forest.png` (variant cùng tên) nếu file
là duplicate.

## Verify command (Claude sẽ chạy sau khi nhận file)

```bash
cd app/public/assets/backgrounds
file combat_forest_1280x720.png  # phải là PNG, không JPEG
```

## Output report
1. Trước/sau screenshot
2. File size (binary diff)
3. Note nếu cần update các BG khác cùng style (đề phòng các BG khác
   cũng có NPC trong nền — vd biome variants Phase 2)

## RÀNG BUỘC
- ❌ KHÔNG đổi resolution / aspect ratio
- ❌ KHÔNG đổi style (phải match Phase 1 anchor)
- ❌ KHÔNG vẽ thêm character (sprite player + monster sẽ được engine
  layer lên — BG phải trống ở mid-ground)
- ✅ Có thể giữ animal nhỏ / butterfly / leaves (decoration không phải
  nhân vật người)

## START
Xác nhận đã đọc, gửi version mới. Một file thôi.
```

---

## Notes Claude
- Đây là blocker visual nhưng KHÔNG block playability — game vẫn chơi
  được, chỉ là combat scene trông "đông đúc" hơn dự kiến.
- Có thể defer tới khi Antigravity rảnh — không urgent.
- Nếu Antigravity không support, em có thể tự làm bằng image-edit
  Python (xóa region NPC bằng inpainting hoặc paint over). Để anh
  quyết.
