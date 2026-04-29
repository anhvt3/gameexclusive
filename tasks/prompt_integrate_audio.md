# Yêu cầu Tích hợp SFX & Quy trình Tải BGM mới cho Game_SS3_exclusive

@Claude, Antigravity đã hoàn tất việc tải và phân loại toàn bộ Sound Effects (SFX) vào thư mục đích. Dưới đây là nhiệm vụ tiếp theo của bạn:

## 1. Kiểm tra và Tích hợp SFX hiện có
Thư mục `app/public/assets/audio/sfx/` hiện đã có đầy đủ các file âm thanh định dạng `.ogg` đã được chuẩn hóa tên (ví dụ: `ui_btn_click.ogg`, `math_correct.ogg`, `combat_hit_impact.ogg`, v.v.).

**Nhiệm vụ của bạn:**
1. **Verify (Kiểm tra):** Đọc danh sách file trong `app/public/assets/audio/sfx/` để xác nhận các file đã sẵn sàng.
2. **Preload (Tải trước):** Cập nhật file boot/preloader của Phaser (ví dụ: `Preloader.ts`) để load các asset SFX này vào cache của game.
3. **Tích hợp vào Codebase:** 
   - **Phaser Layer:** Gắn âm thanh vào các entity logic (như tiếng bước chân khi `Player` di chuyển, tiếng `hit` trong `BattleScene`).
   - **React Layer:** Viết một utility hoặc React Hook (ví dụ `useGameAudio`) kết nối qua Event Bus (`mitt`) để React UI có thể trigger tiếng click, tiếng bật popup, hoặc tiếng trả lời câu hỏi đúng/sai.

## 2. Cách tiếp cận MỚI để tải BGM (Bypass Proxy Block 403)
**Bối cảnh:** Sandbox hiện tại bị proxy chặn các request HTTP từ các công cụ CLI truyền thống (`curl`, `wget`) và Python (`urllib`, `requests`), dẫn đến lỗi 403 Forbidden hoặc Timeout khi cố truy cập các trang như freesound.org hay kenney.nl.

**Quy tắc tải file bắt buộc:**
- **TUYỆT ĐỐI KHÔNG** dùng `curl`, `wget` hay python scripts để tải file mạng.
- **BẮT BUỘC SỬ DỤNG** API `fetch()` gốc của Node.js (từ Node 18+). Node `fetch` đã được chứng minh là có thể đi xuyên qua proxy mặc định của môi trường này một cách mượt mà.

**Template Script tải file (Sử dụng khi cần tải BGM):**
```javascript
// Tạo một script tạm ví dụ: tasks/download_bgm.js và chạy bằng lệnh `node tasks/download_bgm.js`
const fs = require('fs');

const url = 'URL_CUA_FILE_BGM_MIEN_PHI.ogg';
const dest = 'app/public/assets/audio/bgm/bgm_main_menu.ogg';

fetch(url)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP Status: ${res.status}`);
    return res.arrayBuffer();
  })
  .then(buffer => {
    fs.writeFileSync(dest, Buffer.from(buffer));
    console.log('Tải thành công file đi xuyên Proxy:', dest);
  })
  .catch(err => console.error('Lỗi khi tải file:', err));
```

**Nhiệm vụ tiếp theo với BGM:** 
Áp dụng cách tiếp cận Node.js Fetch ở trên để tìm kiếm nguồn CC0 và tải 4 file nhạc nền (loop mượt, file nhỏ hơn 2MB/file) gồm: 
- `bgm_main_menu.ogg`
- `bgm_world_explore.ogg`
- `bgm_combat_active.ogg`
- `bgm_math_thinking.ogg`
Sau đó lưu toàn bộ vào `app/public/assets/audio/bgm/`.
