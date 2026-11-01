# Làm theme mới

Một theme là một thư mục: ảnh và âm thanh trong `assets/`, bố cục cảnh trong `scene.json`, nội dung và luật trong `theme.json`, phần riêng (nếu cần) trong `theme.js`. Lõi lo kết nối live, lọc trùng, gom combo, luật quà, xếp hạng, danh hiệu, mục tiêu, giọng đọc. Phần lớn theme **không cần viết code**: chỉ khai báo JSON.

```
themes/<ten-theme>/
  index.html     nạp SDK (chép từ themes/template, không phải sửa)
  theme.json     hành động, luật quà, lệnh chat, danh hiệu, mục tiêu, giọng đọc, nhân vật, giao diện
  scene.json     ảnh nền, phối cảnh, sàn, lối đi, chỗ ngồi, điểm mốc, hiệu ứng môi trường
  theme.js       (tuỳ chọn) hành động / giao diện riêng
  assets/        background.jpg, nhân vật, hiệu ứng, music/*.mp3, sfx/<tên>.mp3
```

## Bắt đầu nhanh

1. Chép `themes/template` thành `themes/<ten-moi>` (tên tiếng Anh, kebab-case). Muốn để theme ở repo riêng thì xem mục "Để theme ở repo riêng" trong README.
2. Thả ảnh nền vào `assets/`, mở overlay với `?scene` để thấy lưới đo, rồi chỉnh `scene.json` cho người đứng đúng sàn, đúng cỡ.
3. Sửa `theme.json`: các hành động theo mức quà, lệnh chat, giọng đọc.
4. Mở bảng điều khiển, chọn theme, bấm các nút thử hiệu ứng, bật giả lập để xem cảnh đông người.

Thư mục bắt đầu bằng `_` hoặc `.` bị bỏ qua (dùng cho bản nháp).

## Kiểm tra trên overlay

| Địa chỉ | Để làm gì |
|---|---|
| `/overlay` | Trang cho OBS / LIVE Studio (1080 × 1920) |
| `/overlay?mute` | Tắt tiếng (khung xem trước trong bảng điều khiển) |
| `/overlay?scene` | Vẽ lưới đo: chân trời, sàn, lối đi, vật cản, chỗ ngồi, điểm mốc |
| `/overlay?safe` | Tô đỏ vùng giao diện TikTok che hoặc máy màn dài cắt mất (`Kit.safe`) |

Vùng an toàn trên khung 1080 × 1920: trên cùng 240px (tên kênh, người xem), hai bên mỗi bên 100px (máy màn dài cắt), nửa trái từ y 1250 trở xuống (khung bình luận), dưới cùng từ y 1760 (ô nhập, nút quà). Chữ trên điện thoại chỉ còn khoảng 1/3 cỡ: chữ đọc được nên từ 20px trở lên.

## scene.json

```jsonc
{
  "background": "assets/background.jpg",       // ảnh / video (mp4, webm) / gif
  "horizonY": 700,                             // đường chân trời: người càng gần đây càng nhỏ
  "person": {
    "refY": 1000, "refHeight": 60,             // ở độ cao refY người cao refHeight px
    "exponent": 0.45,                          // độ dốc phối cảnh
    "idleStyle": "stand",                      // hình giữ chỗ khi chưa có ảnh nhân vật: stand | kneel
    "cushion": { "width": 0.5, "depth": 0.32, "color": "#6e170f", "light": "#b8392a" }  // nệm dưới người đang quỳ / ngồi
  },
  "floor": { "top": 1040, "bottom": 1640, "left": 30, "right": 1050 },   // vùng sàn đặt đám đông
  "aisle": { "x": 540, "half": [[1000, 34], [1900, 100]], "lane": 90 },  // lối giữa (nửa bề rộng theo độ sâu), làn đi
  "spacing": { "col": 0.8, "row": 0.4 },       // khoảng cách người, tính theo chiều cao người
  "obstacles": [{ "x0": 0, "x1": 105, "y0": 0, "y1": 1130 }],            // chân cột, bàn... không đặt người
  "seats": [[440, 980], [640, 980]],           // ghế danh dự cho top người tặng
  "points": { "stage": [540, 930], "focus": [540, 600], "entry": [540, 2000] },  // điểm mốc cho hành động, camera
  "emitters": [{ "preset": "smoke", "at": "stage", "every": 90 }],      // hiệu ứng chạy liên tục (at: điểm mốc, [x, y], hoặc x / y)
  "glows": [[300, 760, 40]],                   // đốm sáng lung linh [x, y, bán kính] (nến, đèn)
  "sunrays": { "from": 1060 },                 // vệt nắng chéo nhẹ
  "fill": { "rows": 2 },                       // luôn lấp kín N hàng đầu bằng người không tên (không tính vào số người xem)
  "maxTags": 8,                                // số nhãn tên tối đa cùng lúc (ngoài top 3); nhãn không đè nhau
  "fps": 30                                    // giới hạn số hình vẽ mỗi giây, dành máy cho phần mềm phát live
}
```

