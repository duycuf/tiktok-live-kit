# Thay đổi

[English](CHANGELOG.md) | **Tiếng Việt**

## Chưa phát hành

- Bảng điều khiển chia 5 tab (Live, Luật, Thử nghiệm, Thống kê, Hướng dẫn), khung xem trước overlay luôn ở bên phải: thư viện quà có ảnh (bấm để thêm luật), nút thử trên từng dòng luật, nút thử quà theo nhóm giá, thả 10 / 30 / 60 / 400 người, hướng dẫn lên live ngay trong bảng.
- Bảng điều khiển đổi giao diện theo duycuf.vn: khối xanh đen loang xanh / cam, màu nhấn cam ember, font Be Vietnam Pro và JetBrains Mono.
- Biểu tượng hành động là file ảnh giờ hiện thành ảnh trong bảng điều khiển, không còn hiện đường dẫn.
- Lên live: chọn cách phát trước (LIVE Studio quay cửa sổ, OBS qua camera ảo, OBS bằng khoá phát), hướng dẫn OBS đầy đủ.

## 1.0.1 (2026-11-02)

- Giọng đọc: câu chào, đọc bình luận không còn bị bỏ khi đang đọc sẵn câu cố định ở nền.
- Tài liệu bằng tiếng Anh, bản tiếng Việt ở `*.vi.md`.

## 1.0.0 (2026-11-01)

Bản chia sẻ đầu tiên.

- **Nguồn live**: TikFinity Desktop, nối trực tiếp (`tiktok-live-connector`), giả lập; tự chọn nguồn, tự nối lại, canh im lặng.
- **Lõi**: lọc trùng, gom combo, luật quà (ID → tên → bậc giá), lệnh chat có thời gian chờ, từ khoá vào sân, xếp hạng, danh hiệu, mục tiêu, lưu phiên, xuất CSV.
- **Bảng điều khiển**: kết nối, Test Lab (người xem giả, quà, combo, tự chạy), sửa luật trên web, đổi theme khi đang chạy.
- **Overlay SDK**: đám đông theo phối cảnh (lối đi, chỗ ngồi, vật cản, lấp kín hàng đầu bằng `fill`), nhân vật từ tờ hoạt hình (đi theo hướng, tư thế, động tác), hiệu ứng (hạt, pháo hoa, tia sáng, ảnh / GIF / video / Lottie), âm thanh có giãn cách, camera, giao diện có sẵn, vùng an toàn `?safe`, giới hạn `fps`, tự tải lại khi kẹt.
- **Hành động JSON**: mỗi mức quà / lệnh chat là danh sách bước, không cần code; `theme.js` cho phần riêng.
- **Giọng đọc tiếng Việt**: cảm ơn quà, chào người vào, đọc bình luận (lọc từ tục, link), câu riêng cho từng lệnh, ưu tiên câu quan trọng, đọc sẵn câu cố định, dự phòng giọng Windows.
- **Nội dung tự chạy**: bốc thăm qua chat (`draws`), thông báo định kỳ (`periodic`), lời mời tương tác khi chat vắng (`prompts`).
- **Theme ở repo riêng**: `KIT_THEMES_DIR`, `KIT_DATA_DIR`, `KIT_CONFIG`.
- **Công cụ asset**: `pnpm assets:cut` (cắt tờ nhân vật nền xanh, tự dò từng dáng), `pnpm assets:alpha` (nền đen → trong suốt, xoá dấu góc).
- **Tài liệu**: `docs/THEME.vi.md`, `docs/ASSETS-GUIDE.vi.md`, `docs/GO-LIVE.vi.md`, `AGENTS.md` cho AI lập trình.
