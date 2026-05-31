/* ============================================================
 * ITextLayer.ts — 引擎无关的文本绘制接口（屏幕坐标：左上原点, y 向下）。
 * 与 IPainter（图元）配对：图元走 Graphics/Canvas，文本走各引擎的文本对象。
 * 由 CanvasTextLayer（Canvas 2D fillText）与 PhaserTextLayer（池化 Phaser.Text）实现。
 * ============================================================ */

export type TextAlign = 'left' | 'center';
export type TextBaseline = 'top' | 'middle';

export interface ITextLayer {
  /** 绘制一行文本。color 为 '#rrggbb' 或 '#rrggbbaa'。 */
  text(str: string, x: number, y: number, size: number, color: string,
    align: TextAlign, baseline: TextBaseline): void;
  /** 量取文本宽度（像素），用于自动换行。 */
  measureText(str: string, size: number): number;
}
