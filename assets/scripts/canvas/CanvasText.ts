/* ============================================================
 * CanvasText.ts — ITextLayer 的 Canvas 2D 实现（fillText / measureText）。
 * 浏览器版与微信小游戏版共用（微信 2D 上下文同样支持这些方法）。
 * ============================================================ */

import { ITextLayer, TextAlign, TextBaseline } from '../ITextLayer';
import { cssColor } from './CanvasPainter';

// 文本能力的 2D 上下文（仅用到的子集）
export interface TextCtx {
  font: string;
  textAlign: string;
  textBaseline: string;
  fillStyle: string;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
}

export class CanvasTextLayer implements ITextLayer {
  private ctx: TextCtx;
  constructor(ctx: TextCtx) { this.ctx = ctx; }

  text(str: string, x: number, y: number, size: number, color: string,
    align: TextAlign, baseline: TextBaseline): void {
    const c = this.ctx;
    c.font = `${size}px sans-serif`;
    c.textAlign = align;
    c.textBaseline = baseline;
    c.fillStyle = cssColor(color);
    c.fillText(str, x, y);
  }

  measureText(str: string, size: number): number {
    this.ctx.font = `${size}px sans-serif`;
    return this.ctx.measureText(str).width;
  }
}
