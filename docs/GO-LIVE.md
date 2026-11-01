# Lên live

Phần kỹ thuật để đưa theme lên một buổi TikTok LIVE. Điều kiện tài khoản, quy định nội dung của TikTok: xem trong TikTok / LIVE Studio.

```
TikTok LIVE ──(quà, tim, chat)──> TikFinity Desktop ──ws://127.0.0.1:21213──┐
            └──(dự phòng) nối trực tiếp ────────────────────────────────────┤
                                                                             ▼
                                                       Kit (run.bat, cổng 3939)
                                                                             │
                   LIVE Studio / OBS <── overlay http://localhost:3939/overlay
```

## 1. Cần có

| Phần mềm | Ghi chú |
|---|---|
| Node.js 20+ | https://nodejs.org (`run.bat` báo nếu thiếu) |
| Chrome | Để mở cửa sổ overlay cho LIVE Studio quay (Studio liệt kê được cửa sổ Chrome) |
| TikTok LIVE Studio hoặc OBS | Phần mềm phát |
| TikFinity **Desktop** (khuyên dùng) | Bản cài trên máy (bản web không phát dữ liệu ra cổng 21213). Không có thì dùng nối trực tiếp |

## 2. Chạy kit

1. Chạy `run.bat` (lần đầu tự cài thư viện). Cửa sổ đen là server: **để mở suốt buổi live**.
2. Bảng điều khiển tự mở ở http://localhost:3939: chọn theme, xem trạng thái kết nối, bấm thử hiệu ứng, bật giả lập.

## 3. Đưa overlay vào phần mềm phát

**TikTok LIVE Studio**
1. Chạy `overlay.bat`: mở overlay thành cửa sổ Chrome dọc riêng, **tự phát tiếng**, **không bị đứng hình khi bị cửa sổ khác che**.
2. Studio: khung dọc → **Thêm nguồn → Quay màn hình cửa sổ → chrome.exe** (tiêu đề là tên theme).
3. Chọn nguồn → chỉnh **lấp đầy** (không chọn kéo giãn) cho kín khung. Khung live dài hơn 9:16 nên hai bên bị cắt mỗi bên khoảng 100px: đặt chữ, bảng trong vùng an toàn (`/overlay?safe`).
4. Không minimize cửa sổ overlay; để nó nằm sau cửa sổ khác thì được.
5. Tiếng: bật thu âm thanh máy tính trong phần âm thanh của Studio.

**OBS**
1. Settings → Video: 1080 × 1920, 30 FPS.
2. Sources → Browser: URL `http://localhost:3939/overlay`, 1080 × 1920, tick *Control audio via OBS*. Chuột phải → Interact, bấm vào overlay một lần để bật tiếng.
3. Đưa sang LIVE Studio bằng *Start Virtual Camera* (Studio chọn nguồn Camera → OBS Virtual Camera), hoặc phát thẳng bằng khoá phát nếu có.

Nên đặt FPS phát 30: overlay đã giới hạn số hình vẽ (`scene.json` `"fps": 30`), dành máy cho phần mềm phát nén video.

## 4. Nối dữ liệu live (quà, tim, chat)

**Qua TikFinity Desktop**: mở TikFinity, đăng nhập, ô username nhập đúng tên @ của kênh (không gõ @), chờ TikFinity báo đã nối với buổi live. Bảng điều khiển: chọn **TikFinity Desktop** → **Kết nối**.

**Nối trực tiếp**: bảng điều khiển chọn **Trực tiếp**, gõ tên kênh → **Kết nối** (sau khi kênh đã lên sóng).

**Tự động**: có TikFinity thì dùng, không có thì nối trực tiếp. Mất kết nối thì tự thử lại (giãn dần tới 30 giây).

Chấm trạng thái xanh và dòng "sự kiện cuối cách đây …" chạy là dữ liệu đang vào.

## 5. Trước khi lên sóng

- Bấm thử các hiệu ứng, **Đọc thử** giọng.
- Giả lập đông người để xem cảnh; **tắt giả lập** và bấm **Làm mới phiên** trước khi lên sóng thật (nối được live thật thì giả lập cũng tự tắt).
- Mở `/overlay?safe` xem chữ, bảng có nằm trong vùng an toàn không.
- Câu đọc cố định (bốc thăm, tụng định kỳ, lời mời) được đọc sẵn sau khi server chạy vài phút: chạy kit sớm trước giờ live.

## Lỗi hay gặp

| Hiện tượng | Làm gì |
|---|---|
| Studio quay cửa sổ ra màn đen, "mất tín hiệu video" | Mở overlay bằng `overlay.bat` (Chrome), chọn đúng chrome.exe; tải lại nguồn trong Studio |
| Không thấy cửa sổ overlay trong danh sách của Studio | Studio không liệt kê cửa sổ Edge dạng ứng dụng: dùng Chrome (`overlay.bat` tự chọn Chrome) |
| Overlay im lặng | Cửa sổ `overlay.bat` tự phát tiếng; trang mở bằng trình duyệt thường thì bấm vào một lần. Trong Studio bật thu âm thanh máy tính |
| Overlay trống, không có cảnh | Thường do mở đúng lúc server đang khởi động lại; trang tự tải lại sau 12 giây, hoặc nhấn F5 |
| "Không thấy TikFinity ở ws://127.0.0.1:21213" | TikFinity Desktop chưa mở / chưa nối buổi live, hoặc đang dùng bản web. Hoặc chuyển sang Trực tiếp |
| Nối trực tiếp báo không lấy được Room ID | Kênh chưa lên sóng, hoặc gõ sai tên kênh |
| TikFinity báo `user_not_found` | Nhập tên @ (handle), không phải tên hiển thị |
| Giọng đọc chậm hoặc lúc có lúc không | Dịch vụ đọc của Microsoft chập chờn: câu cố định có bản đọc sẵn; theme bật `"voice": { "fallback": "local" }` để dùng giọng tiếng Việt có sẵn của Windows khi lỗi hẳn |
| Chữ, bảng bị cắt hai bên trên điện thoại | Giữ trong vùng an toàn (`?safe`), cách mép ít nhất 100px |
| Lỡ tắt cửa sổ đen | Chạy lại `run.bat`, bấm Kết nối lại, chọn lại nguồn trong Studio nếu mất hình |
