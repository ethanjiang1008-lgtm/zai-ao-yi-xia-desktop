"""生成《Fish》应用图标：青蓝渐变圆角方块 + 鱼形 logo"""
from PIL import Image, ImageDraw, ImageFont
import os, math

OUT = os.path.join(os.path.dirname(__file__), "src-tauri", "icons")
os.makedirs(OUT, exist_ok=True)


def find_font():
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


FONT_PATH = find_font()


def draw_fish_icon(size):
    """绘制图标：青蓝渐变 + 白色鱼形
    鱼的设计：椭圆身体 + 三角尾 + 圆眼 + 弧线腮"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(size * 0.22)

    # 圆角方块背景渐变（青蓝→深蓝，水平方向）
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bg)
    for x in range(size):
        t = x / size
        # 浅青蓝 → 深湖蓝
        r = int(72 + (32 - 72) * t)
        g = int(199 + (108 - 199) * t)
        b = int(220 + (180 - 220) * t)
        bdraw.line([(x, 0), (x, size)], fill=(r, g, b, 255))

    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    bg.putalpha(mask)
    img = bg

    # 鱼的身体：椭圆
    fish_d = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(fish_d)
    cx, cy = size // 2, size // 2
    body_w = int(size * 0.50)
    body_h = int(size * 0.28)
    body_box = [cx - body_w, cy - body_h, cx + body_w, cy + body_h]
    fdraw.ellipse(body_box, fill=(255, 255, 255, 245))

    # 鱼尾：右三角（从身体右端张开）
    tail_w = int(size * 0.22)
    tail_h = int(size * 0.36)
    tail_box = [
        cx + body_w - int(size * 0.04),
        cy - tail_h // 2,
        cx + body_w - int(size * 0.04) + tail_w,
        cy + tail_h // 2,
    ]
    fdraw.polygon(tail_box, fill=(255, 255, 255, 240))

    # 鱼鳍：上方小三角
    fin_w = int(size * 0.10)
    fin_h = int(size * 0.14)
    fin_box = [
        cx - int(size * 0.05),
        cy - body_h,
        cx - int(size * 0.05) + fin_w,
        cy - body_h - fin_h,
        cx + int(size * 0.10),
        cy - body_h,
    ]
    fdraw.polygon(fin_box, fill=(255, 255, 255, 220))

    # 鱼眼：右上方小圆
    eye_r = max(2, int(size * 0.045))
    eye_x = cx + int(size * 0.12)
    eye_y = cy - int(size * 0.04)
    fdraw.ellipse([eye_x - eye_r, eye_y - eye_r, eye_x + eye_r, eye_y + eye_r],
                  fill=(32, 108, 180, 255))

    # 鱼嘴：右端小弧线
    mouth_y = cy + int(size * 0.04)
    mouth_x1 = cx + body_w - int(size * 0.02)
    mouth_x2 = cx + body_w + int(size * 0.02)
    fdraw.arc([mouth_x1, mouth_y - int(size * 0.04),
               mouth_x2, mouth_y + int(size * 0.04)],
              20, 160, fill=(32, 108, 180, 255), width=max(1, int(size * 0.015)))

    # 鱼鳃线
    gill_y1 = cy - int(size * 0.08)
    gill_y2 = cy + int(size * 0.08)
    gill_x = cx + int(size * 0.02)
    fdraw.line([(gill_x, gill_y1), (gill_x, gill_y2)],
               fill=(32, 108, 180, 180), width=max(1, int(size * 0.012)))

    # 鱼鳞点缀：身体上几个小白点（半透明）
    for sx, sy, sr in [
        (cx - int(size * 0.12), cy - int(size * 0.06), int(size * 0.022)),
        (cx - int(size * 0.05), cy + int(size * 0.05), int(size * 0.022)),
        (cx + int(size * 0.05), cy - int(size * 0.08), int(size * 0.020)),
    ]:
        fdraw.ellipse(
            [sx - sr, sy - sr, sx + sr, sy + sr],
            fill=(255, 255, 255, 90),
        )

    # 合成鱼到背景上
    img.alpha_composite(fish_d)

    return img


# 生成各尺寸 PNG
for size in [32, 128, 256]:
    name = "128x128@2x.png" if size == 256 else f"{size}x{size}.png"
    icon = draw_fish_icon(size)
    icon.save(os.path.join(OUT, name))
    print(f"saved {name} ({size}x{size})")

# 生成 ICO（多尺寸嵌入）
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_images = [draw_fish_icon(s[0]) for s in ico_sizes]
ico_images[0].save(
    os.path.join(OUT, "icon.ico"),
    format="ICO",
    sizes=ico_sizes,
)
print("saved icon.ico")

# 生成一个 square.png 作为通用（Tauri 默认也需要）
draw_fish_icon(512).save(os.path.join(OUT, "icon.png"))
print("saved icon.png (512)")
print("All icons generated in", OUT)
