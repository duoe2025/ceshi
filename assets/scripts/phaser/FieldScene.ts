/* ============================================================
 * FieldScene.ts — 「旷野·探索」场景（Phaser 原生 · 第二张可互通地图）。
 *
 * M3 多场景骨架的第二个真实场景：与第一章共用 PhaserPainter(Graphics) +
 * 像素画法 Sprites 渲染一张独立的旷野地图，玩家可自由走位（方向键/WASD），
 * Phaser 相机按本图尺寸 setBounds 跟随。地图东侧有「返回世界地图」传送点，
 * 踩上或按 M 即切回枢纽（WorldMapScene），世界进度由共享 WorldEngine 保持。
 *
 * 说明：本场景是「可互通切图 + 相机边界 + 状态保持」的骨架验证；旷野的
 * 完整 ARPG 玩法（刷怪/掉落/招募）将在 M5/M6 接入。
 * ============================================================ */

import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../canvas/CanvasGame';
import { TILE, T, SOLID_TILES } from '../core/GameData';
import * as Sprites from '../Sprites';
import { PhaserPainter } from './PhaserPainter';
import { PhaserTextLayer } from './PhaserText';
import { WORLD_MAP_SCENE, getWorld } from './WorldMapScene';

export const FIELD_SCENE = 'field';

const FCOLS = 34;
const FROWS = 26;
const FMAP_W = FCOLS * TILE;
const FMAP_H = FROWS * TILE;
const SPEED = 2.4; // 像素/帧

/** 程序化生成一张旷野地图（草地 + 树林边界 + 散布树石花草 + 返回传送点）。 */
function buildField(): { map: number[][]; portal: { c: number; r: number } } {
  const map: number[][] = [];
  for (let r = 0; r < FROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < FCOLS; c++) {
      const edge = r === 0 || c === 0 || r === FROWS - 1 || c === FCOLS - 1;
      row.push(edge ? T.TREE : T.GRASS);
    }
    map.push(row);
  }
  const set = (c: number, r: number, t: number) => {
    if (r > 0 && c > 0 && r < FROWS - 1 && c < FCOLS - 1) map[r][c] = t;
  };
  // 一条横贯的小路（牧场方向 → 旷野深处）
  for (let c = 1; c < FCOLS - 1; c++) set(c, Math.floor(FROWS / 2), T.PATH);
  // 散布树
  const trees = [[5, 4], [9, 6], [13, 3], [18, 5], [22, 4], [26, 6], [29, 9],
    [6, 18], [11, 20], [16, 19], [21, 21], [25, 18], [28, 20], [8, 11], [24, 11]];
  trees.forEach(([c, r]) => set(c, r, T.TREE));
  // 散布石头
  const rocks = [[7, 8], [15, 9], [20, 8], [27, 13], [10, 15], [19, 16], [23, 14]];
  rocks.forEach(([c, r]) => set(c, r, T.ROCK));
  // 装饰花草（不挡路）
  const grass = [[4, 6], [12, 7], [17, 8], [21, 6], [6, 13], [14, 14], [25, 9], [9, 17], [22, 19]];
  grass.forEach(([c, r]) => { if (map[r][c] === T.GRASS) map[r][c] = T.TGRASS; });
  const flowers = [[5, 7], [13, 9], [18, 7], [8, 14], [16, 16], [24, 17], [27, 8]];
  flowers.forEach(([c, r]) => { if (map[r][c] === T.GRASS) map[r][c] = T.FLOWER; });
  // 返回世界地图的传送点（西侧路口，画成泥土路）
  const portal = { c: 1, r: Math.floor(FROWS / 2) };
  set(portal.c, portal.r, T.PATH);
  return { map, portal };
}

export class FieldScene extends Phaser.Scene {
  private painter!: PhaserPainter;
  private textLayer!: PhaserTextLayer;
  private map: number[][] = [];
  private portal = { c: 1, r: 12 };
  // 玩家（sprite 左上角世界坐标，与第一章一致）
  private px = 0; private py = 0;
  private facing = 'down';
  private frame = 0;
  private animClock = 0;
  private keys!: {
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key;
  };
  private leaving = false;
  private hintT = 0;

  constructor() { super(FIELD_SCENE); }

