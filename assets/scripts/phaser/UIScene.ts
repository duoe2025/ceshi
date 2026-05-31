/* ============================================================
 * UIScene.ts — 屏幕层场景（HUD / 对白 / 面板 / 提示 / 结算）。
 * 叠在 WorldScene 之上，相机不滚动（固定屏幕坐标）。共用 WorldScene 创建并
 * 注册到 registry 的同一个 CanvasGame 实例，仅调用 renderUI()。
 * ============================================================ */

import Phaser from 'phaser';
import { CanvasGame } from '../canvas/CanvasGame';
import { PhaserPainter } from './PhaserPainter';
import { PhaserTextLayer } from './PhaserText';

export const UI_SCENE = 'ui';

export class UIScene extends Phaser.Scene {
  private game1: CanvasGame | null = null;
  private painter!: PhaserPainter;
  private textLayer!: PhaserTextLayer;

  constructor() { super(UI_SCENE); }

  create(): void {
    const gfx = this.add.graphics();
    gfx.setDepth(0);
    this.painter = new PhaserPainter(gfx);
    this.textLayer = new PhaserTextLayer(this, 5);
    this.game1 = (this.registry.get('game') as CanvasGame) ?? null;
  }

  update(): void {
    if (!this.game1) {
      this.game1 = (this.registry.get('game') as CanvasGame) ?? null;
      if (!this.game1) return;
    }
    this.game1.setBackend(this.painter, this.textLayer);
    this.painter.begin();
    this.textLayer.begin();
    this.game1.renderUI();
    this.textLayer.end();
  }
}
