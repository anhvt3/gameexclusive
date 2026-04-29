# Yêu cầu tải và cấu trúc Sound Effects & BGM cho Game_SS3_exclusive

@Claude, hãy thực hiện nhiệm vụ tìm kiếm, tải về và tổ chức các file âm thanh (SFX & BGM) cho dự án Game_SS3_exclusive theo cấu trúc dưới đây.

## 1. Yêu cầu chung
- **Định dạng:** Ưu tiên `.ogg` hoặc `.m4a` để tối ưu cho web (Phaser 3). Nếu là `.wav` hay `.mp3`, hãy sử dụng `ffmpeg` hoặc công cụ để convert sang `.ogg`.
- **Dung lượng:** SFX nhỏ hơn 500KB/file. BGM nhỏ hơn 2MB/file (cần đảm bảo loop mượt).
- **Thư mục lưu trữ đích:**
  - SFX: `app/public/assets/audio/sfx/`
  - BGM: `app/public/assets/audio/bgm/`
- **Nguồn tìm kiếm gợi ý:** Kenney.nl (cực kỳ ưu tiên vì style phù hợp với UI game giáo dục), OpenGameArt.org, Freesound.org (Creative Commons 0).

## 2. Quy tắc đặt tên (Naming Convention)
- Định dạng: `[category]_[action/object]_[variant].[ext]`
- Tất cả chữ thường, dùng `snake_case`.

## 3. Danh sách tài nguyên cần tải & Mapping Logic

### Nhóm 1: UI & Tương tác (Category: `ui_`)
*Vị trí sử dụng: React Layer (MainMenu, Settings) & Phaser UI.*
- `ui_btn_hover.ogg`: Dùng khi `onMouseEnter` các nút bấm.
- `ui_btn_click.ogg`: Dùng khi `onClick` các nút bấm, chọn menu.
- `ui_popup_open.ogg`: Dùng khi mở Modal/Popup (ví dụ: mở hòm đồ, mở bảng nhiệm vụ).
- `ui_popup_close.ogg`: Dùng khi đóng Modal/Popup.
- `ui_error_beep.ogg`: Dùng khi thao tác sai, hoặc không đủ điều kiện (không đủ tiền, đồ đang khóa).

### Nhóm 2: Core Giải Toán (Category: `math_`)
*Vị trí sử dụng: React Layer (Math Question Modal).*
- `math_keyboard_tap.ogg`: Dùng khi học sinh gõ phím trên Virtual Keyboard.
- `math_correct.ogg`: Dùng ở action `SubmitAnswer` khi kết quả đúng (âm thanh "ding" sáng, khích lệ).
- `math_wrong.ogg`: Dùng ở action `SubmitAnswer` khi kết quả sai (âm thanh "buzz" nhẹ, mang tính nhắc nhở, không gây ức chế).
- `math_whiteboard_draw.ogg`: Tiếng sột soạt nhẹ, lặp lại khi action vẽ của tool nháp ảo diễn ra.

### Nhóm 3: Chiến Đấu (Category: `combat_`)
*Vị trí sử dụng: Phaser Layer (`BattleScene`, `Player` & `Monster` entity).*
- `combat_encounter.ogg`: Dùng khi va chạm quái vật, kích hoạt battle từ World Map.
- `combat_cast_fire.ogg`: Dùng ở action `PlayMagicAnimation(Fire)`.
- `combat_cast_ice.ogg`: Dùng ở action `PlayMagicAnimation(Ice)`.
- `combat_hit_impact.ogg`: Dùng khi quái hoặc nhân vật bị trúng đòn (mất máu).
- `combat_miss.ogg`: Dùng ở hàm `Evade()` hoặc khi tấn công hụt (tiếng gió sượt).
- `combat_heal.ogg`: Dùng khi dùng vật phẩm/skill hồi máu (âm thanh lấp lánh).
- `combat_monster_cry.ogg`: Tiếng quái vật gầm rú ngắn.
- `combat_victory.ogg`: Dùng ở `BattleEndState` khi thắng (đoạn nhạc ngắn vinh danh).

### Nhóm 4: Di chuyển & Thế giới (Category: `world_`)
*Vị trí sử dụng: Phaser Layer (`WorldScene`, `Player` entity).*
- `world_step_grass.ogg`: Dùng ở event `player.onWalk` (phát lặp lại dựa trên frame/khoảng cách di chuyển).
- `world_collect_item.ogg`: Dùng khi nhặt vật phẩm rớt trên đất (tiếng "bling" hoặc đồng xu lách cách).
- `world_chest_open.ogg`: Dùng khi tương tác chạm mở rương báu.
- `world_npc_talk.ogg`: Tiếng mumble ngắn khi hội thoại với NPC bắt đầu (style Animal Crossing).
- `world_level_up.ogg`: Dùng khi thanh EXP đầy và thăng cấp.

### Nhóm 5: Nhạc Nền BGM (Category: `bgm_`)
*Vị trí sử dụng: Audio Manager toàn cục (Phát loop).*
- `bgm_main_menu.ogg`: Phát ở màn hình đăng nhập/chờ, vui tươi.
- `bgm_world_explore.ogg`: Phát khi đi dạo quanh map tự do, nhẹ nhàng.
- `bgm_combat_active.ogg`: Phát khi vào trận, tiết tấu nhanh, dồn dập.
- `bgm_math_thinking.ogg`: Phát khi popup giải toán đè lên màn hình, lofi hoặc ambient giúp tập trung.

## 4. Hành động cần thực hiện (Claude's Checklist)
1. Tạo 2 thư mục đích (nếu chưa có): `app/public/assets/audio/sfx/` và `app/public/assets/audio/bgm/`.
2. Viết Python script hoặc dùng CLI (curl/wget) tải các file âm thanh Creative Commons 0 (từ Kenney.nl UI Audio hoặc tương tự) đáp ứng mô tả.
3. Đổi tên theo đúng chuẩn `Naming Convention` và phân loại vào các thư mục.
4. (Tùy chọn) Kiểm tra dung lượng và định dạng. Nếu chưa đúng `.ogg` hoặc `.m4a`, có thể gọi `ffmpeg` (nếu có trên máy) để convert.
5. In ra Output cuối cùng: Một danh sách/cây thư mục các file đã tải thành công kèm theo đường dẫn để người dùng kiểm tra.
