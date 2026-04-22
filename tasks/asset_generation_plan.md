# Lộ trình Chế tác Graphic Assets (Asset Generation Plan)

> **Tổng số lượng Request:** ~52 ảnh
> **Chiến lược:** Để an toàn với Rate Limit của máy chủ sinh ảnh và đảm bảo chất lượng, chúng ta sẽ chia việc sinh ảnh làm 4 Batch. Tối đa mỗi ngày/phiên chỉ ép máy chủ generate khoảng 12-15 hình. 
> 
> *Mỗi hình được generate xong sẽ tự động được lưu và anh có thể copy vào code theo đúng `Folder Convention` đã định.*

---

## 🟢 BATCH 1: Khởi tạo Core Game (14 request)
**Mục tiêu:** Chốt style nhân vật chính, Mascot dẫn truyện và Môi trường cơ bản. (Priority 1)
- [x] **F.1.1** Wizard male walk spritesheet (1 ảnh)
- [x] **F.2.1** Forest tileset 32x32 (1 ảnh)
- [x] **Appendix C** Mascot Sóc Guide (C.1 & C.2) (4 ảnh - Greet, Point/Talk, Cheer, Think)
- [ ] **Appendix A** Monster 1 (Embershed - Fire) (4 ảnh - Idle, Atk, Hit, Faint)
- [ ] **Appendix A** Monster 2 (Aquament - Water) (4 ảnh - Idle, Atk, Hit, Faint)

## 🟡 BATCH 2: Hoàn thiện Quái thú & Khởi tạo UI Core (15 request)
**Mục tiêu:** Xử lý nốt 3 quái thú còn lại (để phân rã thuộc tính) và khung UI chiến đấu. (Priority 1 + 2)
- [ ] **Appendix A** Monster 3 (Pebbler - Earth) (4 ảnh)
- [ ] **Appendix A** Monster 4 (Zapwing - Storm) (4 ảnh)
- [ ] **Appendix A** Monster 5 (Voidling - Astral) (4 ảnh)
- [ ] **F.3.1** Forest combat background (1 ảnh)
- [ ] **F.4.1** HP/MP Bar Frame cơ bản (2 ảnh - state đầy 100%)

## 🟠 BATCH 3: Nút bấm Phép thuật & Khung giao diện chính (14 request)
**Mục tiêu:** Nút phép UI và các khung nền tĩnh. (Priority 2 + 3)
- [ ] **F.4.3** Spell Button Icons (8 ảnh cho 8 element: Fire, Water, Earth...)
- [ ] **F.6.1** Main menu background (1 ảnh)
- [ ] **F.4.4** Generic UI Primitives Kit (1 ảnh sprite sheet cho nút bấm)
- [ ] **F.4.1 / F.4.2** HP/MP Bar states phụ (4 ảnh - state rỗng, sắp chết)

## 🔴 BATCH 4: Hiệu ứng động VFX & Hoàn thiện (11 request)
**Mục tiêu:** Làm sống động Combat bằng Particle và Banner thông báo. (Priority 3 + 4)
- [ ] **F.4.5** Notification banners (3 ảnh - Victory, Defeat, Level-up)
- [ ] **F.5** VFX Spell Sheets (8 ảnh hiệu ứng - vứt đá, ném lửa, tia nước...)

---

**Quy trình thực thi:**
1. Em chạy `generate_image` với từng prompt cứng.
2. Xuất ảnh và trình bày cho anh xem.
3. Nếu không ưng đi nét/màu sắc chỗ nào, em sẽ tinh chỉnh lại prompt để reroll.
4. Xong 1 Batch mới tiến hành sang Batch tiếp theo để đảm bảo server không báo lỗi 429 Too Many Requests.
