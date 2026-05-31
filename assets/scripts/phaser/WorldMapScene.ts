/* ============================================================
 * WorldMapScene.ts — 互通大世界「枢纽」场景（Phaser 原生）。
 *
 * M3 多场景骨架的入口：以一张世界地图把各章节地图节点用连线串起，节点按
 * WorldEngine 的解锁/访问/通关状态着色显示；点击已解锁且绑定真实场景的节点
 * 即 `scene.start` 切入对应地图。世界进度（解锁/访问/通关/快照）存于游戏级
 * registry 的共享 WorldEngine 实例，切图往返不丢。
 * ============================================================ */

import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../canvas/CanvasGame';
import { WorldEngine, MapNode, MapKind } from '../engine/WorldEngine';
import { DAVID_WORLD } from '../engine/WorldData';

export const WORLD_MAP_SCENE = 'worldmap';
/** 共享 WorldEngine 在 registry 中的键（区别于场景 key 'world'）。 */
export const WORLD_KEY = 'worldEngine';

/** 取或建共享 WorldEngine（切图往返复用同一实例，进度不丢）。 */
export function getWorld(scene: Phaser.Scene): WorldEngine {
  let w = scene.registry.get(WORLD_KEY) as WorldEngine | undefined;
  if (!w) { w = new WorldEngine(DAVID_WORLD); scene.registry.set(WORLD_KEY, w); }
  return w;
}

/** 节点类型 → 图标底色。 */
const KIND_COLOR: Record<MapKind, number> = {
  pasture: 0x6ab04c,
  field: 0x9c8b4f,
  valley: 0xb05c3c,
  cave: 0x5a5870,
  palace: 0xc9a227,
  town: 0x4f7ab0,
};

/** 节点网格坐标 → 屏幕像素。 */
function nodeXY(n: MapNode): { x: number; y: number } {
  return { x: 70 + n.col * 108, y: 150 + n.row * 120 };
}

export class WorldMapScene extends Phaser.Scene {
  private world!: WorldEngine;

  constructor() { super(WORLD_MAP_SCENE); }

  create(): void {
    this.world = getWorld(this);

    const cam = this.cameras.main;
    cam.setScroll(0, 0);
    cam.setBackgroundColor('#10131c');

    // 背景：羊皮纸式渐层底板
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x161a26).setOrigin(0, 0);
    this.add.rectangle(20, 90, VIEW_W - 40, VIEW_H - 150, 0x1d2333)
      .setOrigin(0, 0).setStrokeStyle(2, 0x3a4660);

    this.drawTitle();
    this.drawConnections();
    this.drawNodes();
    this.drawHint();
  }

  private drawTitle(): void {
    this.add.text(VIEW_W / 2, 34, '大卫一生 · 互通大世界', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffe9b0',
    }).setOrigin(0.5, 0.5);
    this.add.text(VIEW_W / 2, 64, '主线随圣经推进逐图解锁 · 已解锁地图可回访互通', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#9fb0c8',
    }).setOrigin(0.5, 0.5);
  }

  /** 画互通连线（无向，去重）。 */
  private drawConnections(): void {
    const g = this.add.graphics();
    g.setDepth(1);
    const drawn = new Set<string>();
    for (const n of this.world.list()) {
      const a = nodeXY(n);
      for (const cid of n.connections) {
        const key = [n.id, cid].sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const m = this.world.get(cid);
        if (!m) continue;
        const b = nodeXY(m);
        const lit = this.world.isUnlocked(n.id) && this.world.isUnlocked(cid);
        g.lineStyle(lit ? 4 : 2, lit ? 0x6f8bbd : 0x39435c, lit ? 0.9 : 0.5);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  private drawNodes(): void {
    for (const n of this.world.list()) {
      const { x, y } = nodeXY(n);
      const unlocked = this.world.isUnlocked(n.id);
      const enterable = this.world.canEnter(n.id);
      const completed = this.world.isCompleted(n.id);
      const baseColor = unlocked ? KIND_COLOR[n.kind] : 0x39414f;

      const ring = this.add.circle(x, y, 30, baseColor)
        .setDepth(2)
        .setStrokeStyle(3, completed ? 0xffd86b : (unlocked ? 0xeef2ff : 0x596277));

      // 通关勾 / 锁 / 占位 标记
      const badge = completed ? '✓' : (!unlocked ? '🔒' : (n.scene ? '' : '…'));
      if (badge) {
        this.add.text(x, y, badge, {
          fontFamily: 'sans-serif', fontSize: completed ? '24px' : '18px',
          color: completed ? '#3a2c00' : '#dfe6f2',
        }).setOrigin(0.5, 0.5).setDepth(3);
      }

      // 名称 + 副标题
      this.add.text(x, y + 40, n.name, {
        fontFamily: 'sans-serif', fontSize: '15px',
        color: unlocked ? '#ffffff' : '#7b8499',
      }).setOrigin(0.5, 0).setDepth(3);
      if (n.subtitle) {
        this.add.text(x, y + 60, n.subtitle, {
          fontFamily: 'sans-serif', fontSize: '11px',
          color: unlocked ? '#a9b6cc' : '#5e677a',
          align: 'center', wordWrap: { width: 150 },
        }).setOrigin(0.5, 0).setDepth(3);
      }

      // 交互：可进入则点击切图；锁定/占位给提示
      ring.setInteractive({ useHandCursor: enterable });
      ring.on('pointerover', () => { if (enterable) ring.setScale(1.12); });
      ring.on('pointerout', () => ring.setScale(1));
      ring.on('pointerdown', () => this.onNodeClick(n));
    }
  }

  private drawHint(): void {
    this.add.text(VIEW_W / 2, VIEW_H - 26,
      '点击发光节点进入地图 · 地图内按 M 返回本世界地图', {
        fontFamily: 'sans-serif', fontSize: '13px', color: '#8a97ad',
      }).setOrigin(0.5, 0.5);
  }

  private onNodeClick(n: MapNode): void {
    if (!this.world.isUnlocked(n.id)) { this.flash(`「${n.name}」尚未解锁`); return; }
    if (!n.scene) { this.flash(`「${n.name}」敬请期待（后续章节）`); return; }
    if (!this.world.enter(n.id)) { this.flash(`无法进入「${n.name}」`); return; }
    this.scene.start(n.scene);
  }

  /** 屏幕底部短暂提示。 */
  private flash(msg: string): void {
    const t = this.add.text(VIEW_W / 2, VIEW_H - 54, msg, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffd86b',
      backgroundColor: '#000000aa', padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0.5).setDepth(20);
    this.tweens.add({ targets: t, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }
}
