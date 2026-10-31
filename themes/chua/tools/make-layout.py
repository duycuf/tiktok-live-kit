"""Vẽ bản phác bố cục chánh điện (1080x1920) để Flow render thành cảnh thật.

Toạ độ ở đây là toạ độ code dùng để đặt Phật tử, nên ảnh render theo bản phác sẽ khớp.
Chạy:  uv run --no-project --with pillow python themes/chua/tools/make-layout.py
Ra:    themes/chua/assets/ref/layout-guide.png  (một bản duy nhất, đưa thẳng cho Flow: không chữ, không người)

Chiều sâu đến từ: vách cuối nhỏ và xa, 8 cặp cột lặp lại nhỏ dần, xà trần và đèn lồng chạy về
điểm tụ, ván sàn tụ về một điểm, sương ấm làm mờ phần xa.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1920
VP = (540, 400)                 # điểm tụ, cao trong khung: máy đặt cao nhìn xuống
BACK = (330, 150, 750, 700)     # vách cuối nhỏ và xa: trái, trên, phải, dưới (chân vách = mép xa của sàn)
COL_X = (370, 710)              # hai hàng cột, tính tại chân vách cuối
COL_Y = (700, 728, 764, 812, 878, 975, 1125, 1390)   # chân 8 cặp cột, giãn dần về phía gần
VIP_ROWS = (742, 760, 782)      # 3 hàng nệm danh dự (y chân nệm): người tặng quà được mời lên
CENSER = (540, 734)             # đỉnh hương trên thảm, ngay trước bàn thờ (y = chân bệ): khói code bốc từ miệng lư
CARPET = 0.05                   # nửa bề rộng thảm theo độ sâu
OUT = Path(__file__).resolve().parents[1] / "assets" / "ref"

RED, RED_D, GOLD, GOLD_L, TEAK, TEAK_D, CREAM = (138, 24, 16), (70, 10, 6), (214, 160, 70), (255, 222, 150), (120, 68, 32), (58, 30, 12), (250, 236, 205)


def at(x_back, y_back, y):
    """x của điểm trên đường tụ về VP đi qua (x_back, y_back), lấy tại độ cao y."""
    return VP[0] + (x_back - VP[0]) * (y - VP[1]) / (y_back - VP[1])


def scale(y):
    """Hệ số to nhỏ theo độ sâu: 1 tại chân vách cuối, lớn dần về phía máy."""
    return (y - VP[1]) / (BACK[3] - VP[1])


def ceiling_y(y_floor):
    """Độ cao mép trần ở cùng độ sâu với điểm sàn y_floor."""
    return VP[1] - (y_floor - VP[1]) * (VP[1] - BACK[1]) / (BACK[3] - VP[1])


def make():
    img = Image.new("RGB", (W, H), (36, 12, 5))
    d = ImageDraw.Draw(img)
    l, t, r, b = BACK

    # trần, tường hai bên, sàn (bốn mặt tụ về VP)
    d.polygon([(0, 0), (W, 0), (r, t), (l, t)], fill=(70, 26, 10))
    d.polygon([(0, 0), (l, t), (l, b), (at(l, b, H), H), (0, H)], fill=(88, 20, 10))
    d.polygon([(W, 0), (r, t), (r, b), (at(r, b, H), H), (W, H)], fill=(88, 20, 10))
    d.polygon([(l, b), (r, b), (at(r, b, H), H), (at(l, b, H), H)], fill=TEAK)

    # ván sàn tụ về VP + đường nối ván giãn dần
    for k in range(-30, 31):
        x0 = VP[0] + k * 14
        d.line([(at(x0, b, b), b), (at(x0, b, H), H)], fill=TEAK_D, width=1)
    y, step = b, 3.0
    while y < H:
        d.line([(at(l, b, y), y), (at(r, b, y), y)], fill=(98, 54, 24), width=1)
        step *= 1.14
        y += step

    # thảm đỏ hẹp giữa lối
    d.polygon([(VP[0] - CARPET * (b - VP[1]), b), (VP[0] + CARPET * (b - VP[1]), b),
               (VP[0] + CARPET * (H - VP[1]), H), (VP[0] - CARPET * (H - VP[1]), H)], fill=(150, 24, 20))

    # trần: xà ngang ở mỗi tầng cột + xà dọc tụ về VP
    for yb in COL_Y:
        yt, s = ceiling_y(yb), scale(yb)
        if yt < -20:
            continue
        d.rectangle([max(-10, at(l, t, yt)), yt - 8 * s, min(W + 10, at(r, t, yt)), yt + 4 * s], fill=(96, 36, 12))
        d.line([(at(l, t, yt), yt + 4 * s), (at(r, t, yt), yt + 4 * s)], fill=GOLD, width=max(1, int(2 * s)))
    for x0 in (420, 480, 600, 660):
        d.line([(x0, t), (at(x0, t, -400), -400)], fill=(110, 44, 16), width=3)

    # vách cuối: sơn son thếp vàng (nhỏ, ở xa)
    d.rectangle(BACK, fill=RED)
    for x in range(l + 14, r - 14, 46):
        for yy in range(t + 18, b - 80, 86):
            d.rectangle([x, yy, x + 34, yy + 68], outline=GOLD, width=2)

    # tượng Phật lớn chiếm giữa vách cuối: hào quang, thân, đầu, đài sen
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([540 - 190, 360 - 190, 540 + 190, 360 + 190], fill=255)
    img.paste((255, 214, 120), mask=glow.filter(ImageFilter.GaussianBlur(50)).point(lambda v: int(v * 0.55)))
    d = ImageDraw.Draw(img)
    d.ellipse([540 - 140, 360 - 140, 540 + 140, 360 + 140], outline=GOLD_L, width=5)
    d.ellipse([435, 540, 645, 630], fill=GOLD)                        # chân kiết già
    d.polygon([(455, 570), (478, 330), (602, 330), (625, 570)], fill=GOLD)  # thân
    d.ellipse([503, 238, 577, 330], fill=GOLD_L)                      # đầu
    d.ellipse([524, 212, 556, 246], fill=GOLD)                        # nhục kế
    for i in range(-4, 5):                                            # đài sen
        d.ellipse([540 + i * 24 - 20, 612, 540 + i * 24 + 20, 664], fill=(230, 140, 160) if i % 2 else GOLD)

    # bàn thờ trước tượng
    d.rectangle([410, 662, 670, 698], fill=RED_D, outline=GOLD, width=2)
    for x in (430, 452, 628, 650):                                    # nến
        d.rectangle([x - 2, 640, x + 2, 664], fill=CREAM)
        d.ellipse([x - 5, 631, x + 5, 643], fill=GOLD_L)
    for x in (490, 590):                                              # bình sen
        d.ellipse([x - 12, 636, x + 12, 664], fill=(236, 150, 180))

    # 3 hàng nệm danh dự sát bàn thờ, chừa lối giữa
    for yc in VIP_ROWS:
        s = scale(yc)
        nw, nh = 30 * s, 10 * s
        for x0 in range(350, 735, 30):
            x = at(x0, b, yc)
            if abs(x - 540) < CARPET * (yc - VP[1]) + nw * 0.8:
                continue
            d.ellipse([x - nw / 2, yc - nh / 2 + 1, x + nw / 2, yc + nh / 2 + 1], fill=(90, 14, 10))
            d.ellipse([x - nw / 2, yc - nh / 2, x + nw / 2, yc + nh / 2], fill=(176, 34, 26))

    # đỉnh hương (lư đồng 3 chân) trên thảm ngay trước bàn thờ
    cx, cy = CENSER
    s = 0.62
    d.ellipse([cx - 44 * s, cy + 2, cx + 44 * s, cy + 12 * s], fill=(60, 30, 12))
    for lx in (-22, 0, 22):
        d.rectangle([cx + lx * s - 3, cy - 22 * s, cx + lx * s + 3, cy], fill=(120, 80, 30))
    d.ellipse([cx - 34 * s, cy - 54 * s, cx + 34 * s, cy - 18 * s], fill=(150, 100, 40))
    d.ellipse([cx - 34 * s, cy - 60 * s, cx + 34 * s, cy - 46 * s], fill=(196, 140, 60))
    for k in range(-3, 4):
        x = cx + k * 5 * s
        d.line([(x, cy - 56 * s), (x + k * s, cy - 92 * s)], fill=(190, 60, 40), width=2)
        d.ellipse([x + k * s - 2, cy - 95 * s, x + k * s + 2, cy - 91 * s], fill=(255, 140, 60))

    # 8 cặp cột đỏ, xa nhỏ gần to (vẽ từ xa tới gần để cột gần đè cột xa)
    for yb in COL_Y:
        s, top = scale(yb), ceiling_y(yb)
        for x_back in COL_X:
            x = at(x_back, b, yb)
            w = 22 * s
            d.rectangle([x - w / 2, top, x + w / 2, yb], fill=(150, 26, 18))
            d.rectangle([x - w / 2, top, x - w / 5, yb], fill=(112, 16, 10))
            d.rectangle([x - w / 2 - 2 * s, yb - 10 * s, x + w / 2 + 2 * s, yb], fill=GOLD)
            d.rectangle([x - w / 2 - 2 * s, top, x + w / 2 + 2 * s, top + 8 * s], fill=GOLD)
            # đèn lồng treo phía trong hàng cột, nhỏ dần vào trong
            side = 1 if x_back < 540 else -1
            lx, ly, lr = x + side * 46 * s, top + 70 * s, 9 * s
            if 0 < ly < H:
                d.line([(lx, max(0, top)), (lx, ly - lr * 1.3)], fill=(60, 20, 8), width=max(1, int(s)))
                d.ellipse([lx - lr, ly - lr * 1.3, lx + lr, ly + lr * 1.3], fill=(240, 120, 40))

    # sương ấm: phần xa mờ và sáng nhẹ (độ sâu không khí)
    haze = Image.new("L", (W, H), 0)
    hd = ImageDraw.Draw(haze)
    for yy in range(H):
        a = max(0.0, 1 - abs(yy - 560) / 520) ** 1.6
        hd.line([(0, yy), (W, yy)], fill=int(95 * a))
    img.paste((255, 214, 150), mask=haze.filter(ImageFilter.GaussianBlur(30)))

    # tia nắng chéo từ cửa sổ cao
    rays = Image.new("L", (W, H), 0)
    rd = ImageDraw.Draw(rays)
    for x0 in (250, 360, 720, 830):
        sgn = 1 if x0 < 540 else -1
        rd.polygon([(x0, 0), (x0 + 40, 0), (x0 + sgn * 300 + 50, 1350), (x0 + sgn * 300, 1350)], fill=55)
    img.paste((255, 225, 160), mask=rays.filter(ImageFilter.GaussianBlur(22)))
    return img


OUT.mkdir(parents=True, exist_ok=True)
make().save(OUT / "layout-guide.png")
print("đã ghi", OUT / "layout-guide.png")
