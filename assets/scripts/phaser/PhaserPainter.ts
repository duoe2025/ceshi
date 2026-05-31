/* ============================================================
 * PhaserPainter.ts — IPainter 的 Phaser 原生实现。
 * 用一个 Phaser.GameObjects.Graphics 承载全部图元（矩形/圆/椭圆/多边形/弧），
 * 走 Phaser 的 WebGL 渲染。每帧 begin() 清空后重绘（Graphics 为 WebGL 批渲染）。
 * 复用 Sprites.ts 的程序化像素画法，无需改动一行绘制代码。
 * ============================================================ */

import Phaser from 'phaser';
import { IPainter } from '../IPainter';

/** '#rrggbb' / '#rrggbbaa' → { color:0xRRGGBB, alpha:0..1 } */
function parseColor(hex: string): { color: number; alpha: number } {
  if (hex[0] !== '#') return { color: 0xffffff, alpha: 1 };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  return { color: (r << 16) | (g << 8) | b, alpha };
}

export class PhaserPainter implements IPainter {
  private g: Phaser.GameObjects.Graphics;
  constructor(g: Phaser.GameObjects.Graphics) { this.g = g; }

  /** 每帧渲染前清空（替代 2D canvas 的整屏覆盖）。 */
  begin(): void { this.g.clear(); }
  clear(): void { /* 由 begin() 每帧清空 */ }

  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    if (w <= 0 || h <= 0) return;
    const c = parseColor(color);
    this.g.fillStyle(c.color, c.alpha);
    this.g.fillRect(x, y, w, h);
  }

  fillCircle(x: number, y: number, r: number, color: string): void {
    if (r <= 0) return;
    const c = parseColor(color);
    this.g.fillStyle(c.color, c.alpha);
    this.g.fillCircle(x, y, r);
  }

  fillEllipse(x: number, y: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0) return;
    const c = parseColor(color);
    this.g.fillStyle(c.color, c.alpha);
    this.g.fillEllipse(x, y, rx * 2, ry * 2);
  }

  fillPoly(pts: Array<[number, number]>, color: string): void {
    if (pts.length < 3) return;
    const c = parseColor(color);
    this.g.fillStyle(c.color, c.alpha);
    this.g.fillPoints(pts.map(([x, y]) => ({ x, y })), true);
  }

  strokeCircle(x: number, y: number, r: number, lineWidth: number, color: string): void {
    if (r <= 0) return;
    const c = parseColor(color);
    this.g.lineStyle(lineWidth, c.color, c.alpha);
    this.g.strokeCircle(x, y, r);
  }

  strokeArc(x: number, y: number, r: number, a0: number, a1: number,
    lineWidth: number, color: string): void {
    if (r <= 0) return;
    const c = parseColor(color);
    this.g.lineStyle(lineWidth, c.color, c.alpha);
    this.g.beginPath();
    this.g.arc(x, y, r, a0, a1, false);
    this.g.strokePath();
  }
}
