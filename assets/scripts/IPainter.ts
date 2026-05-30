/* ============================================================
 * IPainter.ts — 引擎无关的 2D 绘制接口（屏幕坐标：左上原点, y 向下）。
 * 颜色一律用 hex 字符串（'#rrggbb' 或 '#rrggbbaa'），便于跨 Cocos / Canvas 复用。
 * 由 Painter（Cocos Graphics）与 CanvasPainter（Canvas 2D）分别实现。
 * ============================================================ */

export interface IPainter {
  clear(): void;
  fillRect(sx: number, sy: number, w: number, h: number, color: string): void;
  fillCircle(sx: number, sy: number, r: number, color: string): void;
  fillEllipse(sx: number, sy: number, rx: number, ry: number, color: string): void;
  fillPoly(pts: Array<[number, number]>, color: string): void;
  strokeCircle(sx: number, sy: number, r: number, lineWidth: number, color: string): void;
  strokeArc(sx: number, sy: number, r: number, a0: number, a1: number,
    lineWidth: number, color: string): void;
}

/** 把 0-255 RGBA 拼成 hex 字符串（含 alpha） */
export function rgba(r: number, g: number, b: number, a = 255): string {
  const h = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${h(a)}`;
}
