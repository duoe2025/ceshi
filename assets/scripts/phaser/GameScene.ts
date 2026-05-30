/* ============================================================
 * GameScene.ts — Phaser 3 场景：承载第一章「牧童大卫」。
 *
 * 设计：复用已 39/39 无头验证的引擎无关逻辑核心 GameCore 与像素渲染层
 * CanvasGame。本场景用一张 CanvasTexture 作为「逻辑层的画布」，把
 * CanvasGame 的 2D 绘制结果每帧上传给 Phaser 显示；Phaser 负责游戏循环、
 * 场景管理、输入与缩放。后续每一幕/每张地图都可作为新的 Phaser.Scene，
 * 复用同一套逻辑引擎与渲染工具。
 * ============================================================ */

import Phaser from 'phaser';
import { CanvasGame, VIEW_W, VIEW_H, FullCtx } from '../canvas/CanvasGame';

export const SCENE_KEY = 'chapter1';
const TEX_KEY = 'screen';

export class GameScene extends Phaser.Scene {
  private game1!: CanvasGame;
  private tex!: Phaser.Textures.CanvasTexture;

  constructor() { super(SCENE_KEY); }

  create(): void {
    // 逻辑层专用画布（与逻辑分辨率一致）
    const tex = this.textures.createCanvas(TEX_KEY, VIEW_W, VIEW_H);
    if (!tex) throw new Error('createCanvas 失败');
    this.tex = tex;
    const ctx = this.tex.getContext() as unknown as FullCtx;

    this.game1 = new CanvasGame(ctx);
    this.add.image(0, 0, TEX_KEY).setOrigin(0, 0);

    this.bindInput();
    this.game1.start();
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      // 拦截方向键/空格的页面滚动
      kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
      kb.on('keydown', (e: KeyboardEvent) => this.game1.keyDown(e.key));
      kb.on('keyup', (e: KeyboardEvent) => this.game1.keyUp(e.key));
    }
    // 禁用右键菜单，便于后续右键操作；鼠标=暗黑式操作，触摸=虚拟摇杆
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) {
        this.game1.setTouchControls(true);
        this.game1.pointerDown(p.id, p.x, p.y);
      } else if (p.button === 0) {
        // p.button 是触发本次事件的按键（0=左键），不要用 leftButtonDown()（读的是按键状态位图）
        this.game1.mouseDownLeft(p.x, p.y);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.game1.pointerMove(p.id, p.x, p.y);
      else this.game1.mouseMove(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.game1.pointerUp(p.id);
      else if (p.button === 0) this.game1.mouseUpLeft(); // 仅左键释放才结束「按住跟随」
    });
  }

  update(): void {
    // 推进逻辑 + 渲染到 CanvasTexture，再上传显示
    this.game1.frame();
    this.tex.refresh();
  }
}
