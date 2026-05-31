/* ============================================================
 * WorldMapScene.ts — 互通大世界「枢纽」场景（Phaser 原生）。
 *
 * 以一张真实以色列像素地图（world-map.png）为底，按各城市真实地理位置叠加
 * 可交互节点；节点按 WorldEngine 的解锁/访问/通关状态着色，点击已解锁且绑定
 * 真实场景的节点即 `scene.start` 切入对应地图。世界进度（解锁/访问/通关/快照）
 * 存于游戏级 registry 的共享 WorldEngine 实例，并持久化到 localStorage，
 * 切图往返与刷新重开都不丢。
 * ============================================================ */

import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../canvas/CanvasGame';
import { WorldEngine, MapNode, MapKind, WorldState } from '../engine/WorldEngine';
import { DAVID_WORLD } from '../engine/WorldData';

export const WORLD_MAP_SCENE = 'worldmap';
/** 共享 WorldEngine 在 registry 中的键（区别于场景 key 'world'）。 */
export const WORLD_KEY = 'worldEngine';
/** 世界进度存档在 localStorage 中的键。 */
export const WORLD_SAVE_KEY = 'david_world_v1';
/** 底图纹理 key 与资源路径。 */
const MAP_IMG = 'worldmap-bg';
const MAP_IMG_PATH = 'assets/world-map.png';
/** 底图自然尺寸（与导出的 world-map.png 一致）。 */
const IMG_W = 1280;
const IMG_H = 960;

/** 取或建共享 WorldEngine：优先从 localStorage 恢复，否则新建；存入 registry 复用。 */
export function getWorld(scene: Phaser.Scene): WorldEngine {
  let w = scene.registry.get(WORLD_KEY) as WorldEngine | undefined;
  if (!w) {
    w = loadWorldFromStorage() ?? new WorldEngine(DAVID_WORLD);
    scene.registry.set(WORLD_KEY, w);
  }
  return w;
}

/** 把世界进度持久化到 localStorage（失败静默，兼容无 storage 环境）。 */
export function saveWorld(scene: Phaser.Scene): void {
  const w = scene.registry.get(WORLD_KEY) as WorldEngine | undefined;
  if (!w) return;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(w.serialize()));
  } catch { /* 隐私模式/配额满等：忽略 */ }
}

/** 从 localStorage 读取并恢复 WorldEngine；无存档或异常返回 null。 */
function loadWorldFromStorage(): WorldEngine | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(WORLD_SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as WorldState;
    return WorldEngine.restore(DAVID_WORLD, state);
  } catch { return null; }
}

/** 节点类型 → 标记底色。 */
const KIND_COLOR: Record<MapKind, number> = {
  pasture: 0x6ab04c,
  field: 0x9c8b4f,
  valley: 0xb05c3c,
  cave: 0x7a6ea0,
  palace: 0xe6b422,
  town: 0x5a9bd4,
};

export class WorldMapScene extends Phaser.Scene {
  private world!: WorldEngine;
  /** 底图 cover 变换：屏幕坐标 = off + norm * draw。 */
  private offX = 0; private offY = 0; private drawW = VIEW_W; private drawH = VIEW_H;
  private tip?: Phaser.GameObjects.Container;

  constructor() { super(WORLD_MAP_SCENE); }

  preload(): void {
    if (!this.textures.exists(MAP_IMG)) this.load.image(MAP_IMG, MAP_IMG_PATH);
  }

  create(): void {
    this.world = getWorld(this);

    const cam = this.cameras.main;
    cam.setScroll(0, 0);
    cam.setBackgroundColor('#0d1018');

    this.layoutBackground();
    this.drawConnections();
    this.drawNodes();
    this.drawTitle();
    this.drawHint();
  }

