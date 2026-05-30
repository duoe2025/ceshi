/* ============================================================
 * Painter.ts — IPainter 的 Cocos 实现：把「屏幕坐标(左上原点, y 向下)」
 * 适配到 Cocos Graphics（局部坐标, 原点在节点中心, y 向上）。
 * 颜色用 hex 字符串，内部转成 cc.Color 并缓存。
 * ============================================================ */

import { Color, Graphics } from 'cc';
import { IPainter } from './IPainter';

const colorCache: Record<string, Color> = {};
export function toColor(hex: string): Color {
  if (!colorCache[hex]) colorCache[hex] = new Color().fromHEX(hex);
  return colorCache[hex];
}

export class Painter implements IPainter {
  g: Graphics;
  private W: number;
  private H: number;

  constructor(g: Graphics, viewW: number, viewH: number) {
    this.g = g;
    this.W = viewW;
    this.H = viewH;
  }

  clear(): void { this.g.clear(); }

  // 屏幕(左上原点)→ 节点局部(中心原点, y 向上)
  private lx(sx: number): number { return sx - this.W / 2; }
  private ly(sy: number): number { return this.H / 2 - sy; }

  fillRect(sx: number, sy: number, w: number, h: number, color: string): void {
    if (w <= 0 || h <= 0) return;
    this.g.fillColor = toColor(color);
    this.g.rect(this.lx(sx), this.ly(sy + h), w, h);
    this.g.fill();
  }

  fillCircle(sx: number, sy: number, r: number, color: string): void {
    if (r <= 0) return;
    this.g.fillColor = toColor(color);
    this.g.circle(this.lx(sx), this.ly(sy), r);
    this.g.fill();
  }

  fillEllipse(sx: number, sy: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0) return;
    this.g.fillColor = toColor(color);
    this.g.ellipse(this.lx(sx), this.ly(sy), rx, ry);
    this.g.fill();
  }

  fillPoly(pts: Array<[number, number]>, color: string): void {
    if (pts.length < 3) return;
    this.g.fillColor = toColor(color);
    this.g.moveTo(this.lx(pts[0][0]), this.ly(pts[0][1]));
    for (let i = 1; i < pts.length; i++) this.g.lineTo(this.lx(pts[i][0]), this.ly(pts[i][1]));
    this.g.close();
    this.g.fill();
  }

  strokeCircle(sx: number, sy: number, r: number, lineWidth: number, color: string): void {
    if (r <= 0) return;
    this.g.lineWidth = lineWidth;
    this.g.strokeColor = toColor(color);
    this.g.circle(this.lx(sx), this.ly(sy), r);
    this.g.stroke();
  }

  strokeArc(sx: number, sy: number, r: number, a0: number, a1: number,
    lineWidth: number, color: string): void {
    if (r <= 0) return;
    this.g.lineWidth = lineWidth;
    this.g.strokeColor = toColor(color);
    // 屏幕 y 向下；Graphics y 向上。镜像 y => 角度取负、方向反转。
    this.g.arc(this.lx(sx), this.ly(sy), r, -a0, -a1, true);
    this.g.stroke();
  }
}

// rgba 帮助函数从 IPainter 复用
export { rgba } from './IPainter';
