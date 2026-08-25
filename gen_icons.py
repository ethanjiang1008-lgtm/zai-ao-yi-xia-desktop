"""生成《再熬一下》应用图标：深紫渐变圆角方块 + 白色 ¥ 符号"""
from PIL import Image, ImageDraw, ImageFont
import os

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

def draw_icon(size):
    """绘制图标：圆角渐变方块 + ¥"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 圆角方块背景渐变（从左上深紫到右下亮紫）
    radius = size // 5
    # 用多行水平条带模拟渐变
    for y in range(size):
        t = y / size
        r = int(27 + (139 - 27) * t)
        g = int(21 + (124 - 21) * t)
        b = int(48 + (246 - 48) * t)
        x0 = 0
        x1 = size
        # 裁剪圆角
        draw.line([(x0, y), (x1, y)], fill=(r, g, b, 255))

    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(mask)

    # 在渐变上重新画（alpha 混合后需要重画背景）
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / size
        r = int(27 + (139 - 27) * t)
        g = int(21 + (124 - 21) * t)
        b = int(48 + (246 - 48) * t)
        bdraw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    bg.putalpha(mask)

    # ¥ 符号
    draw2 = ImageDraw.Draw(bg)
    if FONT_PATH:
        font = ImageFont.truetype(FONT_PATH, int(size * 0.55))
    else:
        font = ImageFont.load_default()
    text = "¥"
    bbox = draw2.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    # 阴影
    draw2.text((x + 1, y + 2), text, font=font, fill=(0, 0, 0, 80))
    # 白色主体
    draw2.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    return bg

# 生成各尺寸 PNG
for size in [32, 128, 256]:
    name = "128x128@2x.png" if size == 256 else f"{size}x{size}.png"
    icon = draw_icon(size)
    icon.save(os.path.join(OUT, name))
    print(f"saved {name} ({size}x{size})")

# 生成 ICO（多尺寸嵌入）
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_images = [draw_icon(s[0]) for s in ico_sizes]
ico_images[0].save(
    os.path.join(OUT, "icon.ico"),
    format="ICO",
    sizes=ico_sizes,
)
print("saved icon.ico")

# 生成一个 square.png 作为通用（Tauri 默认也需要）
draw_icon(512).save(os.path.join(OUT, "icon.png"))
print("saved icon.png (512)")
print("All icons generated in", OUT)