  create(): void {
    this.leaving = false;
    const built = buildField();
    this.map = built.map;
    this.portal = built.portal;

    const gfx = this.add.graphics();
    gfx.setDepth(0);
    this.painter = new PhaserPainter(gfx);
    this.textLayer = new PhaserTextLayer(this, 5);

    // 进入点：小路中段（避开传送点，免得一进就被传走）
    this.px = Math.floor(FCOLS / 2) * TILE;
    this.py = Math.floor(FROWS / 2) * TILE - 6;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, FMAP_W, FMAP_H);
    cam.setBackgroundColor('#1b2a17');
    cam.roundPixels = true;

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D', 'M']);
      // 用映射对象 → 返回以这些小写名为键的对象（与下方 update 中的访问一致）
      this.keys = kb.addKeys({
        up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
        w: 'W', s: 'S', a: 'A', d: 'D',
      }) as typeof this.keys;
      kb.on('keydown-M', () => this.returnToMap());
    }

    getWorld(this); // 确保共享 WorldEngine 已就绪（已在枢纽 enter('field')）
  }

  /** 该瓦片是否阻挡（含越界视为阻挡）。 */
  private solidAt(x: number, y: number): boolean {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    if (c < 0 || r < 0 || c >= FCOLS || r >= FROWS) return true;
    return SOLID_TILES.has(this.map[r][c]);
  }

  /** 以「脚部中心」做碰撞，尝试把 (px,py) 移动 (dx,dy)。 */
  private tryMove(dx: number, dy: number): void {
    const footX = this.px + TILE / 2;
    const footY = this.py + TILE - 4;
    if (dx !== 0 && !this.solidAt(footX + dx + Math.sign(dx) * 6, footY)) this.px += dx;
    if (dy !== 0 && !this.solidAt(footX, footY + dy + Math.sign(dy) * 6)) this.py += dy;
    // 钳制在地图内
    this.px = Phaser.Math.Clamp(this.px, 0, FMAP_W - TILE);
    this.py = Phaser.Math.Clamp(this.py, 0, FMAP_H - TILE);
  }

  update(_time: number, delta: number): void {
    if (this.leaving) return;
    if (!this.keys) { this.render(); return; }
    const dt = Math.min(0.05, delta / 1000);
    this.animClock += dt;

    // 输入 → 速度
    const k = this.keys;
    let mx = 0; let my = 0;
    if (k.left.isDown || k.a.isDown) { mx -= 1; this.facing = 'left'; }
    if (k.right.isDown || k.d.isDown) { mx += 1; this.facing = 'right'; }
    if (k.up.isDown || k.w.isDown) { my -= 1; this.facing = 'up'; }
    if (k.down.isDown || k.s.isDown) { my += 1; this.facing = 'down'; }
    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const len = Math.hypot(mx, my) || 1;
      this.tryMove((mx / len) * SPEED, (my / len) * SPEED);
      this.frame = Math.floor(this.animClock * 8) % 4;
    } else {
      this.frame = 0;
    }

    // 相机跟随（钳制由 setBounds 负责）
    const cam = this.cameras.main;
    cam.setScroll(
      Math.round(this.px + TILE / 2 - VIEW_W / 2),
      Math.round(this.py + TILE / 2 - VIEW_H / 2),
    );

    // 踩到传送点 → 返回世界地图
    const pc = Math.floor((this.px + TILE / 2) / TILE);
    const pr = Math.floor((this.py + TILE - 4) / TILE);
    if (pc === this.portal.c && pr === this.portal.r) { this.returnToMap(); return; }

    this.render();
  }

  private render(): void {
    const p = this.painter;
    const cam = this.cameras.main;
    const camX = cam.scrollX; const camY = cam.scrollY;
    p.begin();
    this.textLayer.begin();

    // 瓦片（按相机可视范围剔除，世界坐标绘制）
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const c1 = Math.min(FCOLS - 1, c0 + Math.ceil(VIEW_W / TILE) + 1);
    const r1 = Math.min(FROWS - 1, r0 + Math.ceil(VIEW_H / TILE) + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) Sprites.tile(p, this.map[r][c], c * TILE, r * TILE);
    }

    // 传送点光圈 + 标记
    const gx = this.portal.c * TILE + TILE / 2;
    const gy = this.portal.r * TILE + TILE / 2;
    const pulse = 6 + Math.sin(this.animClock * 4) * 3;
    p.strokeCircle(gx, gy, 16 + pulse, 3, '#ffe27a');

    // 玩家（像素大卫，scale 2）
    Sprites.david(p, this.px, this.py, 2, this.facing, this.frame);

    // 传送点标签（世界坐标 → 屏幕坐标）
    this.textLayer.text('← 返回世界地图', gx - camX, gy - camY - 28, 12, '#ffe27a', 'center', 'middle');

    // 顶部固定说明（屏幕坐标）
    this.textLayer.text('旷野 · 探索（骨架）', VIEW_W / 2, 22, 18, '#eaf3da', 'center', 'middle');
    this.textLayer.text('方向键/WASD 走位 · 走到光圈或按 M 返回世界地图', VIEW_W / 2, 46, 13, '#aebfa0', 'center', 'middle');
    this.textLayer.text('（完整 ARPG 玩法将于 M5/M6 在本图接入）', VIEW_W / 2, VIEW_H - 20, 12, '#8aa07c', 'center', 'middle');

    this.textLayer.end();
  }

  private returnToMap(): void {
    if (this.leaving) return;
    this.leaving = true;
    getWorld(this).leave();
    this.scene.start(WORLD_MAP_SCENE);
  }
}
