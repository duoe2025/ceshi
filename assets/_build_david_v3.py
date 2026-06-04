#!/usr/bin/env python3
"""
_build_david_v3.py — 把 assets/src/david_v3/ 下的「纯品红底 + 等格」大卫精灵表
抠成真透明 PNG，保留原始 96px 等格网格（不做连通域重排，避免帧抖动），
输出到 assets/ 供 assets.js 直接使用。

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


def build(name, cols, rows=4):
    src = Image.open(os.path.join(SRC, name))
    keyed = keyout_magenta(src)
    # 校验等格
    w, h = keyed.size
    if w % cols or h % rows:
        print(f"  ! {name} {w}x{h} 非整除 {cols}x{rows}，按比例缩放对齐")
        cw, ch = w // cols, h // rows
        keyed = keyed.crop((0, 0, cw * cols, ch * rows))
    keyed.save(os.path.join(HERE, name))
    print(f"{name:18s} {keyed.size} cols={cols} rows={rows}")


if __name__ == "__main__":
    for name, cols in SHEETS.items():
        build(name, cols)
    print("done.")
