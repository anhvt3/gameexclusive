# Phân tích Video Gameplay (Game Island & Play Prodigy)

Dựa trên các video quay màn hình trên trình duyệt Chrome, dưới đây là ghi chú chi tiết về nội dung, luồng tính năng (UI Flow) và các tính năng cốt lõi (Features) của 2 tựa game giáo dục.

---

## 1. Play Prodigy (`math.prodigygame.com`)
**Thể loại:** RPG Turn-based (Nhập vai chiến đấu theo lượt) kết hợp giải Toán.

### Nội dung & UI Flow:
*   **Luồng giải Toán (Math Solving Flow):** Bài toán (Ví dụ: Tính diện tích hình bình hành) được hiển thị toàn màn hình dạng pop-up đè lên nền game. Nền game (như cảnh đền thờ băng) được làm mờ/nhạt đi. Người chơi phải tự nhập đáp án qua một bàn phím ảo khổng lồ ở cạnh dưới màn hình.
*   **Chế độ di chuyển (World Map):** Người chơi di chuyển nhân vật trong một thế giới mở (rừng rậm diệu kỳ, nhà cây,...). 
*   **Chế độ chiến đấu (Combat):** Khi gặp quái, màn hình chuyển sang giao diện đối kháng nhóm (như Pokémon). Chọn chiêu thức -> Giải toán -> Trả lời đúng thì nhân vật cast phép (Get Magic). Có cày cấp (Level) và thanh máu (HP).

### Các tính năng cốt yếu (Features):
1.  **Hệ thống tương sinh tương khắc:** Quái vật có điểm yếu nguyên tố (thể hiện qua tag `Weak: Ice`, `Weak: Fire`). Bắt buộc trẻ phải suy luận hệ phái trước khi đánh.
2.  **Công cụ nháp ảo (Whiteboard tool):** Khi giải toán, góc phải luôn có thanh công cụ tẩy, bút vẽ, và bảng màu để học sinh tự "nháp" trực tiếp lên màn hình mà không cần giấy.
3.  **Hệ thống giữ chân người chơi (Retention):** Dưới màn hình World Map là một loạt các nút có chữ "Collect!" và đếm ngược thời gian (10 Hours waiting) dụ dỗ người chơi quay lại game mỗi ngày để nhận quà, ấp trứng, nhận pet.

---

## 2. Game Island (`games.prodigygame.com`)
**Thể loại:** Farming/Crafting Survival (Thu thập & Chế tạo sinh tồn).

### Nội dung & UI Flow:
*   **Luồng di chuyển & Tương tác:** Góc nhìn 2.5D từ trên xuống. Người chơi dùng chuột (hoặc WASD/Joystick ảo) để đi dạo quanh hoang đảo.
*   **Hệ thống Nhiệm vụ (Quest Flow):** Nhiệm vụ xuất hiện ở chính giữa phía trên màn hình. Rất đơn giản, tuyến tính. VD: *Collect some wood 0/5 -> Craft Shears 0/3 -> Clean the land 0/1.*
*   **Thu thập & Chế tạo:** Bấm vào cây cối để nhặt vật phẩm. Đứng cạnh bàn thiết kế (Crafting Table) để ghép đồ (VD: Dùng gỗ và đá để ghép thành kéo cắt cỏ).

### Các tính năng cốt yếu (Features):
1.  **Inventory Management:** Hệ thống hòm đồ theo dõi sức chứa (VD: đang chứa 0/200). Hiển thị pop-up ở góc phải liệt kê trực quan bạn đang có bao nhiêu gỗ, lá, đá.
2.  **Chỉ báo trực quan liên tục:** Khi cần làm quest gì, game luôn có một mũi tên màu mè bập bênh trỏ thẳng vào đồ vật cần thao tác để báo hiệu cho người chơi (bàn chế tạo, cây cỏ cần cắt).
3.  **UI Minimalist:** Tập trung vào các hành động sinh tồn hơn là giao diện ma thuật phức tạp. Có bổ sung thanh Thể lực (Energy/Food bar) để giới hạn hành động của người chơi trong ngày.

---

### 💡 So sánh nhanh:
*   **Prodigy Math** thiên hẳn về **Chiến đấu + Nhập vai + Luyện Toán**. Đồ họa mang hướng Fantasy, UI phức tạp, có thu thập Thú cưng (Pet). Thử thách toán học là rào cản bắt buộc để tiến lên.
*   **Game Island** thiên hẳn về tính **Chill + Khám phá + Chế tạo**. UI đơn giản, dễ thao tác, tập trung tương tác môi trường (chặt cây, dọn đảo). Phù hợp với đối tượng thích lối chơi giống Animal Crossing.
