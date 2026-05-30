/* ============================================================
 * WorldScene.ts — 世界层场景（Phaser 原生渲染 + 相机 + 粒子）。
 *
 * 职责：
 * - 持有 GameCore（经 CanvasGame 封装的逻辑+渲染编排），每帧 step() 推进逻辑。
 * - 用 PhaserPainter(Graphics) + PhaserTextLayer 在「世界坐标」渲染地图/角色/
 *   怪物/特效/飘字；由 Phaser 主相机负责滚动跟随（setScroll）。
 * - 原生增强：命中迸溅用粒子发射器，受击/重击用相机 flash / shake。
 * - 接管键盘与指针输入（鼠标=暗黑式操作；触摸=虚拟摇杆）。
 * UI（HUD/对白/面板/结算）由叠在上层的 UIScene 渲染，共用同一 CanvasGame 实例。
 * ============================================================ */

import Phaser from 'phaser';
import { CanvasGame, VIEW_W, VIEW_H } from '../canvas/CanvasGame';
import { TILE, MAP_COLS, MAP_ROWS } from '../core/GameData';
import { PhaserPainter } from './PhaserPainter';
import { PhaserTextLayer } from './PhaserText';
import { UI_SCENE } from './UIScene';

export const WORLD_SCENE = 'world';
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;

export class WorldScene extends Phaser.Scene {
  private game1!: CanvasGame;
  private painter!: PhaserPainter;
  private textLayer!: PhaserTextLayer;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private seenHits = new WeakSet<object>();
  private prevShake = 0;
  private prevHurt = 0;

  constructor() { super(WORLD_SCENE); }

  create(): void {
    // 世界图元层（depth 0）
    const gfx = this.add.graphics();
    gfx.setDepth(0);
    this.painter = new PhaserPainter(gfx);
    this.textLayer = new PhaserTextLayer(this, 5); // 标签/飘字压在图元之上

    // 逻辑+渲染编排（无 ctx：用 setBackend 注入原生后端）
    this.game1 = new CanvasGame();
    this.registry.set('game', this.game1); // 供 UIScene 取用

    // 相机：跟随由 setScroll 驱动，限制在地图范围
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W, MAP_H);
    cam.setBackgroundColor('#14161c');
    cam.roundPixels = true;

    this.initParticles();
    this.bindInput();
    this.game1.start();

    // 叠加 UI 场景（HUD/对白/面板/结算），运行在世界之上
    this.scene.launch(UI_SCENE);
  }

  private initParticles(): void {
    // 用一小块白色贴图作为火星粒子
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfff2c0, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture('spark', 3, 3);
    g.destroy();
    this.sparks = this.add.particles(0, 0, 'spark', {
      lifespan: 320,
      speed: { min: 30, max: 110 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.sparks.setDepth(3); // 图元之上、文本之下
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
      kb.on('keydown', (e: KeyboardEvent) => this.game1.keyDown(e.key));
      kb.on('keyup', (e: KeyboardEvent) => this.game1.keyUp(e.key));
    }
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) {
        this.game1.setTouchControls(true);
        this.game1.pointerDown(p.id, p.x, p.y);
      } else if (p.button === 0) {
        this.game1.mouseDownLeft(p.x, p.y);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.game1.pointerMove(p.id, p.x, p.y);
      else this.game1.mouseMove(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.game1.pointerUp(p.id);
      else if (p.button === 0) this.game1.mouseUpLeft();
    });
  }

  update(): void {
    // 1) 推进逻辑
    this.game1.step();

    // 2) 相机滚动跟随（逻辑算好钳制值，直接喂给原生相机）
    const { camX, camY } = this.game1.cameraScroll();
    this.cameras.main.setScroll(camX, camY);

    // 3) 世界层渲染（世界坐标）
    this.game1.setBackend(this.painter, this.textLayer);
    this.painter.begin();
    this.textLayer.begin();
    this.game1.renderWorld();
    this.textLayer.end();

    // 4) 原生特效：命中粒子 + 受击/重击相机反馈
    this.emitHitParticles();
    this.cameraFeedback();
  }

  /** 对每个「新出现」的命中特效喷一束粒子（与绘制的迸溅叠加，更有打击感）。 */
  private emitHitParticles(): void {
    const fx = this.game1.core.effects as Array<{ x: number; y: number; kind: string }>;
    for (const e of fx) {
      if (e.kind === 'hit' && !this.seenHits.has(e)) {
        this.seenHits.add(e);
        this.sparks.explode(8, e.x, e.y);
      }
    }
  }

  private cameraFeedback(): void {
    const core = this.game1.core;
    if (core.shake > 0 && this.prevShake <= 0) this.cameras.main.shake(160, 0.006);
    this.prevShake = core.shake;
    if (core.playerHurt > this.prevHurt) this.cameras.main.flash(140, 120, 20, 20);
    this.prevHurt = core.playerHurt;
  }
}
