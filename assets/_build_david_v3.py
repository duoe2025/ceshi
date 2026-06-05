#!/usr/bin/env python3
"""
_build_david_v3.py — 把 assets/src/david_v3/ 下的「纯品红底 + 等格」大卫精灵表
抠成真透明 PNG，保留原始 96px 等格网格（不做连通域重排，避免帧抖动），
再做「按脚底自动对齐」消除逐帧漂移（角色飘逸），输出到 assets/ 供 assets.js 直接使用。

对齐说明：AI 出图时常把角色在格子里逐帧平移（像在走位），原地循环就会“飘”。
这里对每一行（同朝向的若干帧）取脚底质心的中位数为锚点，把每帧整体平移到
该锚点（中位数最省位移、几乎不会把肢体推出格子），脚底站稳、循环不再漂。

源表规格（AI 按命令生成）：cell 96、4 行=下/左/右/上、纯品红 #FF00FF 实色底。
列数：walk/run/sling/staff=6，idle/harp/pray/down=4，hurt=2。

依赖：Pillow、numpy。重生成只需替换 src 同名文件后运行：
    python3 assets/_build_david_v3.py
"""
import os
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src", "david_v3")

# 文件名 -> 列数（行固定 4）
SHEETS = {
    "david.png": 6,
    "david_run.png": 6,
    "david_sling.png": 6,
    "david_staff.png": 6,
    "david_idle.png": 4,
    "david_harp.png": 4,
    "david_pray.png": 4,
    "david_down.png": 4,
    "david_hurt.png": 2,
}


def keyout_magenta(im):
    """从四边洪泛去掉纯品红背景 + 去边缘品红溢色，返回真透明 RGBA。"""
    im = im.convert("RGBA")
    a = np.array(im).astype(np.int16)
    h, w = a.shape[:2]
    R, Gc, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    # 品红判定：红蓝高、绿低
    mag = (R > 150) & (B > 150) & (Gc < 120)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mag[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mag[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and mag[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    out = np.array(im)
    out[seen, 3] = 0
    # 去溢色（despill）：保留的边缘像素若仍偏品红（红蓝明显高于绿），把红蓝压到绿附近
    keep = ~seen
    pink = keep & (R > Gc + 28) & (B > Gc + 28)
    g = out[:, :, 1].astype(np.int16)
    out[:, :, 0] = np.where(pink, np.minimum(out[:, :, 0], g + 24), out[:, :, 0])
    out[:, :, 2] = np.where(pink, np.minimum(out[:, :, 2], g + 24), out[:, :, 2])
    return Image.fromarray(out, "RGBA")


def _shift(cell, dx, dy):
    """把单帧整体平移 (dx,dy)，空出部分填透明（不环绕）。"""
    out = np.zeros_like(cell)
    h, w = cell.shape[:2]
    xs0, xd0 = max(0, dx), max(0, -dx)
    ys0, yd0 = max(0, dy), max(0, -dy)
    ww, hh = w - abs(dx), h - abs(dy)
    out[ys0:ys0 + hh, xs0:xs0 + ww] = cell[yd0:yd0 + hh, xd0:xd0 + ww]
    return out


def _foot_anchor(cell):
    """返回该帧的脚底锚点 (cx, bottom_y)：底部 14px 带内不透明像素的横向质心 + 最低行。"""
    a = cell[:, :, 3] > 16
    ys, xs = np.where(a)
    if len(ys) == 0:
        return cell.shape[1] / 2, cell.shape[0] - 1
    b = int(ys.max())
    band = a[max(0, b - 13):b + 1, :]
    by, bx = np.where(band)
    cx = bx.mean() if len(bx) else (xs.min() + xs.max()) / 2
    return cx, b


def align_feet(keyed, cols, rows=4):
    """逐行（同朝向）按脚底质心中位数对齐，消除原地循环时的漂移。"""
    im = np.array(keyed)
    H, W = im.shape[:2]
    cw, ch = W // cols, H // rows
    for r in range(rows):
        anchors = []
        for c in range(cols):
            cell = im[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
            anchors.append(_foot_anchor(cell))
        tx = float(np.median([a[0] for a in anchors]))
        ty = float(np.median([a[1] for a in anchors]))
        for c in range(cols):
            y0, x0 = r * ch, c * cw
            cell = im[y0:y0 + ch, x0:x0 + cw].copy()
            dx = int(round(tx - anchors[c][0]))
            dy = int(round(ty - anchors[c][1]))
            im[y0:y0 + ch, x0:x0 + cw] = _shift(cell, dx, dy)
    return Image.fromarray(im, "RGBA")


def build(name, cols, rows=4):
    src = Image.open(os.path.join(SRC, name))
    keyed = keyout_magenta(src)
    # 校验等格
    w, h = keyed.size
    if w % cols or h % rows:
        print(f"  ! {name} {w}x{h} 非整除 {cols}x{rows}，按比例缩放对齐")
        cw, ch = w // cols, h // rows
        keyed = keyed.crop((0, 0, cw * cols, ch * rows))
    keyed = align_feet(keyed, cols, rows)
    keyed.save(os.path.join(HERE, name))
    print(f"{name:18s} {keyed.size} cols={cols} rows={rows} (feet-aligned)")


if __name__ == "__main__":
    for name, cols in SHEETS.items():
        build(name, cols)
    print("done.")
