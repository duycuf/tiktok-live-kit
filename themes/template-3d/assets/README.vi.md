# Thả asset của theme 3D vào đây

[English](README.md) | **Tiếng Việt**

Khung 3D trống không kèm mô hình nào. Chưa có mô hình thì engine vẽ người giữ chỗ trên sàn phẳng. Xem mục "Cảnh 3D" trong `docs/THEME.vi.md` của kit.

| Chỗ | Dùng cho | Khai báo ở |
|---|---|---|
| `3d/*.glb` (hoặc `.gltf`) | nhân vật có khung xương và clip động tác (Idle, Walk, Wave…) | `theme.json` → `characters[].model`, `clips` |
| `3d/stage.glb` | không gian: sân khấu, phòng, quán bar, khu vườn… | `scene.json` → `world` |
| `bg.jpg` | phông phẳng phía sau cảnh 3D (tuỳ chọn) | `scene.json` → `background` |
| `sfx/<tên>.mp3`, `music/*.mp3` | tiếng hiệu ứng, nhạc nền | như bản 2D |

Nguồn miễn phí CC0: Quaternius (nhân vật có động tác), Kenney và KayKit (đồ vật, phòng, nhân vật), Poly Pizza. Mixamo có động tác miễn phí cho nhân vật có khung xương của bạn. Giữ nhân vật nhẹ (dưới khoảng 5.000 tam giác, 1–2 vật liệu) để 100+ người vẫn mượt.

Ghi nguồn và giấy phép từng asset vào `CREDITS.md` của theme.
