# TikTok Live Kit

Bộ khung chung để làm **game / overlay tương tác cho TikTok LIVE**. Người xem vào live, bình luận, thả tim, tặng quà thì nhân vật và hiệu ứng trên màn hình phản ứng theo.

Lõi viết một lần. Mỗi chủ đề (chùa ảo, sàn nhảy, đua xe…) là một **theme** cắm vào thư mục `themes/`, đổi ngay trên bảng điều khiển.

Kit không kèm theme làm sẵn, chỉ có khung trống `themes/template` để chép ra làm chủ đề của mình. Vẻ đẹp của theme đến từ asset (ảnh nền, nhân vật, GIF, video, nhạc) do bạn chuẩn bị.

| Tài liệu | Nội dung |
|---|---|
| [docs/THEME.md](docs/THEME.md) | Làm theme: cấu trúc, `scene.json`, `theme.json`, hành động, giọng đọc, `theme.js` |
| [docs/ASSETS-GUIDE.md](docs/ASSETS-GUIDE.md) | Làm đẹp do đâu: ảnh nền, tờ nhân vật, hiệu ứng, âm thanh bằng AI tạo ảnh, công cụ xử lý |
| [docs/GO-LIVE.md](docs/GO-LIVE.md) | Lên live: LIVE Studio / OBS, TikFinity, kiểm tra trước giờ phát, lỗi hay gặp |
| [AGENTS.md](AGENTS.md) | Cho AI lập trình (Claude Code, Codex, Gemini…): bản đồ repo, lệnh, quy tắc |
| [CHANGELOG.md](CHANGELOG.md) | Các thay đổi |

Làm bằng AI: mở repo trong Claude Code / Codex / Cursor rồi nói *"làm cho tôi theme <chủ đề>"*; AI đọc `AGENTS.md` và hỏi bạn về asset.

### Để theme ở repo riêng

Mỗi kênh live có thể là một repo riêng chỉ chứa theme và dữ liệu, gọi server của kit với ba biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `KIT_THEMES_DIR` | Thư mục chứa theme của bạn (ưu tiên hơn `themes/` của kit) |
| `KIT_DATA_DIR` | Nơi lưu luật đã chỉnh, phiên live, giọng đọc (mặc định `data/` của kit) |
| `KIT_CONFIG` | File cấu hình ghi đè `config.json` của kit (ví dụ `{"theme": "ten-theme"}`) |

```bat
set KIT_THEMES_DIR=%~dp0themes
set KIT_DATA_DIR=%~dp0data
set KIT_CONFIG=%~dp0config.json
node ..\tiktok-live-kit\src\server.js
```

## Hạ tầng khi live

```
TikTok LIVE ──> TikFinity Desktop ──ws://127.0.0.1:21213──┐
          └──> (dự phòng) kết nối trực tiếp ───────────────┤
                                                           ▼
                                    Lõi (Node, cổng 3939)
                                    lọc trùng · gom combo · luật quà · xếp hạng · danh hiệu · mục tiêu
                                                           │ WebSocket
                         ┌─────────────────────────────────┴───────────────┐
                Bảng điều khiển (/)                               Overlay theme (/overlay)
                                                                          │
                              LIVE Studio (quay cửa sổ overlay.bat) hoặc OBS (nguồn Browser)
```

## Chạy

Cần Node.js 20 trở lên.

- Windows: bấm đúp **`run.bat`** (tự cài thư viện, mở server và bảng điều khiển).
- Hoặc:
  ```bash
  pnpm install
  pnpm start
  ```

Mở http://localhost:3939/ để vào bảng điều khiển.

## Lên live

Ngắn gọn: chạy `run.bat` → mở TikFinity Desktop nối kênh → bảng điều khiển bấm **Kết nối** (nguồn **Tự động**) → chạy `overlay.bat` rồi trong LIVE Studio thêm nguồn **Quay màn hình cửa sổ** (hoặc OBS: nguồn Browser `http://localhost:3939/overlay`, 1080 × 1920). Từng bước và lỗi hay gặp: [docs/GO-LIVE.md](docs/GO-LIVE.md).

Mất mạng, TikFinity tắt hay phần mềm phát tải lại trang đều không cần thao tác lại:
- Lõi tự nối lại, giãn dần từ 2 đến 30 giây.
- Overlay tự nối lại và dựng lại đám đông đang có.
- Bảng xếp hạng được lưu xuống file, nên tắt mở server không mất.

## Bảng điều khiển

