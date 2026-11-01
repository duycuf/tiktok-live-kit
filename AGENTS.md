# AGENTS.md

Hướng dẫn cho AI lập trình (Claude Code, Codex, Gemini CLI, Cursor…) khi làm việc trong repo này. `CLAUDE.md` và `GEMINI.md` trỏ về file này.

## Repo là gì

TikTok Live Kit: server Node nhận sự kiện TikTok LIVE (quà, tim, chat, người vào) và một overlay 1080 × 1920 phản ứng theo **theme**. Người dùng thường nhờ AI **làm theme mới** hoặc **chỉnh theme**; hiếm khi cần sửa lõi.

| Đường dẫn | Nội dung |
|---|---|
| `src/server.js` | HTTP + WebSocket, nạp theme, giọng đọc, nội dung tự chạy |
| `src/core/` | Đường ống sự kiện: normalize → streaks (combo) → rules → engine → session; `voice.js`, `tts.js`, `draws.js` |
| `src/providers/` | Nguồn: TikFinity, nối trực tiếp, giả lập, manager (nối lại) |
| `public/control/` | Bảng điều khiển (`/`) |
| `public/sdk/` | SDK cho overlay: `kit.js` (chạy hành động JSON), `scene.js` (đám đông, camera), `fx.js`, `audio.js`, `hud.js`, `assets.js`, `geometry.js`, `live-sdk.js` |
| `themes/template/` | Khung trống để chép làm theme mới |
| `tools/` | Xử lý asset: cắt tờ nhân vật, nền đen → trong suốt |
| `docs/` | `THEME.md` (tham chiếu đầy đủ), `ASSETS-GUIDE.md` (làm asset), `GO-LIVE.md` (lên live) |
| `test/` | `node --test` |

## Lệnh

```bash
pnpm install          # lần đầu (hoặc run.bat trên Windows)
pnpm start            # server ở http://localhost:3939
pnpm dev              # tự khởi động lại khi sửa src/
pnpm test             # chạy test lõi
pnpm assets:cut  <tờ.png> <ra.png> --auto --scale 0.7 --preview <soát.png>   # cắt tờ nhân vật nền xanh
pnpm assets:alpha <vào.jpg> <ra.png> --max 1024                               # hiệu ứng nền đen → trong suốt
```

`assets:*` cần [uv](https://docs.astral.sh/uv/) (tự tải pillow, numpy).

## Làm theme mới

1. Chép `themes/template` → `themes/<ten-theme>` (tiếng Anh, kebab-case). Đặt `"theme": "<ten-theme>"` trong `config.json` hoặc chọn trên bảng điều khiển.
2. **Hỏi người dùng về asset trước** (ảnh nền, nhân vật, âm thanh). Chưa có thì đưa họ `docs/ASSETS-GUIDE.md` và soạn prompt theo mẫu ở đó. Không tự vẽ asset bằng code thay cho ảnh thật, trừ khi người dùng muốn.
3. Ảnh nền → `scene.json`: mở `/overlay?scene`, chỉnh `horizonY`, `person`, `floor`, `aisle`, `seats`, `points` tới khi người đứng đúng sàn.
4. `theme.json`: `actions` (danh sách bước), `rules` (bậc quà, lệnh chat), `voice`, `characters`, `hud`, `colors`, `sounds`; tuỳ chọn `draws`, `periodic`, `prompts`, `reactions`, `titles`, `goals`. Mọi khoá có trong `docs/THEME.md`.
5. Chỉ viết `theme.js` khi JSON không làm được (hành động riêng `Kit.action`, giao diện riêng thay `Kit.hud`).
6. Kiểm tra: bảng điều khiển → bấm từng nút thử hiệu ứng, bật giả lập đông người, **Đọc thử** giọng; mở `/overlay?safe` xem chữ có nằm trong vùng an toàn.

Theme có thể nằm ở repo riêng: biến `KIT_THEMES_DIR`, `KIT_DATA_DIR`, `KIT_CONFIG` (xem README).

## Quy tắc

- **Theme không sửa lõi.** Thiếu tính năng thì làm trong `theme.js`; chỉ sửa `src/` hoặc `public/sdk/` khi người dùng muốn nâng cấp kit cho mọi theme, và chạy `pnpm test` sau khi sửa.
- **Khung 1080 × 1920, xem trên điện thoại**: chữ từ 20px; giữ chữ, bảng trong vùng an toàn (`Kit.safe`: trên 240px, hai bên 100px, nửa trái từ y 1250, dưới từ y 1760). Không che vật chính của ảnh nền.
- **Dữ liệu người xem không đáng tin**: tên, bình luận đưa vào DOM qua `textContent` hoặc escape, không `innerHTML` trực tiếp.
- **Live đông**: không tạo vòng lặp, hạt, âm thanh không giới hạn; dùng giới hạn có sẵn (`maxTags`, `fps`, `sounds.cooldown`).
- **Trang tải lại bất cứ lúc nào**: trạng thái cần giữ thì lấy từ server (`Live.on('state')`), không chỉ giữ trong biến của trang.
- **Không commit** `data/` (phiên live, luật đã chỉnh, cache giọng), `assets/raw/`, key, token (`signApiKey`).
- Ghi nguồn asset vào `themes/<id>/CREDITS.md`.
