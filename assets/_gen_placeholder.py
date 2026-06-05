#!/usr/bin/env python3
"""
生成「占位」素材，用于跑通 js/assets.js 的图片渲染管线。
这些是程序员占位图(programmer art)，仅证明管线可用 —— 请用真美术按相同
网格/布局替换 tileset.png 与 david.png（见 assets/README.md 的规范）。

布局必须与 js/assets.js 的 manifest 一致：
  tileset.png : 6 列 x 2 行，每格 48px
                行0: GRASS TGRASS FLOWER PATH FOLD HILL
                行1: TREE  ROCK   FENCE  WELL HOUSE CAVE
  david.png   : 2 列 x 4 行，每格 48px
                行 = 朝向 down/left/right/up，列 = 行走帧 0/1
"""
from PIL import Image, ImageDraw

CELL = 48


def new_sheet(cols, rows):
    return Image.new("RGBA", (cols * CELL, rows * CELL), (0, 0, 0, 0))


def cell_box(c, r):
    return (c * CELL, r * CELL)


# ---------------- tileset ----------------
def fill(d, ox, oy, color):
    d.rectangle([ox, oy, ox + CELL - 1, oy + CELL - 1], fill=color)


def speckle(d, ox, oy, color, pts):
    for (px, py, s) in pts:
        d.rectangle([ox + px, oy + py, ox + px + s, oy + py + s], fill=color)


def gen_tileset():
    img = new_sheet(6, 2)
    d = ImageDraw.Draw(img)
    GRASS = (106, 168, 79, 255)

    def base_grass(ox, oy):
        fill(d, ox, oy, GRASS)

    # 行0
    ox, oy = cell_box(0, 0); base_grass(ox, oy)  # GRASS
    speckle(d, ox, oy, (93, 154, 69, 255), [(8, 14, 3), (30, 32, 3), (36, 9, 2)])

    ox, oy = cell_box(1, 0); base_grass(ox, oy)  # TGRASS
    for i in range(6):
        d.rectangle([ox + 6 + i * 7, oy + 26 - (i % 2) * 6, ox + 8 + i * 7, oy + 40], fill=(79, 138, 58, 255))

    ox, oy = cell_box(2, 0); base_grass(ox, oy)  # FLOWER
    d.rectangle([ox + 12, oy + 14, ox + 18, oy + 20], fill=(227, 210, 74, 255))
    d.rectangle([ox + 28, oy + 28, ox + 34, oy + 34], fill=(224, 111, 156, 255))

    ox, oy = cell_box(3, 0); fill(d, ox, oy, (194, 168, 120, 255))  # PATH
    speckle(d, ox, oy, (179, 152, 102, 255), [(8, 10, 5), (28, 24, 6), (16, 34, 4)])

    ox, oy = cell_box(4, 0); fill(d, ox, oy, (203, 176, 131, 255))  # FOLD
    speckle(d, ox, oy, (191, 161, 114, 255), [(9, 18, 8), (27, 32, 8)])

    ox, oy = cell_box(5, 0); fill(d, ox, oy, (143, 127, 95, 255))   # HILL
    d.rectangle([ox + 6, oy + 9, ox + 21, oy + 18], fill=(125, 111, 82, 255))
    d.rectangle([ox + 26, oy + 24, ox + 41, oy + 33], fill=(125, 111, 82, 255))

    # 行1（物体瓦片：先铺草地，再画物体）
    ox, oy = cell_box(0, 1); base_grass(ox, oy)  # TREE
    d.rectangle([ox + 20, oy + 28, ox + 28, oy + 46], fill=(90, 59, 34, 255))
    d.ellipse([ox + 8, oy + 4, ox + 40, oy + 34], fill=(47, 107, 47, 255))
    d.ellipse([ox + 12, oy + 8, ox + 30, oy + 24], fill=(79, 168, 79, 255))

    ox, oy = cell_box(1, 1); base_grass(ox, oy)  # ROCK
    d.polygon([(ox + 9, oy + 40), (ox + 16, oy + 14), (ox + 33, oy + 13), (ox + 40, oy + 40)], fill=(140, 140, 148, 255))
    d.rectangle([ox + 18, oy + 20, ox + 27, oy + 26], fill=(168, 168, 176, 255))

    ox, oy = cell_box(2, 1); base_grass(ox, oy)  # FENCE
    d.rectangle([ox + 6, oy + 12, ox + 12, oy + 42], fill=(122, 82, 48, 255))
    d.rectangle([ox + 36, oy + 12, ox + 42, oy + 42], fill=(122, 82, 48, 255))
    d.rectangle([ox, oy + 18, ox + CELL, oy + 24], fill=(138, 96, 56, 255))
    d.rectangle([ox, oy + 32, ox + CELL, oy + 38], fill=(138, 96, 56, 255))

    ox, oy = cell_box(3, 1); base_grass(ox, oy)  # WELL
    d.rectangle([ox + 9, oy + 18, ox + 39, oy + 42], fill=(125, 125, 134, 255))
    d.rectangle([ox + 14, oy + 22, ox + 34, oy + 38], fill=(43, 58, 85, 255))
    d.rectangle([ox + 6, oy + 4, ox + 42, oy + 10], fill=(138, 96, 56, 255))

    ox, oy = cell_box(4, 1); base_grass(ox, oy)  # HOUSE
    d.rectangle([ox + 4, oy + 22, ox + 44, oy + 46], fill=(202, 164, 114, 255))
    d.polygon([(ox + 2, oy + 23), (ox + 24, oy + 4), (ox + 46, oy + 23)], fill=(168, 65, 47, 255))
    d.rectangle([ox + 19, oy + 30, ox + 29, oy + 46], fill=(90, 59, 34, 255))

    ox, oy = cell_box(5, 1); fill(d, ox, oy, (143, 127, 95, 255))   # CAVE
    d.rectangle([ox + 3, oy + 3, ox + 45, oy + 45], fill=(107, 93, 68, 255))
    d.ellipse([ox + 12, oy + 16, ox + 36, oy + 46], fill=(18, 13, 8, 255))

    img.save("assets/tileset.png")
    print("wrote assets/tileset.png", img.size)