Đám đông tự giãn: phòng vắng xếp thưa, đông thì xếp dày; người không còn chỗ thì người im lâu nhất rời đi.

## theme.json

### Hành động: danh sách bước JSON

```jsonc
"actions": [
  {
    "id": "small", "label": "Quà nhỏ", "icon": "assets/icon.png", "card": "1 xu",
    "steps": [
      { "walk": "stage" },                                   // đi tới điểm mốc / "home" về chỗ
      { "pose": "stand" },
      { "play": "bow", "times": 3, "each": [{ "sound": "chuong" }] },  // hoạt cảnh n lần ("count" = theo số quà)
      { "fx": "emit", "preset": "spark", "at": "head", "count": 12 },
      { "fx": "halo", "at": "focus", "image": "assets/fx/halo.png" },
      { "fx": "text", "at": "head", "text": "+{total}" },
      { "camera": "person", "zoom": 1.6 }, { "spotlight": true }, { "aura": 1 }, { "boost": 1.3 },
      { "say": "Cảm ơn {ten}!" }, { "toast": "{ten} vừa tặng {qua}" },
      { "crowd": [{ "play": "bow" }] },                      // cả đám đông cùng làm
      { "js": "tenHam" }                                     // gọi Kit.action('tenHam', fn) trong theme.js
    ]
  }
]
```

Hiệu ứng (`fx`): `emit` (smoke heart spark petal confetti snow leaf bubble firefly ember coin star), `rain`, `halo`, `rays`, `pillar`, `text`, `fly`, `sprite`, `fireworks`, `flash`, `shake`. Ảnh riêng truyền qua `"image"`.
Chữ trong bước điền được `{ten}` `{qua}` `{count}` `{total}` `{label}`.

### Luật

```jsonc
"rules": {
  "joinMode": "all",                         // "all": ai tương tác cũng vào; "keyword": phải chat từ khoá
  "joinKeywords": ["a di đà phật"],
  "bigGiftCoins": 100,                       // từ bao nhiêu xu thì chạy thêm "bigGift"
  "giftTiers": [{ "minCoins": 1, "action": "small", "label": "Dâng hương" }],   // theo giá MỘT món
  "giftOverrides": [{ "giftId": "5655", "names": ["rose"], "action": "small" }],
  "chatCommands": [{ "keywords": ["xin xăm"], "match": "contains", "action": "xam", "draw": "xam", "label": "gieo quẻ", "cooldownMs": 30000 }]
},
"bigGift":   { "steps": [...] },              // chạy thêm khi quà lớn
"reactions": { "like": [...], "chat": [...], "follow": [...], "share": [...], "title": [...], "goal": [...] },
"titles": [{ "minCoins": 200, "label": "Hộ pháp", "aura": 0.45 }],   // aura: vầng sáng thường trực theo danh hiệu (dùng trong theme.js)
"goals":  [{ "id": "likes", "metric": "likes", "label": "Tim", "every": 1000 }]
```

Thứ tự khớp quà: **ID quà** → **tên / bí danh** (không phân biệt dấu) → **bậc giá**. Bảng điều khiển sửa được luật, lưu ở `data/rules-<id>.json`.

### Bốc thăm qua chat (xin xăm, rút bài, bói...)

```jsonc
"draws": { "xam": { "perDay": true, "items": [{ "so": 1, "loai": "Thượng cát", "tho": ["dòng 1", "dòng 2"], "loi": "lời bàn" }] } }
```

Lệnh chat có `"draw": "xam"` thì server bốc một lá (mỗi người mỗi ngày một lá cố định nếu `perDay`), overlay nhận ở `ev.draw`, giọng đọc dùng mẫu `voice.draw`.

### Giọng đọc

```jsonc
"voice": {
  "enabled": true, "voice": "vi-VN-NamMinhNeural",            // hoặc vi-VN-HoaiMyNeural
  "gift": ["Cảm ơn {ten} đã tặng {qua}{lan}. {loi}."], "bigGift": [...],
  "join": ["Chào {ten}!"], "chat": ["{ten} nhắn: {chat}."],   // bình luận được lọc từ tục, link, biểu tượng
  "follow": [...], "title": [...], "goal": [...],
  "command:cau": ["{ten} cầu nguyện: {loi}."],                // câu riêng cho từng lệnh chat
  "draw": ["Quẻ số {so}, {loai}. {tho}. {loi}"], "drawAgain": [...],
  "cooldown": { "join": 18000, "chat": 10000 },               // giãn cách mỗi loại câu (ms)
  "delay": { "draw": 2300 },                                  // chờ cho khớp lúc hình hiện
  "fallbackWords": ["Chúc gia đình bình an"],                // {loi} khi người đó chưa chat gì
  "fallback": "local"                                         // (tuỳ chọn) dịch vụ lỗi hẳn thì đọc bằng giọng tiếng Việt có sẵn của Windows
}
```

