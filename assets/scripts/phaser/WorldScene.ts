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
import { rarityColor } from '../core/Items';
import { PhaserPainter } from './PhaserPainter';
import { PhaserTextLayer } from './PhaserText';
import { UI_SCENE } from './UIScene';
import { WORLD_MAP_SCENE, getWorld } from './WorldMapScene';

/** '#rrggbb' → 0xRRGGBB（粒子着色用） */
function hexToInt(css: string): number {
  return parseInt(css.replace('#', '').slice(0, 6), 16) || 0xffffff;
}

export const WORLD_SCENE = 'world';
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;

export class WorldScene extends Phaser.Scene {
  private game1!: CanvasGame;
  private painter!: PhaserPainter;
  private textLayer!: PhaserTextLayer;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter; // 命中迸溅
  private motes!: Phaser.GameObjects.Particles.ParticleEmitter;  // 升级/暴击 金色
  private beams!: Phaser.GameObjects.Particles.ParticleEmitter;  // 掉落光柱（按稀有度着色）
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;  // 弹弓飞石拖尾（石屑）
  private seenFx = new WeakSet<object>();   // 已处理的特效（命中/暴击/升级）
  private seenLoot = new WeakSet<object>(); // 已喷光柱的地面掉落
  private night!: Phaser.GameObjects.Rectangle; // 夜战压暗（原生固定层，仅暗世界不暗 HUD）
  private prevShake = 0;
  private prevHurt = 0;
  private completedOnce = false; // 本图通关只向 WorldEngine 标记一次
  private leaving = false;       // 正在切回世界地图

  constructor() { super(WORLD_SCENE); }

  create(): void {
    // 场景实例会被 Phaser 复用，重入时复位本图状态标志
    this.completedOnce = false;
    this.leaving = false;

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

    // 夜战压暗：原生 Rectangle 固定在相机（不随世界滚动），仅覆盖世界层；HUD 在 UIScene 之上保持明亮
    this.night = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0e102e, 0.5)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(6).setVisible(false);

    this.initParticles();
    this.game1.nativeProjectileTrail = true; // 飞石拖尾改走原生粒子，关闭自绘拖尾
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

    // 升级/暴击：金色四散光点
    this.motes = this.add.particles(0, 0, 'spark', {
      lifespan: 560,
      speed: { min: 40, max: 130 },
      scale: { start: 2.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffe27a,
      blendMode: 'ADD',
      emitting: false,
    });
    this.motes.setDepth(4);

    // 掉落光柱：竖直上升的细条，按稀有度着色
    const b = this.make.graphics({ x: 0, y: 0 }, false);
    b.fillStyle(0xffffff, 1);
    b.fillRect(0, 0, 2, 8);
    b.generateTexture('beam', 2, 8);
    b.destroy();
    this.beams = this.add.particles(0, 0, 'beam', {
      lifespan: 640,
      speedY: { min: -48, max: -22 },
      speedX: { min: -10, max: 10 },
      scaleY: { start: 1.4, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.beams.setDepth(2);

    // 弹弓飞石拖尾：淡灰石屑，短命、低速、渐隐，逐帧在飞石位置喷出
    this.trail = this.add.particles(0, 0, 'spark', {
      lifespan: 240,
      speed: { min: 8, max: 28 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xcbc3af,
      emitting: false,
    });
    this.trail.setDepth(2); // 飞石（图元 depth 0）之上、文本之下
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'M']);
      kb.on('keydown', (e: KeyboardEvent) => this.game1.keyDown(e.key));
      kb.on('keyup', (e: KeyboardEvent) => this.game1.keyUp(e.key));
      kb.on('keydown-M', () => this.returnToMap()); // 返回世界地图枢纽
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
    this.emitEffectParticles();
    this.emitLootBeams();
    this.emitProjectileTrails();
    this.cameraFeedback();

    // 夜战压暗（原生层）：邪灵阶段未驱散时变暗
    const core = this.game1.core;
    this.night.setVisible(core.phase === 'q3' && !core.spiritDefeated);

    // 第一章通关 → 在共享 WorldEngine 标记本图完成，解锁后续节点（以拉谷等）
    if (!this.completedOnce && core.phase === 'done') {
      this.completedOnce = true;
      getWorld(this).complete('bethlehem');
    }
  }

  /** 切回世界地图枢纽：停 UI 叠加层，回到 WorldMapScene。 */
  private returnToMap(): void {
    if (this.leaving) return;
    this.leaving = true;
    getWorld(this).leave();
    this.scene.stop(UI_SCENE);
    this.scene.start(WORLD_MAP_SCENE);
  }

  /** 对每个「新出现」的特效喷原生粒子：命中迸溅 / 暴击 / 升级。 */
  private emitEffectParticles(): void {
    const fx = this.game1.core.effects as Array<{ x: number; y: number; kind: string }>;
    for (const e of fx) {
      if (this.seenFx.has(e)) continue;
      this.seenFx.add(e);
      if (e.kind === 'hit') {
        this.sparks.explode(8, e.x, e.y);
      } else if (e.kind === 'critstar') {
        this.motes.explode(10, e.x, e.y);
      } else if (e.kind === 'levelup') {
        this.motes.explode(26, e.x, e.y);
        this.cameras.main.flash(180, 90, 80, 30); // 金色升级闪光
      }
    }
  }

  /** 对每个「新掉落」的地面物品喷一波按稀有度着色的上升光柱。 */
  private emitLootBeams(): void {
    const items = this.game1.core.groundItems as Array<{ x: number; y: number; item: { rarity: import('../core/types').Rarity } }>;
    for (const g of items) {
      if (this.seenLoot.has(g)) continue;
      this.seenLoot.add(g);
      this.beams.particleTint = hexToInt(rarityColor(g.item.rarity));
      this.beams.explode(10, g.x, g.y);
    }
  }

  /** 逐帧在每颗飞行中的飞石位置喷一粒石屑，形成原生粒子拖尾。 */
  private emitProjectileTrails(): void {
    const ps = this.game1.core.projectiles as Array<{ x: number; y: number }>;
    for (const pr of ps) this.trail.emitParticleAt(pr.x, pr.y, 1);
  }

  private cameraFeedback(): void {
    const core = this.game1.core;
    if (core.shake > 0 && this.prevShake <= 0) this.cameras.main.shake(160, 0.006);
    this.prevShake = core.shake;
    if (core.playerHurt > this.prevHurt) this.cameras.main.flash(140, 120, 20, 20);
    this.prevHurt = core.playerHurt;
  }
}
