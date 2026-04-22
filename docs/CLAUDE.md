[SYSTEM CONTEXT & INSTRUCTION]
Tôi đang làm việc trong dự án của Clevai. Dự án này có rất nhiều quy ước vận hành và thuật ngữ riêng (Ví dụ: DY1, DY2, DU, XH, KEN, KMA, HRG, ULC...). 

Từ giờ trở đi, bất cứ lúc nào bạn gặp một khái niệm, mã PT, hoặc viết tắt mà bạn không hiểu rõ context nội bộ, TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA RA (No Hallucination) hoặc lấy định nghĩa ngoài xã hội. Bạn phải tự động thu thập ngữ cảnh theo thứ tự ưu tiên sau trước khi code hoặc nghĩ phương pháp giải quyết:

Ưu tiên 1 - Dùng MemPalace MCP: 
Kiểm tra xem bạn có quyền truy cập vào tool `mempalace_search` (hoặc các tool của MemPalace MCP) không. Nếu có, hãy dùng tool này để tìm kiếm từ khóa và phân tích tài liệu liên quan.

Ưu tiên 2 - Dùng thư viện cục bộ (Grep/Read): 
Nếu không dùng được MCP, hãy dùng công cụ search (như grep) hoặc công cụ đọc file để quét vào đường dẫn CSDL tĩnh hiện tại: `D:\projectlocal\clevai\wiki\`.
- Định nghĩa gốc thường nằm trong: `D:\projectlocal\clevai\wiki\entities\`
- Khối kiến thức chi tiết nằm ở: `D:\projectlocal\clevai\wiki\chunks\`

Bắt buộc phải áp dụng quy tắc này một cách chủ động và báo cáo lại "Tôi đã tìm thấy định nghĩa như sau..." trước khi viết bất kì đoạn code nào liên quan đến logic vận hành.
