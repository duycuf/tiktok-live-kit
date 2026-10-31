# Chùa ảo · TikTok LIVE tương tác

Overlay dọc 1080×1920 cho TikTok LIVE. Mỗi người xem vào live thành một Phật tử áo lam bước vào chánh điện rồi quỳ xuống, trên đầu có tên.

| Người xem làm gì | Trên màn hình |
|---|---|
| Vào live | Phật tử đi từ cuối thảm đỏ vào, quỳ vào chỗ trống |
| Bình luận | Bong bóng chữ hiện trên đầu người đó |
| Thả tim | Tim bay lên từ người đó. Cứ đủ `likesPerBlessing` tim thì cả điện được ánh hào quang và mưa cánh sen |
| Theo dõi / chia sẻ | Bong bóng "Đã theo dõi" / "Đã chia sẻ", lấp lánh |
| Quà 1 xu | **Dâng hương**: lên lư hương vái 3 vái, khói bốc |
| Quà 5 xu | **Lễ Phật**: lên bồ đoàn lạy, hào quang quanh người |
| Quà 10+ xu | **Hoa sen**: sen bay từ người tặng lên bàn thờ, mưa cánh sen |
| Quà 100+ xu | **Đại lễ**: cả điện cùng lạy, tia sáng toả từ tượng Phật |

Góc dưới có dòng báo quà mới nhất, 3 ô mức quà và bảng **Tấm lòng thành** (top người tặng theo tổng xu).

## Chạy

Cần Node 20 trở lên.

```bash
pnpm install
pnpm start
```

- Bảng điều khiển: http://localhost:3939/ (nhập tên TikTok, bấm Kết nối, có nút giả lập để thử khi chưa live)
- Overlay: http://localhost:3939/overlay
- Xem thử không cần server: mở `overlay?demo`

## Đưa lên live

1. Mở **TikTok LIVE Studio** (hoặc OBS), thêm nguồn **Link / Browser source** trỏ tới `http://localhost:3939/overlay`, khung 1080×1920.
2. Lên live trên kênh.
3. Ở bảng điều khiển nhập tên kênh (không cần `@`), bấm **Kết nối**. Nếu kênh chưa live, server tự thử lại mỗi `autoReconnectSeconds` giây.

Có thể điền sẵn `tiktokUsername` trong `config.json` (hoặc biến môi trường `TIKTOK_USERNAME`) để server tự kết nối khi chạy.

## Tuỳ chỉnh

`config.json`:

- `giftTiers`: mức xu → hành động (`incense`, `bow`, `lotus`, `grand`). Mức tính theo **giá một món quà** (Rose 1 xu là dâng hương); tặng liên tiếp ×N thì lặp lại hành động và cộng đủ xu vào bảng xếp hạng.
- `hallName`, `host`: chữ hiện ở dòng báo khi chưa có quà.
- `maxDevotees`: số Phật tử tối đa trong điện. Đầy thì người im lặng lâu nhất ra về nhường chỗ.
- `likesPerBlessing`: bao nhiêu tim thì cả điện được ban phước.
- `signApiKey`: key Euler Stream nếu bị giới hạn lượt kết nối (xem bên dưới).

Ảnh nền: mặc định vẽ bằng code. Muốn nền đẹp như ảnh AI thì bỏ một ảnh dọc vào `public/assets/background.jpg`, overlay tự dùng. Nếu đổi ảnh, chỉnh toạ độ lư hương, bồ đoàn, sàn quỳ trong object `SCENE` đầu file `public/overlay.js` cho khớp.

## Cách hoạt động

```
TikTok LIVE ──(tiktok-live-connector)──> src/server.js ──WebSocket /ws──> overlay + bảng điều khiển
```

- `src/server.js`: kết nối live, gom quà tặng liên tiếp (chỉ tính phần tăng thêm), cộng bảng xếp hạng, phát sự kiện đã chuẩn hoá.
- `src/tiktok.js`: chuẩn hoá dữ liệu thô của thư viện (tên trường hay đổi giữa các bản).
- `public/overlay.js`: vẽ chánh điện bằng canvas, điều khiển nhân vật và hiệu ứng.

## Lưu ý

- `tiktok-live-connector` là thư viện không chính thức (đọc giao thức nội bộ của TikTok, ký qua máy chủ Euler Stream). TikTok đổi giao thức thì cần cập nhật thư viện: `pnpm update tiktok-live-connector`. Gặp lỗi giới hạn lượt ký thì tạo key miễn phí ở eulerstream.com và điền `signApiKey`.
- Live đông người thì TikTok không gửi đủ từng sự kiện tim và vào phòng; overlay vẫn chạy với những gì nhận được.
