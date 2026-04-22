# Project: Prodigy Clone (Web-based Educational RPG)

## 📌 Proposed Solution (Innovation Phase Result)
Dựa trên quyết định của anh:
- **Module B (Combat)**: Option 2 (Phaser.js Engine kết hợp React).
- **Module C (World)**: Option 1 (Tilemap 2D RPG truyền thống).

👉 **Kiến trúc Tổng thể (Architecture overview):**
- **Core Framework**: React (Vite / Next.js) làm lớp vỏ (Shell) xử lý UI tĩnh, quản lý account, và chứa Overlay của Module A (Giải Toán).
- **Game Engine**: Phaser 3 được nhúng trong một React Component (thường là thẻ `<canvas>`). Chịu trách nhiệm render World Map và Effect Combat.
- **Data Exchange (Giao tiếp)**: Giao tiếp qua lại giữa React (UI) và Phaser (Game) sử dụng Custom Event Bus của trình duyệt (`window.dispatchEvent`) hoặc hệ thống Event độc lập.
- **World Map Tools**: Xây dựng map qua phần mềm **Tiled** (`mapeditor.org`), xuất ra định dạng JSON để nạp vào Phaser.

---

## 🛠 Lộ trình thực hiện (Implementation Checklist)

### Phase 1: Khởi tạo & Định tuyến (Engine Integration)
- [ ] Khởi tạo 1 project React (Vite) + TypeScript.
- [ ] Cài đặt package `phaser` và render container màn hình Game lên Web.
- [ ] Thiết lập Global Event Bus để React và Phaser trao đổi dữ liệu (ví dụ: Phaser báo React khi đang ở màn hình đánh nhau).

### Phase 2: Module C (Bản đồ Thế giới - World Map)
- [ ] Sử dụng công cụ Tiled để tạo một map 2D góc nhìn từ trên xuống đơn giản (Nền, vật cản, NPC), xuất ra file JSON.
- [ ] Tạo **WorldScene** trong Phaser: Load map JSON và Tileset hình ảnh.
- [ ] Cài đặt nhân vật Player với Arcade Physics để đi lại 4 hướng (WASD / Diodes) và có va chạm chặn đường.
- [ ] Đặt quái vật (Enemies). Thiết lập hàm `overlap`: Khi Player chạm quái -> Disable di chuyển -> Chuyển cảnh (Switch) sang CombatScene.

### Phase 3: Module B (Hệ thống Chiến Đấu - Combat Scene)
- [ ] Tạo **CombatScene** trong Phaser: Hiển thị Player bên phải màn hình nhắm sang trái (hoặc ngược lại) cùng quái thú.
- [ ] Xây dựng Turn-based State Machine (Vòng lặp Lượt):
      1. Player chọn chiêu thức.
      2. Phaser tạm dừng (Pause), **bắn Event "MỞ_TOÁN" gửi qua React**.
      3. React nhận tín hiệu -> Mở Overlay Module A đè lên game. User nhập đáp án.
      4. Nếu đúng: **React bắn Event "TOÁN_ĐÚNG" về Phaser**.
      5. Phaser tiếp tục game -> Chạy Animation tung phép -> Giảm HP text con quái.
- [ ] Xử lý kết quả: Máu quái 0 -> Cấp EXP/Item -> Bật lại WorldScene, hủy bỏ thực thể quái vật.

---

## 📝 Nhật ký Rủi ro & Giải pháp (Lessons / Notes)
- Memory Leak: Khi Router React điều hướng sang trang Web khác, nhớ gọi hàm hủy `game.destroy(true)` của Phaser.
- Scaling: Thiết lập Scene phải scale tự động với trình duyệt (Responsive design) để không bị nát Canvas.
