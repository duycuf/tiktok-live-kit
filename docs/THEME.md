# Làm theme mới

Một theme là một thư mục trong `themes/`. Lõi lo kết nối live, lọc trùng, gom combo, luật quà, xếp hạng, danh hiệu, mục tiêu. Theme chỉ **nghe sự kiện và vẽ**.

## Bắt đầu nhanh

1. Chép `themes/starter` thành `themes/<ten-moi>` (tên tiếng Anh, kebab-case).
2. Sửa `theme.json`: tên, các hành động, luật mặc định, danh hiệu, mục tiêu.
3. Viết `overlay.js`: mỗi hành động khai báo trong `theme.json` cần một hàm vẽ.
4. Mở bảng điều khiển, chọn theme ở góc trên, rồi dùng **Test Lab** và các nút "Xem thử từng hiệu ứng".

Thư mục bắt đầu bằng `_` sẽ bị bỏ qua (dùng cho bản nháp).

## theme.json

```jsonc
{
  "name": "Tên hiện trên bảng điều khiển",
  "width": 1080, "height": 1920,            // khung gốc, SDK tự co vừa cửa sổ
  "actions": [                               // những gì theme biết làm
    { "id": "dance", "label": "Nhảy", "icon": "💃", "card": "1 COIN", "description": "..." }
  ],
  "rules": {                                 // luật mặc định (bảng điều khiển sửa được, lưu ở data/rules-<id>.json)
    "joinMode": "all",                       // "all" = ai tương tác cũng vào sân; "keyword" = phải chat từ khoá / tặng quà / theo dõi / chia sẻ
    "joinKeywords": ["hey"],
    "bigGiftCoins": 100,                     // từ bao nhiêu xu thì gắn cờ quà lớn (e.big)
    "giftTiers": [{ "minCoins": 1, "action": "dance", "label": "Cảm ơn" }],          // theo GIÁ MỘT MÓN
    "giftOverrides": [{ "giftId": "5655", "names": ["rose", "hoa hồng"], "action": "dance", "label": "Hoa hồng" }],
    "chatCommands": [{ "keywords": ["nhảy"], "match": "exact", "action": "dance", "label": "Nhảy", "cooldownMs": 5000 }]
  },
  "titles": [{ "minCoins": 0, "label": "Khách" }, { "minCoins": 100, "label": "VIP" }],  // danh hiệu theo tổng xu
  "goals":  [{ "id": "likes", "metric": "likes", "label": "Mục tiêu tim", "every": 1000 }], // metric: likes | coins | gifts | follows | shares | joins | chats
  "text":   { "bất kỳ": "chữ riêng của theme, đọc ở Live.theme.text" }
}
```

Thứ tự khớp luật quà: **ID quà** → **tên / bí danh** (không phân biệt dấu, hoa thường) → **bậc giá**.
Trường `card` của action là chữ trên ô mức quà (theme nào có ô thì dùng).

## index.html

```html
<div id="stage">…</div>
<script src="/sdk/live-sdk.js"></script>
<script src="overlay.js"></script>
```

Đường dẫn tương đối (`assets/...`) tính từ thư mục theme. Vẽ bằng gì cũng được: DOM/CSS, Canvas, Three.js (tải từ CDN hoặc để file trong `assets/`).

## Sự kiện (overlay.js)

```js
Live.stage(document.getElementById('stage'));   // co khung gốc vừa cửa sổ

Live.on('ready', ({ theme, players, state }) => {}); // lúc nối và MỖI LẦN NỐI LẠI: dựng lại người đang có, đừng cho đi từ cửa vào
Live.on('join',    (e) => {});  // người mới vào sân
Live.on('chat',    (e) => {});  // e.text
Live.on('like',    (e) => {});  // e.count
Live.on('gift',    (e) => {});  // e.action, e.label, e.count, e.total, e.big, e.combo, e.gift { id, name, image, coins }, e.test
Live.on('command', (e) => {});  // lệnh chat khớp luật: e.action, e.text
Live.on('follow',  (e) => {}); Live.on('share', (e) => {});
Live.on('title',   (e) => {});  // lên danh hiệu: e.title
Live.on('goal',    (e) => {});  // đạt mục tiêu: e.label, e.value
Live.on('state',   (s) => {});  // ~4 lần/giây: s.viewers, s.totals, s.top[ {name, coins, title, rank} ], s.goals[ {label, value, target, progress} ]
Live.on('reset',   () => {});   // bảng điều khiển bấm "Phiên mới"
Live.on('streamEnd', () => {});
```

Mọi sự kiện có người đều kèm `e.user = { id, name, avatar, title, coins, rank, isPlayer }`.
`isPlayer = false` nghĩa là người đó chưa được vào sân (chế độ từ khoá): theme nên bỏ qua hoặc chỉ hiện nhẹ.

Tiện ích: `Live.img(url)` (ảnh có cache, tải được ảnh đại diện TikTok), `Live.sound(url, volume)`, `Live.theme`, `Live.state`.

## Nguyên tắc để theme ổn định khi live

- **Luôn có giới hạn**: số nhân vật tối đa, số hạt hiệu ứng, số tiếng cùng lúc. Live đông có thể vài chục sự kiện mỗi giây.
- **Quà lớn xếp hàng**: hiệu ứng toàn màn hình chạy lần lượt, không chồng nhau (xem `spotlight` trong theme mẫu).
- **Xử lý `ready` như dựng lại từ đầu**: OBS có thể tải lại trang bất cứ lúc nào.
- **Không tin dữ liệu người xem**: tên và bình luận chèn vào HTML phải qua `esc()` hoặc `textContent`.
- **Nền trong suốt** nếu muốn ghép lên camera trong OBS: bỏ màu nền của `body` và `#stage`.
