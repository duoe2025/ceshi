/* ============================================================
 * PhaserText.ts — ITextLayer 的 Phaser 原生实现（池化 Phaser.Text）。
 * 即时模式接口（每帧重画）映射到保留模式的 Text 对象池：begin() 复位游标，
 * text() 取/复用一个 Text，end() 隐藏多余的。文本对象 depth 高于 Graphics，
 * 保证标签/HUD 始终压在图元之上。measureText 用一个离屏 2D canvas 量取（快）。
 * ============================================================ */

import Phaser from 'phaser';
import { ITextLayer, TextAlign, TextBaseline } from '../ITextLayer';

/** '#rrggbbaa' → ['#rrggbb', alpha0..1]；'#rrggbb' → 原样, 1 */
function splitColor(hex: string): [string, number] {
  if (hex.length >= 9 && hex[0] === '#') {
    return [hex.slice(0, 7), parseInt(hex.slice(7, 9), 16) / 255];
  }
  return [hex, 1];
}

export class PhaserTextLayer implements ITextLayer {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Text[] = [];
  private cursor = 0;
  private depth: number;
  private measureCtx: CanvasRenderingContext2D | null;

  constructor(scene: Phaser.Scene, depth = 10) {
    this.scene = scene;
    this.depth = depth;
    const cv = document.createElement('canvas');
    this.measureCtx = cv.getContext('2d');
  }

  /** 每帧开始：复位池游标。 */
  begin(): void { this.cursor = 0; }

  /** 每帧结束：隐藏未使用的文本对象。 */
  end(): void {
    for (let i = this.cursor; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }

  private acquire(): Phaser.GameObjects.Text {
    let t = this.pool[this.cursor];
    if (!t) {
      t = this.scene.add.text(0, 0, '', { fontFamily: 'sans-serif' });
      t.setDepth(this.depth);
      this.pool[this.cursor] = t;
    }
    this.cursor++;
    return t;
  }

  text(str: string, x: number, y: number, size: number, color: string,
    align: TextAlign, baseline: TextBaseline): void {
    const t = this.acquire();
    const [css, alpha] = splitColor(color);
    t.setVisible(true);
    t.setFontSize(size);
    t.setColor(css);
    t.setAlpha(alpha);
    t.setOrigin(align === 'center' ? 0.5 : 0, baseline === 'middle' ? 0.5 : 0);
    t.setPosition(x, y);
    if (t.text !== str) t.setText(str);
  }

  measureText(str: string, size: number): number {
    if (!this.measureCtx) return str.length * size * 0.6;
    this.measureCtx.font = `${size}px sans-serif`;
    return this.measureCtx.measureText(str).width;
  }
}
