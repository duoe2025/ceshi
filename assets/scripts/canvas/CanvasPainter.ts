/* ============================================================
 * CanvasPainter.ts — IPainter 的 Canvas 2D 实现。
 * Canvas 原生就是屏幕坐标（左上原点, y 向下），无需坐标变换。
 * 颜色用 hex 字符串（'#rrggbb' / '#rrggbbaa'，现代浏览器与微信均支持）。
 * 同时被浏览器版与微信小游戏版复用。
 * ============================================================ */

import { IPainter } from '../IPainter';

// 兼容浏览器与微信小游戏的 2D 上下文（仅用到的子集）
export interface Ctx2D {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw?: boolean): void;
}

// 把 #rrggbbaa 转成 rgba() 函数式写法（微信 2D canvas 对 8 位 hex 兼容性不稳，rgba() 通用）
const cssCache: Record<string, string> = {};
export function cssColor(hex: string): string {
  if (hex.length !== 9 || hex[0] !== '#') return hex;
  if (!cssCache[hex]) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = parseInt(hex.slice(7, 9), 16) / 255;
    cssCache[hex] = `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return cssCache[hex];
}

export class CanvasPainter implements IPainter {
  ctx: Ctx2D;
  constructor(ctx: Ctx2D) { this.ctx = ctx; }

  clear(): void { /* 由上层每帧 fillRect 背景覆盖 */ }

  fillRect(sx: number, sy: number, w: number, h: number, color: string): void {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = cssColor(color);
    this.ctx.fillRect(sx, sy, w, h);
  }

  fillCircle(sx: number, sy: number, r: number, color: string): void {
    if (r <= 0) return;
    this.ctx.fillStyle = cssColor(color);
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  fillEllipse(sx: number, sy: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0) return;
    this.ctx.fillStyle = cssColor(color);
    this.ctx.beginPath();
    this.ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  fillPoly(pts: Array<[number, number]>, color: string): void {
    if (pts.length < 3) return;
    this.ctx.fillStyle = cssColor(color);
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) this.ctx.lineTo(pts[i][0], pts[i][1]);
    this.ctx.closePath();
    this.ctx.fill();
  }

  strokeCircle(sx: number, sy: number, r: number, lineWidth: number, color: string): void {
    if (r <= 0) return;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = cssColor(color);
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  strokeArc(sx: number, sy: number, r: number, a0: number, a1: number,
    lineWidth: number, color: string): void {
    if (r <= 0) return;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = cssColor(color);
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, r, a0, a1); // 屏幕系顺时针为正，与 Canvas 默认一致
    this.ctx.stroke();
  }
}
