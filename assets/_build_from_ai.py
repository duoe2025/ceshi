#!/usr/bin/env python3
"""
_build_from_ai.py — 把 assets/src/ 下的 AI 原始素材切片/去背/对齐，
烤成符合 assets.js 清单规范的运行时图集。

当前会生成：
- tileset.png（6x2，cell=64）
- david.png（walk，6x4，cell=64）
- david_sling.png（6x4，cell=64）
- david_staff.png（6x4，cell=64）
- david_harp.png（4x4，cell=64）
- david_hurt.png（2x4，cell=64）

依赖：Pillow、numpy。重新生成只需把新素材放进 assets/src/ 同名文件后运行：
    python3 assets/_build_from_ai.py
"""
import os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
CELL = 64


# ---------- 通用工具 ----------

def keyout_white(im, thr=232):
    """从四边洪泛去掉近白背景，返回 RGBA（保留角色内部的白色高光）。"""
    im = im.convert("RGBA")
    a = np.array(im)
    h, w = a.shape[:2]
    whitish = (a[:, :, 0] >= thr) & (a[:, :, 1] >= thr) & (a[:, :, 2] >= thr)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if whitish[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if whitish[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and whitish[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    a[seen, 3] = 0
    return Image.fromarray(a, "RGBA")


def content_bbox(im, athr=16):
    a = np.array(im.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(a > athr)
    if len(xs) == 0:
        return None
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)


def place_bottom_center(sprite, cell=CELL, pad=2, max_frac=1.0, scale=None):
    """把已去背的精灵缩放后水平居中、底部对齐放进 cell×cell 透明画布。"""
    bb = content_bbox(sprite)
    if bb:
        sprite = sprite.crop(bb)
    if scale is None:
        scale = min((cell - pad * 2) / sprite.width, (cell * max_frac) / sprite.height)
    nw, nh = max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))
    sprite = sprite.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    canvas.alpha_composite(sprite, ((cell - nw) // 2, cell - pad - nh))
    return canvas


def center_square(im, cell=CELL, inset=4):
    """从全幅地面纹理裁中央正方形并缩放到 cell（用于无缝地面）。"""
    im = im.convert("RGBA")
    s = min(im.width, im.height) - inset * 2
    l = (im.width - s) // 2
    t = (im.height - s) // 2
    return im.crop((l, t, l + s, t + s)).resize((cell, cell), Image.LANCZOS)


def components(path, athresh=40, min_area=400):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)[:, :, 3]
    mask = a > athresh
    H, W = mask.shape
    seen = np.zeros((H, W), bool)
    boxes = []
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not seen[y, x]:
                q = deque([(y, x)])
                seen[y, x] = True
                minx = maxx = x
                miny = maxy = y
                area = 0
                while q:
                    cy, cx = q.popleft()
                    area += 1
                    minx = min(minx, cx)
                    maxx = max(maxx, cx)
                    miny = min(miny, cy)
                    maxy = max(maxy, cy)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if area >= min_area:
                    boxes.append((minx, miny, maxx + 1, maxy + 1))
    boxes.sort(key=lambda b: (round(b[1] / 80), b[0]))
    return im, boxes


def blobs(im, athresh=24, min_area=120):
    """返回 [(cx, cy, minx, miny, maxx, maxy)]，按连通域聚类（容忍 AI 图非等格漂移）。"""
    a = np.array(im)[:, :, 3]
    mask = a > athresh
    H, W = mask.shape
    seen = np.zeros((H, W), bool)
    out = []
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not seen[y, x]:
                q = deque([(y, x)])
                seen[y, x] = True
                xs = ys = 0
                n = 0
                minx = maxx = x
                miny = maxy = y
                while q:
                    cy, cx = q.popleft()
                    n += 1
                    xs += cx
                    ys += cy
                    minx = min(minx, cx)
                    maxx = max(maxx, cx)
                    miny = min(miny, cy)
                    maxy = max(maxy, cy)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if n >= min_area:
                    out.append((xs / n, ys / n, minx, miny, maxx + 1, maxy + 1))
    return out


def merge_to_grid(keyed, cols, rows):
    W, H = keyed.size
    grid = {}
    for cx, cy, minx, miny, maxx, maxy in blobs(keyed):
        c = min(cols - 1, max(0, int(cx // (W / cols))))
        r = min(rows - 1, max(0, int(cy // (H / rows))))
        if (r, c) in grid:
            ox0, oy0, ox1, oy1 = grid[(r, c)]
            grid[(r, c)] = (min(ox0, minx), min(oy0, miny), max(ox1, maxx), max(oy1, maxy))
        else:
            grid[(r, c)] = (minx, miny, maxx, maxy)
    return grid


def build_sheet(src_name, out_name, cols, rows, max_frac=0.96):
    src = Image.open(os.path.join(SRC, src_name))
    keyed = keyout_white(src)
    grid = merge_to_grid(keyed, cols, rows)
    heights = sorted(bb[3] - bb[1] for bb in grid.values())
    med_h = heights[len(heights) // 2]
    uni_scale = (CELL * max_frac) / med_h
    out = Image.new("RGBA", (cols * CELL, rows * CELL), (0, 0, 0, 0))
    for (r, c), bb in grid.items():
        sprite = keyed.crop(bb)
        out.alpha_composite(place_bottom_center(sprite, pad=2, scale=uni_scale), (c * CELL, r * CELL))
    out.save(os.path.join(HERE, out_name))
    print(out_name, out.size, "figures", len(grid))


# ---------- 地图 tileset.png（6 列 × 2 行） ----------

def build_tileset():
    img, boxes = components(os.path.join(SRC, "tileset_world.png"))

    def crop(i):
        return img.crop(boxes[i])

    # 0 草 1 干草 2 土路 3 石板 4 水 | 5 矮墙 6 高墙 7 栅栏 8 井 9 帐篷
    # 10 树 11 棕榈 12 石堆 13 灌木 14 花丛 | 15 仙人掌 16 灌丛 17 篝火 18 灌木 19 宝箱
    grass = center_square(crop(0))
    drygrass = center_square(crop(1))
    path = center_square(crop(2))
    cobble = center_square(crop(3))

    def on_grass(obj_idx, max_frac=0.96, pad=2):
        base = grass.copy()
        base.alpha_composite(place_bottom_center(crop(obj_idx), pad=pad, max_frac=max_frac))
        return base

    tgrass = grass.copy()
    tgrass.alpha_composite(place_bottom_center(crop(16), pad=4, max_frac=0.8))
    flower = grass.copy()
    flower.alpha_composite(place_bottom_center(crop(14), pad=4, max_frac=0.8))

    cave = cobble.copy()
    d = ImageDraw.Draw(cave)
    d.ellipse([CELL * 0.22, CELL * 0.28, CELL * 0.78, CELL * 0.92], fill=(18, 14, 20, 255))
    d.ellipse([CELL * 0.30, CELL * 0.40, CELL * 0.70, CELL * 0.92], fill=(8, 6, 10, 255))

    tiles = {
        (0, 0): grass,
        (1, 0): tgrass,
        (2, 0): flower,
        (3, 0): path,
        (4, 0): drygrass,
        (5, 0): cobble,
        (0, 1): on_grass(10),
        (1, 1): on_grass(12),
        (2, 1): on_grass(7),
        (3, 1): on_grass(8),
        (4, 1): on_grass(9),
        (5, 1): cave,
    }
    out = Image.new("RGBA", (6 * CELL, 2 * CELL), (0, 0, 0, 0))
    for (c, r), tile in tiles.items():
        out.alpha_composite(tile, (c * CELL, r * CELL))
    out.save(os.path.join(HERE, "tileset.png"))
    print("tileset.png", out.size)


if __name__ == "__main__":
    build_tileset()
    build_sheet("david_walk_6x4.png", "david.png", cols=6, rows=4)
    build_sheet("david_sling_6x4.png", "david_sling.png", cols=6, rows=4)
    build_sheet("david_staff_6x4.png", "david_staff.png", cols=6, rows=4)
    build_sheet("david_harp_4x4.png", "david_harp.png", cols=4, rows=4)
    build_sheet("david_hurt_2x4.png", "david_hurt.png", cols=2, rows=4, max_frac=0.92)