  /** 以 cover 方式把底图铺满视口（保持比例、最小裁切），记录变换供节点对齐。 */
  private layoutBackground(): void {
    const scale = Math.max(VIEW_W / IMG_W, VIEW_H / IMG_H);
    this.drawW = IMG_W * scale;
    this.drawH = IMG_H * scale;
    this.offX = (VIEW_W - this.drawW) / 2;
    this.offY = (VIEW_H - this.drawH) / 2;

    if (this.textures.exists(MAP_IMG)) {
      this.add.image(this.offX, this.offY, MAP_IMG)
        .setOrigin(0, 0)
        .setDisplaySize(this.drawW, this.drawH)
        .setDepth(0);
    } else {
      // 资源缺失兜底：纯色底，保证仍可用
      this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x1d2333).setOrigin(0, 0).setDepth(0);
    }
  }

  /** 归一化地理坐标 → 屏幕像素（与底图同一 cover 变换）。 */
  private nodeXY(n: MapNode): { x: number; y: number } {
    return { x: this.offX + n.mx * this.drawW, y: this.offY + n.my * this.drawH };
  }

  private drawTitle(): void {
    this.add.rectangle(0, 0, VIEW_W, 26, 0x000000, 0.45).setOrigin(0, 0).setDepth(8);
    this.add.text(VIEW_W / 2, 13, '大卫一生 · 互通大世界', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffe9b0',
    }).setOrigin(0.5, 0.5).setDepth(9);
  }

  /** 画互通连线（无向，去重；已解锁两端高亮）。 */
  private drawConnections(): void {
    const g = this.add.graphics();
    g.setDepth(1);
    const drawn = new Set<string>();
    for (const n of this.world.list()) {
      const a = this.nodeXY(n);
      for (const cid of n.connections) {
        const key = [n.id, cid].sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const m = this.world.get(cid);
        if (!m) continue;
        const b = this.nodeXY(m);
        const lit = this.world.isUnlocked(n.id) && this.world.isUnlocked(cid);
        g.lineStyle(lit ? 3 : 2, lit ? 0xffe9b0 : 0x2a2218, lit ? 0.85 : 0.4);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  private drawNodes(): void {
    for (const n of this.world.list()) {
      const { x, y } = this.nodeXY(n);
      const unlocked = this.world.isUnlocked(n.id);
      const enterable = this.world.canEnter(n.id);
      const completed = this.world.isCompleted(n.id);
      const baseColor = unlocked ? KIND_COLOR[n.kind] : 0x39414f;

      // 外发光（仅可进入节点，提示「这里能去」）
      if (enterable) {
        this.add.circle(x, y, 20, 0xffe9b0, 0.22).setDepth(2);
      }

      const ring = this.add.circle(x, y, 13, baseColor, unlocked ? 0.9 : 0.7)
        .setDepth(3)
        .setStrokeStyle(2.5, completed ? 0xffd86b : (unlocked ? 0xffffff : 0x6b7488));

      // 通关勾 / 锁 / 占位 标记
      const badge = completed ? '✓' : (!unlocked ? '🔒' : (n.scene ? '' : '…'));
      if (badge) {
        this.add.text(x, y - 1, badge, {
          fontFamily: 'sans-serif', fontSize: completed ? '16px' : '12px',
          color: completed ? '#3a2c00' : '#eaf0fb',
        }).setOrigin(0.5, 0.5).setDepth(4);
      }

      // 已解锁节点在标记下显示中文名（未解锁不显示，避免遮挡底图英文地名）
      if (unlocked) {
        this.add.text(x, y + 16, n.name, {
          fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(4);
      }

      // 交互：可进入则点击切图；任意节点 hover 显示中文名+章节提示
      ring.setInteractive({ useHandCursor: enterable });
      ring.on('pointerover', () => { if (enterable) ring.setScale(1.25); this.showTip(n, x, y); });
      ring.on('pointerout', () => { ring.setScale(1); this.hideTip(); });
      ring.on('pointerdown', () => this.onNodeClick(n));
    }
  }

  /** 悬停浮窗：中文名 + 章节副标题。 */
  private showTip(n: MapNode, x: number, y: number): void {
    this.hideTip();
    const lines = [n.name, n.subtitle ?? ''];
    const label = this.add.text(0, 0, lines.join('\n'), {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#fff',
      align: 'center', wordWrap: { width: 190 }, lineSpacing: 2,
    }).setOrigin(0.5, 1);
    const w = Math.min(210, label.width + 14);
    const h = label.height + 10;
    const bg = this.add.rectangle(0, 0, w, h, 0x0b0e15, 0.92)
      .setOrigin(0.5, 1).setStrokeStyle(1, 0xffe9b0, 0.7);
    label.setPosition(0, -5);
    bg.setPosition(0, 0);
    // 浮窗放节点上方，钳制在视口内
    let ty = y - 18;
    if (ty - h < 28) ty = y + 18 + h; // 太靠上则放下方
    const tx = Phaser.Math.Clamp(x, w / 2 + 4, VIEW_W - w / 2 - 4);
    this.tip = this.add.container(tx, ty, [bg, label]).setDepth(30);
  }

  private hideTip(): void { this.tip?.destroy(); this.tip = undefined; }

  private drawHint(): void {
    this.add.text(VIEW_W / 2, VIEW_H - 8,
      '点击发光节点进入地图 · 地图内按 M 返回 · 进度自动存档', {
        fontFamily: 'sans-serif', fontSize: '11px', color: '#ffe9b0',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(9);
  }

  private onNodeClick(n: MapNode): void {
    if (!this.world.isUnlocked(n.id)) { this.flash(`「${n.name}」尚未解锁`); return; }
    if (!n.scene) { this.flash(`「${n.name}」敬请期待（后续章节）`); return; }
    if (!this.world.enter(n.id)) { this.flash(`无法进入「${n.name}」`); return; }
    saveWorld(this);
    this.scene.start(n.scene);
  }

  /** 屏幕底部短暂提示。 */
  private flash(msg: string): void {
    const t = this.add.text(VIEW_W / 2, VIEW_H - 30, msg, {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffd86b',
      backgroundColor: '#000000cc', padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0.5).setDepth(31);
    this.tweens.add({ targets: t, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
  }
}