Giọng đọc dùng dịch vụ miễn phí của Microsoft (cần mạng, đôi lúc chậm). Câu quà, quẻ, danh hiệu được đọc trước; câu chào và đọc bình luận chỉ đọc khi rảnh. Câu cố định (đọc quẻ, tụng định kỳ, lời mời) được **đọc sẵn và lưu ở `data/tts-cache`**: lần sau phát ngay.

### Nội dung tự chạy

```jsonc
"periodic": { "everyMinutes": 3, "quietSeconds": 0, "title": "THỜI KINH", "items": ["..."] },  // quietSeconds > 0: chỉ chạy khi vắng
"prompts":  { "everySeconds": 90, "quietSeconds": 25, "items": ["Gõ xin xăm để xem quẻ nhé."] }  // lời mời tương tác khi chat vắng
```

### Nhân vật

```jsonc
"characters": [{
  "id": "phattu", "label": "Phật tử", "keywords": ["nam"],          // chat từ khoá để đổi dáng
  "sheet": "assets/chars/devotee.png", "frames": 32,               // tờ khung ngang chia đều, tự cắt sát theo nền trong suốt
  "walkUp": [0, 1, 2], "walkDown": [8, 9], "walkSide": [12, 13],   // khung đi theo hướng (đi ngang vẽ quay sang phải)
  "poses": { "idle": 16, "stand": 24, "incense": 26 }
}],
"animations": { "bow": { "frames": ["idle", "idle@0.8", "idle"], "ms": 1300 } },   // "idle@0.8": nén thấp (cúi / lạy)
"npcs": [{ "id": "su", "character": "phattu", "at": [480, 870], "showName": false, "cushion": false, "reactions": { "bigGift": [...] } }]
```

Tờ nhân vật vẽ bằng AI thường không chia đều: dùng công cụ cắt tờ (tự dò từng dáng, tách nền xanh) `pnpm assets:cut ... --auto`, cách làm đầy đủ ở [ASSETS-GUIDE.md](ASSETS-GUIDE.md).

### Giao diện có sẵn, màu, âm thanh

```jsonc
"hud": { "title": { "text": "Tên kênh" }, "counters": true, "giftCard": { "verb": "đã tặng", "unit": "xu" }, "tiers": true,
         "board": { "title": "BẢNG VÀNG", "size": 3 }, "ticker": { "title": "Vừa tặng" }, "goal": true, "guide": { "title": "Cách tham gia" } },
"colors": { "accent": "#ffd987", "panel": "...", "border": "...", "glow": "..." },
"sounds": { "chuong": { "cooldown": 3000, "duck": 0.7 }, "like": false }   // assets/sfx/<tên>.mp3, nhạc nền: assets/music/*.mp3
```

## theme.js: phần riêng

```js
Kit.action('lantern', (person, ev) => { /* bước { "js": "lantern" } */ });
Kit.on('frame', (t, dt) => { /* mỗi hình */ });
Kit.on('speak', (e) => {}); Kit.on('speakEnd', (e) => {});   // giọng đọc bắt đầu / xong (e.about: gift, draw, chat...)
Kit.hud = { init, giftCard, ticker, state, guide, toast, periodic, draw, remember, reset };  // thay cả giao diện
```

API: `Kit.scene` (người, điểm mốc, camera), `Kit.fx` (hiệu ứng), `Kit.audio` (`sfx('chuong')`), `Kit.safe` (vùng an toàn), `Live.on(...)` (sự kiện thô: join, chat, like, gift, command, follow, share, title, goal, periodic, prompt, tts, state, reset).

## Nguyên tắc để theme ổn định khi live

- **Có giới hạn**: live đông có thể vài chục sự kiện mỗi giây; kit đã giới hạn số người, nhãn, tiếng cùng lúc, đừng tự tạo thêm vòng lặp không giới hạn.
- **Không tin dữ liệu người xem**: tên và bình luận chèn vào HTML phải qua `textContent` hoặc hàm escape.
- **Trang có thể tải lại bất cứ lúc nào** (OBS, mất mạng): kit tự dựng lại người đang có; kẹt màn trống quá 12 giây thì tự tải lại.
- **Có người thật trên sóng**: live chỉ có trò chơi tự chạy dễ bị TikTok đánh lỗi "nội dung không nguyên bản". Nên có camera người dẫn và nói chuyện.
