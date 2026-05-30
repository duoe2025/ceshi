/* ============================================================
 * Painter.ts — 把「屏幕坐标(左上原点, y 向下)」的 2D 绘制
 * 适配到 Cocos Graphics（局部坐标, 原点在节点中心, y 向上）。
 * 让我们能像原 Web 版的 Canvas 2D 那样按像素拼图。
 * ============================================================ */

import { Color, Graphics } from 'cc';

export class Painter {
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

  /** 实心矩形：屏幕坐标 (sx,sy) 为左上角 */
  fillRect(sx: number, sy: number, w: number, h: number, color: Color): void {
    if (w <= 0 || h <= 0) return;
    this.g.fillColor = color;
    // 局部左下角 = (sx-W/2, H/2-(sy+h))
    this.g.rect(this.lx(sx), this.ly(sy + h), w, h);
    this.g.fill();
  }

  /** 实心圆：屏幕圆心 (sx,sy) */
  fillCircle(sx: number, sy: number, r: number, color: Color): void {
    if (r <= 0) return;
    this.g.fillColor = color;
    this.g.circle(this.lx(sx), this.ly(sy), r);
    this.g.fill();
  }

  /** 实心椭圆 */
  fillEllipse(sx: number, sy: number, rx: number, ry: number, color: Color): void {
    if (rx <= 0 || ry <= 0) return;
    this.g.fillColor = color;
    this.g.ellipse(this.lx(sx), this.ly(sy), rx, ry);
    this.g.fill();
  }

  /** 实心多边形：点为屏幕坐标数组 [[x,y],...] */
  fillPoly(pts: Array<[number, number]>, color: Color): void {
    if (pts.length < 3) return;
    this.g.fillColor = color;
    this.g.moveTo(this.lx(pts[0][0]), this.ly(pts[0][1]));
    for (let i = 1; i < pts.length; i++) this.g.lineTo(this.lx(pts[i][0]), this.ly(pts[i][1]));
    this.g.close();
    this.g.fill();
  }

  /** 圆环描边 */
  strokeCircle(sx: number, sy: number, r: number, lineWidth: number, color: Color): void {
    if (r <= 0) return;
    this.g.lineWidth = lineWidth;
    this.g.strokeColor = color;
    this.g.circle(this.lx(sx), this.ly(sy), r);
    this.g.stroke();
  }

  /** 圆弧描边（角度按屏幕系：顺时针为正，与 Canvas 一致） */
  strokeArc(sx: number, sy: number, r: number, a0: number, a1: number,
    lineWidth: number, color: Color): void {
    if (r <= 0) return;
    this.g.lineWidth = lineWidth;
    this.g.strokeColor = color;
    // 屏幕 y 向下；Graphics y 向上。镜像 y => 角度取负、方向反转。
    this.g.arc(this.lx(sx), this.ly(sy), r, -a0, -a1, true);
    this.g.stroke();
  }
}

/** 便捷：从 0-255 RGBA 构造颜色 */
export function rgba(r: number, g: number, b: number, a = 255): Color {
  return new Color(r, g, b, a);
}