- **Kết nối**: chọn nguồn, xem trạng thái, xem "sự kiện cuối cách đây bao lâu" để biết luồng có đang chạy.
- **Test Lab**: tạo người xem giả, quà 1/5/10/100 xu, combo, chế độ tự chạy (vừa / đông / cực đông). Sự kiện giả đi qua đúng đường ống như live thật. Có nút xem thử từng hiệu ứng của theme.
- **Luật tương tác** (sửa trên web, không cần code):
  - Ai được vào sân: mọi người, hoặc chỉ người chat từ khoá / tặng quà.
  - Bậc quà theo giá một món.
  - Quà riêng theo ID hoặc tên. Danh sách tự học các món quà đã gặp trên live.
  - Lệnh chat có thời gian chờ.
- **Bảng xếp hạng**: top theo xu, danh hiệu, tải **CSV** sau buổi live để tri ân, nút **Phiên mới**.
- **Theme**: đổi ngay khi đang chạy, overlay tự tải lại.

## Làm theme mới

Xem [docs/THEME.md](docs/THEME.md). Tóm tắt: chép `themes/template`, thả asset vào `assets/`, đo cảnh trong `scene.json`, rồi khai báo hành động cho từng mức quà trong `theme.json`. Cần hiệu ứng riêng thì viết thêm `theme.js`. Theme vẽ bằng gì cũng được (DOM, Canvas, Three.js). Game ngoài như Unity cũng nối được vào WebSocket `/ws` với `{"type":"hello","role":"overlay"}`.

## Cấu trúc

```
src/
  server.js            HTTP + WebSocket, phân quyền control/overlay, nạp theme
  core/
    normalize.js       dữ liệu thô của mọi nguồn → một dạng sự kiện chung
    streaks.js         gom quà combo (chỉ tính phần tăng, không cộng trùng)
    rules.js           luật: ID quà → tên quà → bậc giá; lệnh chat; từ khoá vào sân
    engine.js          đường ống: lọc trùng → combo → luật → phiên → phát sự kiện
    session.js         người chơi, xếp hạng, danh hiệu, mục tiêu, lưu file, xuất CSV
    gift-catalog.js    ghi nhớ quà đã gặp
    voice.js, tts.js   mẫu câu giọng đọc (lọc bình luận, giãn cách), đọc tiếng Việt, đọc sẵn câu cố định
    draws.js           bốc thăm qua chat (xin xăm, rút bài...)
  providers/           tikfinity · connector (trực tiếp) · demo · manager (nối lại, chuyển nguồn, canh im lặng)
public/
  control/             bảng điều khiển
  sdk/                 live-sdk (kết nối) · geometry · assets · fx · audio · scene (đám đông, camera) · hud · kit (chạy hành động JSON)
themes/<id>/           theme.json + scene.json + index.html + theme.js + assets/
data/                  (không vào git) settings, luật đã chỉnh, phiên live, danh sách quà
tools/                 xử lý asset: cut-sheet.py (pnpm assets:cut), black-to-alpha.py (pnpm assets:alpha)
test/                  pnpm test
run.bat, overlay.bat   chạy server; mở overlay thành cửa sổ Chrome cho LIVE Studio quay
```

## Cấu hình

`config.json` là cấu hình mặc định. Những gì đổi trên bảng điều khiển (kênh, nguồn, theme) được lưu riêng ở `data/settings.json`.

| Khoá | Ý nghĩa |
|---|---|
| `port`, `host` | Mặc định `127.0.0.1:3939`, chỉ máy này truy cập được. `host` nhận danh sách (`"127.0.0.1,192.168.137.1"`) để mở thêm đúng một địa chỉ (ví dụ điểm phát Wi-Fi của máy) |
| `allowLan` | `true` cho máy khác trong mạng LAN mở được (ví dụ điều khiển bằng điện thoại) |
| `provider` | `auto` \| `tikfinity` \| `connector` |
| `tikfinityUrl` | Mặc định `ws://127.0.0.1:21213/` |
| `autoConnect` | Tự kết nối khi server khởi động |
| `signApiKey` | Key Euler Stream nếu nguồn trực tiếp bị giới hạn lượt |
| `maxJoinsPerSecond` | Chặn ngập người vào khi live đông (mặc định 15/giây) |
| `playerTtlMinutes` | Im lặng quá bao lâu thì coi như đã rời sân |
| `watchdogSeconds` | Nguồn trực tiếp im quá lâu thì tự nối lại |

## Lưu ý

- Nguồn trực tiếp (`tiktok-live-connector`) là thư viện không chính thức. TikTok đổi giao thức thì chạy `pnpm update tiktok-live-connector`. Nên dùng TikFinity làm nguồn chính.
- Live đông thì TikTok không gửi đủ từng lượt vào phòng và từng lượt tim. Quà và bình luận thì gần như đủ.

## Giấy phép

[MIT](LICENSE). Kit là dự án độc lập, không liên kết hay được TikTok bảo trợ. Asset bạn đưa vào theme (ảnh, nhạc, font) theo giấy phép riêng của từng asset.