# ---------------- david（4 朝向 x 2 帧）----------------
ROBE = (224, 214, 178, 255)
SKIN = (228, 184, 140, 255)
HAIR = (90, 59, 34, 255)
SASH = (90, 120, 170, 255)
BOOT = (107, 74, 43, 255)


def draw_david(d, ox, oy, facing, frame):
    cx = ox + CELL // 2
    # 腿（行走时左右摆动）
    swing = 3 if frame == 1 else -3
    d.rectangle([cx - 7, oy + 36, cx - 2, oy + 45], fill=BOOT)
    d.rectangle([cx + 2, oy + 36, cx + 7, oy + 45], fill=BOOT)
    if facing in ("left", "right"):
        d.rectangle([cx - 6 + swing, oy + 38, cx - 1 + swing, oy + 46], fill=BOOT)
        d.rectangle([cx + 1 - swing, oy + 38, cx + 6 - swing, oy + 46], fill=BOOT)
    # 身体长袍
    d.rectangle([cx - 9, oy + 18, cx + 9, oy + 38], fill=ROBE)
    # 斜挎带
    d.line([(cx - 8, oy + 20), (cx + 8, oy + 34)], fill=SASH, width=3)
    # 头
    d.ellipse([cx - 8, oy + 4, cx + 8, oy + 20], fill=SKIN)
    # 头发
    d.rectangle([cx - 9, oy + 3, cx + 9, oy + 9], fill=HAIR)
    d.rectangle([cx - 9, oy + 3, cx - 5, oy + 14], fill=HAIR)
    d.rectangle([cx + 5, oy + 3, cx + 9, oy + 14], fill=HAIR)
    # 朝向提示：眼睛/背面
    eye = (40, 30, 20, 255)
    if facing == "down":
        d.rectangle([cx - 5, oy + 12, cx - 3, oy + 14], fill=eye)
        d.rectangle([cx + 3, oy + 12, cx + 5, oy + 14], fill=eye)
    elif facing == "left":
        d.rectangle([cx - 6, oy + 12, cx - 4, oy + 14], fill=eye)
    elif facing == "right":
        d.rectangle([cx + 4, oy + 12, cx + 6, oy + 14], fill=eye)
    # up: 背对，无眼睛


def gen_david():
    img = new_sheet(2, 4)
    d = ImageDraw.Draw(img)
    rows = ["down", "left", "right", "up"]
    for r, facing in enumerate(rows):
        for c in range(2):
            ox, oy = cell_box(c, r)
            draw_david(d, ox, oy, facing, c)
    img.save("assets/david.png")
    print("wrote assets/david.png", img.size)


if __name__ == "__main__":
    gen_tileset()
    gen_david()
