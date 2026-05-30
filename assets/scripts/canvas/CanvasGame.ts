/* ============================================================
 * CanvasGame.ts — 纯 Canvas 2D 渲染 + 输入层（无 DOM、无引擎）。
 * 复用引擎无关核心 GameCore 与像素绘制 Sprites，所有 UI 画在画布上。
 * 浏览器版（键盘）与微信小游戏版（触摸虚拟摇杆）共用本类。
 * ============================================================ */

import { GameCore } from '../core/GameCore';
import { GameData, TILE, MAP_COLS, MAP_ROWS } from '../core/GameData';
import { FinishStats, IGameView, Slot } from '../core/types';
import { CanvasPainter, Ctx2D, cssColor } from './CanvasPainter';
import * as Sprites from '../Sprites';
import { rgba } from '../IPainter';

export const VIEW_W = 800;
export const VIEW_H = 576;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const STEP = 1 / 60;

// 文本能力的 2D 上下文
export interface FullCtx extends Ctx2D {
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  save(): void;
  restore(): void;
}

interface Btn { x: number; y: number; w: number; h: number; }

export class CanvasGame implements IGameView {
  private ctx: FullCtx;
  private painter: CanvasPainter;
  core: GameCore;

  private acc = 0;
  private last = 0;
  private animClock = 0;
  private toastMsg = '';
  private toastTimer = 0;
  private finished = false;

  // 触摸控件
  private touchUI = false;
  private joyId = -1;
  private joyCX = 0; private joyCY = 0; private joyDX = 0; private joyDY = 0;
  private atkId = -1;

  constructor(ctx: FullCtx) {
    this.ctx = ctx;
    this.painter = new CanvasPainter(ctx);
    this.core = new GameCore(this);
  }

  start(): void {
    this.finished = false;
    this.core.start();
    this.last = this.now();
  }

  private now(): number {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  setTouchControls(on: boolean): void { this.touchUI = on; }

  /* ---------------- IGameView ---------------- */
  toast(msg: string, ms = 1800): void { this.toastMsg = msg; this.toastTimer = ms / 1000; }

  onFinish(stats: FinishStats): void {
    this.finished = true;
    this.endText = `第一章 · 牧童大卫 — 完成！\n\n`
      + `大卫靠着对耶和华的信心，找回走失的羊，\n`
      + `击退猛狮，并以赞美的琴声驱散了邪灵。\n\n`
      + `剩余生命：${stats.hp} / ${stats.maxHp}\n\n`
      + (this.touchUI ? '点击屏幕重新开始' : '按 R 重新开始');
  }
  private endText = '';

  /* ---------------- 主循环（由入口每帧调用） ---------------- */
  frame(): void {
    const t = this.now();
    let dt = (t - this.last) / 1000;
    this.last = t;
    if (dt > 0.1) dt = 0.1;
    this.animClock += dt;
    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (!this.finished) {
      this.acc += dt;
      let guard = 0;
      while (this.acc >= STEP && guard++ < 5) { this.core.update(); this.acc -= STEP; }
    }
    this.render();
  }

  /* ---------------- 文本工具 ---------------- */
  private text(str: string, x: number, y: number, size: number, color: string,
    align: 'left' | 'center' = 'left', baseline: 'top' | 'middle' = 'top'): void {
    const c = this.ctx;
    c.font = `${size}px sans-serif`;
    c.textAlign = align;
    c.textBaseline = baseline;
    c.fillStyle = cssColor(color);
    c.fillText(str, x, y);
  }

  private wrap(str: string, size: number, maxW: number): string[] {
    const c = this.ctx;
    c.font = `${size}px sans-serif`;
    const out: string[] = [];
    str.split('\n').forEach((para) => {
      let line = '';
      for (const ch of para) {
        if (c.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
        else line += ch;
      }
      out.push(line);
    });
    return out;
  }

  private textBlock(str: string, x: number, y: number, size: number, color: string,
    maxW: number, align: 'left' | 'center' = 'left'): void {
    const lines = this.wrap(str, size, maxW);
    const lh = size + 6;
    lines.forEach((ln, i) => this.text(ln, x, y + i * lh, size, color, align, 'top'));
  }

  /* ---------------- 渲染 ---------------- */
  private camera(shake: number): { camX: number; camY: number } {
    const G = this.core;
    let camX = G.player.x + TILE / 2 - VIEW_W / 2;
    let camY = G.player.y + TILE / 2 - VIEW_H / 2;
    camX = Math.max(0, Math.min(camX, MAP_W - VIEW_W));
    camY = Math.max(0, Math.min(camY, MAP_H - VIEW_H));
    camX = Math.round(camX); camY = Math.round(camY);
    if (shake > 0) {
      camX += Math.round((Math.random() * 2 - 1) * 3);
      camY += Math.round((Math.random() * 2 - 1) * 3);
    }
    return { camX, camY };
  }

  private render(): void {
    const G = this.core;
    const p = this.painter;
    const { camX, camY } = this.camera(G.shake);

    p.fillRect(0, 0, VIEW_W, VIEW_H, rgba(20, 22, 28));

    const c0 = Math.floor(camX / TILE);
    const r0 = Math.floor(camY / TILE);
    const c1 = Math.min(MAP_COLS - 1, c0 + Math.ceil(VIEW_W / TILE) + 1);
    const r1 = Math.min(MAP_ROWS - 1, r0 + Math.ceil(VIEW_H / TILE) + 1);
    for (let r = Math.max(0, r0); r <= r1; r++) {
      for (let c = Math.max(0, c0); c <= c1; c++) {
        Sprites.tile(p, G.map[r][c], c * TILE - camX, r * TILE - camY);
      }
    }

    GameData.foldSheep.forEach((s) => Sprites.sheep(p, s.c * TILE - camX, s.r * TILE - camY + 4, 2));
    G.lostSheep.forEach((s) => { if (!s.taken) Sprites.sheep(p, s.c * TILE - camX, s.r * TILE - camY + 4, 2); });
    this.drawFollowers(camX, camY);

    const jesse = GameData.npcs[0];
    Sprites.jesse(p, jesse.c * TILE - camX, jesse.r * TILE - camY, 2);
    this.nameTag(jesse.name, jesse.c * TILE - camX + 16, jesse.r * TILE - camY - 4, rgba(244, 236, 216));

    if (G.canTalkToJesse()) {
      const bob = Math.sin(this.animClock * 5) * 2;
      this.text('空格/点击 ▼', jesse.c * TILE - camX + 16, jesse.r * TILE - camY - 22 + bob, 14, rgba(224, 178, 80), 'center', 'middle');
    }

    this.drawChests(camX, camY);
    this.drawGroundItems(camX, camY);

    G.projectiles.forEach((pr) => this.drawProjectile(pr, camX, camY));

    G.ambient.forEach((e) => this.drawEnemyEntity(e, camX, camY));
    if (G.enemy) this.drawEnemyEntity(G.enemy, camX, camY);

    this.drawEffects(camX, camY);

    let davidAlpha = 255;
    if (G.playerHurt > 0 && Math.floor(G.playerHurt / 3) % 2 === 0) davidAlpha = 115;
    Sprites.david(p, G.player.x - camX, G.player.y - camY, 2, G.player.facing, G.player.frame);
    if (davidAlpha < 255) p.fillRect(G.player.x - camX + 14, G.player.y - camY + 2, 20, 30, rgba(120, 30, 40, 90));

    if (G.phase === 'q3' && !G.spiritDefeated) p.fillRect(0, 0, VIEW_W, VIEW_H, rgba(14, 16, 46, 128));

    this.drawPopups(camX, camY);

    if (G.nearChest()) {
      const bob = Math.sin(this.animClock * 5) * 2;
      this.text('空格 开启宝箱', G.player.x - camX + 16, G.player.y - camY - 18 + bob, 13, rgba(255, 224, 120), 'center', 'middle');
    }

    // HUD
    this.text(`目标：${G.objectiveText()}`, 10, 8, 16, rgba(255, 222, 120));
    this.drawHpBar(G);
    this.drawStatsHud(G);
    const showWeapon = G.combatActive() || G.phase === 'q2' || G.phase === 'q3';
    if (showWeapon) this.drawWeaponHud();

    this.drawDialogue();
    this.drawQuestLog();
    this.drawEquipPanel();
    if (this.toastTimer > 0) this.drawToast();
    if (this.touchUI && !this.finished) this.drawTouchControls();
    if (this.finished) this.drawEnd();
  }

  private drawFollowers(camX: number, camY: number): void {
    const G = this.core;
    for (let i = 0; i < G.sheepCollected && i < 3; i++) {
      const fx = G.player.x - camX + (i - 1) * 10;
      const fy = G.player.y - camY + 18 + i * 4;
      if (G.phase === 'q1' || G.phase === 'q1done') Sprites.sheep(this.painter, fx, fy, 1.4);
    }
  }

  private withAlpha(hex: string, a: number): string {
    const h = Math.max(0, Math.min(255, Math.round(a))).toString(16).padStart(2, '0');
    return hex.length === 7 ? hex + h : hex;
  }

  private drawProjectile(pr: { x: number; y: number; trail: Array<{ x: number; y: number }> }, camX: number, camY: number): void {
    const p = this.painter;
    pr.trail.forEach((t, i) => {
      const a = Math.min(170, 40 + i * 32);
      p.fillCircle(t.x - camX, t.y - camY, 2 + i * 0.4, rgba(200, 195, 175, a));
    });
    const x = pr.x - camX; const y = pr.y - camY;
    p.fillCircle(x, y, 4, rgba(207, 202, 187));
    p.fillCircle(x + 1, y + 1, 2, rgba(155, 150, 132));
  }

  private drawEnemyEntity(e: import('../core/types').Enemy, camX: number, camY: number): void {
    const p = this.painter;
    const sx = e.x - camX; const sy = e.y - camY;
    if (e.sprite === 'spirit') {
      const bob = Math.sin(this.animClock * 3.6) * 3;
      Sprites.spirit(p, sx - 6, sy - 10 + bob, e.scale, e.hurt > 0);
    } else {
      Sprites.lion(p, sx - 8, sy - 8, e.scale, e.hurt > 0);
    }
    const col = e.type === 'spirit' ? rgba(154, 127, 208)
      : (e.ambient ? rgba(200, 150, 90) : rgba(217, 83, 79));
    this.nameTag(`${e.name} Lv.${e.level}`, sx + 16, sy - 14, col);
    this.enemyHpBar(sx + 16, sy - 28, e);
    if (e.hurt > 0) e.hurt--;
  }

  private drawChests(camX: number, camY: number): void {
    const p = this.painter;
    this.core.chests.forEach((ch) => {
      const x = ch.x - camX; const y = ch.y - camY;
      if (ch.opened) {
        p.fillRect(x + 6, y + 18, 20, 10, rgba(90, 60, 30));
        p.fillRect(x + 6, y + 10, 20, 4, rgba(60, 40, 20));
      } else {
        p.fillRect(x + 5, y + 12, 22, 16, rgba(140, 95, 40));
        p.fillRect(x + 5, y + 10, 22, 5, rgba(170, 120, 55));
        p.fillRect(x + 14, y + 12, 4, 16, rgba(220, 190, 90));
        p.fillRect(x + 5, y + 18, 22, 2, rgba(90, 60, 25));
      }
    });
  }

  private drawGroundItems(camX: number, camY: number): void {
    const p = this.painter;
    this.core.groundItems.forEach((g) => {
      const x = g.x - camX; const y = g.y - camY;
      const col = this.core.itemColor(g.item);
      const bob = Math.sin(g.bob) * 3;
      p.fillRect(x - 2, y - 30, 4, 30, this.withAlpha(col, 70));
      p.fillCircle(x, y + bob, 5, col);
      p.fillCircle(x, y + bob, 2, rgba(255, 255, 255, 220));
    });
  }

  private drawPopups(camX: number, camY: number): void {
    this.core.popups.forEach((pp) => {
      const t = pp.life / pp.max;
      const a = Math.round(255 * Math.min(1, t * 1.4));
      const size = (pp.text.indexOf('LEVEL') >= 0 || pp.text.indexOf('暴击') >= 0) ? 16 : 14;
      this.text(pp.text, pp.x - camX, pp.y - camY, size, this.withAlpha(pp.color, a), 'center', 'middle');
    });
  }

  private drawEffects(camX: number, camY: number): void {
    const p = this.painter;
    this.core.effects.forEach((fx) => {
      const x = fx.x - camX; const y = fx.y - camY;
      const t = fx.life / fx.max;
      if (fx.kind === 'slash') {
        const a0 = fx.facing === 'left' ? Math.PI * 0.6 : fx.facing === 'right' ? -Math.PI * 0.4
          : fx.facing === 'up' ? Math.PI * 1.1 : Math.PI * 0.1;
        p.strokeArc(x, y, 26, a0, a0 + Math.PI * 0.8, 4, rgba(255, 247, 224, Math.round(255 * t)));
      } else if (fx.kind === 'wave') {
        const rr = (1 - t) * (fx.radius || 0);
        const a = Math.max(0, Math.round(255 * t * 0.9));
        p.strokeCircle(x, y, rr, 3, rgba(255, 226, 122, a));
        p.strokeCircle(x, y, rr * 0.6, 2, rgba(255, 246, 207, a));
      } else if (fx.kind === 'hit') {
        const a = Math.round(255 * t);
        for (let i = 0; i < 4; i++) {
          const ang = i * Math.PI / 2 + (1 - t);
          p.fillRect(x + Math.cos(ang) * 8 - 1, y + Math.sin(ang) * 8 - 1, 3, 3, rgba(255, 242, 192, a));
        }
      } else if (fx.kind === 'drawback') {
        // 弹弓蓄力：朝向后方被拉出的石子 + V 形皮带
        const a = Math.round(230 * t);
        const dx = fx.facing === 'left' ? -1 : fx.facing === 'right' ? 1 : 0;
        const dy = fx.facing === 'up' ? -1 : fx.facing === 'down' ? 1 : 0;
        const bx = x - dx * 10; const by = y - dy * 10;
        const base = fx.facing === 'left' ? Math.PI : fx.facing === 'right' ? 0
          : fx.facing === 'up' ? -Math.PI / 2 : Math.PI / 2;
        p.strokeArc(x + dx * 4, y + dy * 4, 9, base + Math.PI / 2, base + Math.PI * 1.5, 2, rgba(230, 220, 190, a));
        p.fillCircle(bx, by, 3, rgba(190, 184, 165, a));
      } else if (fx.kind === 'shockwave') {
        // 外推的半月冲击波扇
        const prog = 1 - t; const rr = (fx.radius || 40) * (0.3 + prog);
        const base = fx.facing === 'left' ? Math.PI : fx.facing === 'right' ? 0
          : fx.facing === 'up' ? -Math.PI / 2 : Math.PI / 2;
        const a = Math.round(200 * t);
        p.strokeArc(x, y, rr, base - 0.9, base + 0.9, 4, rgba(180, 220, 255, a));
        p.strokeArc(x, y, rr * 0.72, base - 0.8, base + 0.8, 2, rgba(232, 246, 255, a));
      } else if (fx.kind === 'harpcast') {
        const a = Math.round(170 * t);
        p.fillCircle(x, y, 18 * (1 - t) + 6, rgba(255, 226, 140, Math.round(a * 0.5)));
        p.strokeCircle(x, y, 22 * (1 - t) + 8, 3, rgba(255, 240, 190, a));
      } else if (fx.kind === 'soundwave') {
        const R = fx.radius || 120;
        for (let k = 0; k < 3; k++) {
          const phase = t - k * 0.18;
          if (phase <= 0 || phase > 1) continue;
          const rr = (1 - phase) * R;
          p.strokeCircle(x, y, rr, 3, rgba(255, 226, 122, Math.round(200 * phase)));
        }
        const notes = 6;
        for (let i = 0; i < notes; i++) {
          const ang = i * (Math.PI * 2 / notes) + (1 - t) * 1.2;
          const rr = (1 - t) * R * 0.8;
          const nx = x + Math.cos(ang) * rr; const ny = y + Math.sin(ang) * rr - (1 - t) * 10;
          const a = Math.round(230 * t);
          p.fillCircle(nx, ny, 3, rgba(255, 245, 200, a));
          p.fillRect(nx + 2, ny - 10, 2, 10, rgba(255, 245, 200, a));
        }
      } else if (fx.kind === 'critstar') {
        const a = Math.round(255 * t); const R = 10 + (1 - t) * 12;
        for (let i = 0; i < 8; i++) {
          const ang = i * Math.PI / 4;
          p.fillRect(x + Math.cos(ang) * R - 1, y + Math.sin(ang) * R - 1, 3, 3, rgba(255, 224, 90, a));
        }
      } else if (fx.kind === 'levelup') {
        const a = Math.round(220 * t); const rr = (1 - t) * 42;
        p.strokeCircle(x, y, rr, 4, rgba(255, 226, 120, a));
        p.strokeCircle(x, y, rr * 0.6, 2, rgba(255, 250, 210, a));
      }
    });
  }

  private drawStatsHud(G: GameCore): void {
    const x = 10;
    const need = 20 + G.player.level * 15;
    this.text(`Lv.${G.player.level}`, x, 52, 13, rgba(255, 226, 120), 'left', 'middle');
    const xb = x + 44; const xw = 116; const xy = 49;
    this.painter.fillRect(xb, xy, xw, 6, rgba(40, 40, 50));
    this.painter.fillRect(xb, xy, xw * Math.min(1, G.player.xp / need), 6, rgba(120, 200, 255));
    const a = G.player.attr; const d = G.derived;
    this.text(`力${a.str} 敏${a.dex} 体${a.vit} 信${a.fai}  护甲${d.armor} 暴击${Math.round(d.crit * 100)}%`,
      x, 68, 12, rgba(214, 210, 196));
  }

  private drawEquipPanel(): void {
    if (!this.core.equipPanelOpen) return;
    const G = this.core; const p = this.painter;
    const w = 580; const h = 400; const x = (VIEW_W - w) / 2; const y = (VIEW_H - h) / 2;
    p.fillRect(x, y, w, h, rgba(14, 11, 22, 236));
    p.fillRect(x, y, w, 3, rgba(224, 178, 80));
    this.text('装备 / 角色（C 关闭 · ↑↓ 选择背包 · 回车/空格 装备）', x + 16, y + 12, 15, rgba(255, 215, 102));
    const slots: Slot[] = ['focus', 'armor', 'helm', 'amulet', 'ring'];
    let sy = y + 46;
    slots.forEach((s) => {
      const it = G.player.equip[s];
      this.text(`${G.slotLabel(s)}：`, x + 16, sy, 14, rgba(207, 198, 184));
      if (it) this.text(it.name, x + 110, sy, 14, G.itemColor(it));
      else this.text('—', x + 110, sy, 14, rgba(120, 120, 130));
      sy += 24;
    });
    const a = G.player.attr; const d = G.derived; let ry = y + 46; const rx = x + 310;
    const lines = [
      `等级 Lv.${G.player.level}   经验 ${G.player.xp}/${20 + G.player.level * 15}`,
      `力量 STR ${a.str}    敏捷 DEX ${a.dex}`,
      `体力 VIT ${a.vit}    信心 FAI ${a.fai}`,
      `生命 ${Math.round(G.player.hp)}/${d.maxHp}`,
      `物攻 x${d.physMul.toFixed(2)}   驱邪 x${d.holyMul.toFixed(2)}`,
      `护甲 ${d.armor}  暴击 ${Math.round(d.crit * 100)}%  暴伤 ${Math.round(d.critMult * 100)}%`,
      `闪避 ${Math.round(d.dodge * 100)}%  攻速 +${Math.round((1 - d.cdScale) * 100)}%`,
    ];
    lines.forEach((ln) => { this.text(ln, rx, ry, 13, rgba(214, 210, 196)); ry += 22; });
    const by = y + 188;
    this.text(`背包（${G.player.bag.length}）`, x + 16, by, 14, rgba(255, 215, 102));
    const listY = by + 24; const rowH = 22; const maxRows = 8;
    if (G.player.bag.length === 0) {
      this.text('（空）拾取/开宝箱获得的装备会出现在这里', x + 18, listY, 13, rgba(150, 150, 160));
      return;
    }
    const start = Math.max(0, Math.min(G.bagSel - 3, G.player.bag.length - maxRows));
    for (let i = 0; i < maxRows; i++) {
      const idx = start + i;
      if (idx >= G.player.bag.length) break;
      const it = G.player.bag[idx];
      const ly = listY + i * rowH;
      if (idx === G.bagSel) p.fillRect(x + 12, ly - 2, w - 24, rowH, rgba(80, 70, 40, 150));
      this.text(`${G.slotLabel(it.slot)} · ${it.name}`, x + 18, ly, 13, G.itemColor(it));
      this.text(G.affixText(it).join('  ').trim(), x + 250, ly, 12, rgba(190, 186, 172));
    }
  }

  private nameTag(text: string, cx: number, cy: number, color: string): void {
    const w = text.length * 12 + 8;
    this.painter.fillRect(cx - w / 2, cy - 12, w, 14, rgba(14, 11, 22, 178));
    this.text(text, cx, cy - 5, 11, color, 'center', 'middle');
  }

  private enemyHpBar(cx: number, topY: number, e: { hp: number; maxHp: number; type: string }): void {
    const w = 46; const h = 5; const x = cx - w / 2; const y = topY;
    this.painter.fillRect(x - 1, y - 1, w + 2, h + 2, rgba(0, 0, 0, 153));
    this.painter.fillRect(x, y, w, h, rgba(0, 0, 0));
    const col = e.type === 'spirit' ? rgba(154, 127, 208) : rgba(217, 83, 79);
    this.painter.fillRect(x, y, w * Math.max(0, e.hp) / e.maxHp, h, col);
  }

  private drawHpBar(G: GameCore): void {
    const x = 10; const y = 30; const w = 160; const h = 14;
    this.painter.fillRect(x - 2, y - 2, w + 4, h + 4, rgba(14, 11, 22, 160));
    this.painter.fillRect(x, y, w, h, rgba(40, 30, 30));
    const pct = Math.max(0, G.player.hp) / G.player.maxHp;
    this.painter.fillRect(x, y, w * pct, h, rgba(210, 80, 80));
    this.text(`HP ${Math.max(0, G.player.hp)} / ${G.player.maxHp}`, x + w + 8, y + 7, 14, rgba(244, 236, 216), 'left', 'middle');
  }

  private drawWeaponHud(): void {
    const G = this.core;
    const order = GameData.weaponOrder;
    const y = VIEW_H - 22;
    this.painter.fillRect(8, y - 6, 300, 30, rgba(14, 11, 22, 153));
    let x = 16;
    order.forEach((id) => {
      const cur = id === G.weapon;
      const ready = !(cur && G.attackCD > 0);
      const label = GameData.weapons[id].label;
      const col = cur ? (ready ? rgba(255, 215, 102) : rgba(156, 139, 79)) : rgba(207, 198, 184);
      this.text(label, x, y + 8, 13, col, 'left', 'middle');
      if (cur) this.painter.fillRect(x, y + 18, label.length * 13, 2, ready ? rgba(255, 215, 102) : rgba(156, 139, 79));
      x += label.length * 13 + 18;
    });
  }

  private drawDialogue(): void {
    const line = this.core.currentLine();
    if (!this.core.dialogueActive() || !line) return;
    const boxX = 24; const boxY = VIEW_H - 128; const boxW = VIEW_W - 48; const boxH = 104;
    this.painter.fillRect(boxX, boxY, boxW, boxH, rgba(14, 11, 22, 224));
    this.painter.fillRect(boxX, boxY, boxW, 3, rgba(224, 178, 80));
    if (line.name) this.text(line.name, boxX + 16, boxY + 12, 15, rgba(255, 215, 102));
    this.textBlock(line.text, boxX + 16, boxY + (line.name ? 38 : 20), 17, rgba(244, 236, 216), boxW - 32);
  }

  private drawQuestLog(): void {
    if (!this.core.questLogOpen) return;
    const list = this.core.questList();
    const lines = list.map((q) => {
      const status = q.state === 'done' ? '[已完成]' : q.state === 'active' ? `[进行中 ${q.progress || ''}]` : '[未解锁]';
      return `${status} ${q.title}\n    ${q.state !== 'locked' ? q.desc : ''}`;
    });
    const w = 440; const h = 220; const x = (VIEW_W - w) / 2; const y = (VIEW_H - h) / 2;
    this.painter.fillRect(x, y, w, h, rgba(14, 11, 22, 230));
    this.painter.fillRect(x, y, w, 3, rgba(224, 178, 80));
    this.textBlock(`任务日志（按 Q 关闭）\n\n${lines.join('\n')}`, x + 16, y + 14, 15, rgba(244, 236, 216), w - 32);
  }

  private drawToast(): void {
    const y = 92;
    this.ctx.font = '16px sans-serif';
    const w = Math.min(560, this.ctx.measureText(this.toastMsg).width + 28);
    this.painter.fillRect((VIEW_W - w) / 2, y - 16, w, 30, rgba(14, 11, 22, 200));
    this.text(this.toastMsg, VIEW_W / 2, y, 16, rgba(255, 244, 214), 'center', 'middle');
  }

  private drawEnd(): void {
    this.painter.fillRect(0, 0, VIEW_W, VIEW_H, rgba(8, 10, 18, 210));
    this.textBlock(this.endText, VIEW_W / 2, 150, 18, rgba(244, 236, 216), 600, 'center');
  }

  /* ---------------- 触摸虚拟控件 ---------------- */
  private joyBase(): Btn { return { x: 40, y: VIEW_H - 150, w: 110, h: 110 }; }
  private atkBtn(): Btn { return { x: VIEW_W - 130, y: VIEW_H - 130, w: 90, h: 90 }; }
  private wBtns(): Btn[] {
    return [0, 1, 2].map((i) => ({ x: VIEW_W - 60, y: 60 + i * 58, w: 46, h: 46 }));
  }
  private logBtn(): Btn { return { x: VIEW_W - 60, y: 8, w: 46, h: 40 }; }

  private inBtn(b: Btn, x: number, y: number): boolean {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  private drawTouchControls(): void {
    const p = this.painter;
    const jb = this.joyBase();
    const jcx = jb.x + jb.w / 2; const jcy = jb.y + jb.h / 2;
    p.strokeCircle(jcx, jcy, jb.w / 2, 3, rgba(255, 255, 255, 60));
    const kx = jcx + this.joyDX * 34; const ky = jcy + this.joyDY * 34;
    p.fillCircle(kx, ky, 24, rgba(255, 255, 255, 80));
    const ab = this.atkBtn();
    p.fillCircle(ab.x + ab.w / 2, ab.y + ab.h / 2, ab.w / 2, rgba(220, 90, 80, 110));
    this.text('攻击', ab.x + ab.w / 2, ab.y + ab.h / 2, 16, rgba(255, 255, 255, 230), 'center', 'middle');
    const order = GameData.weaponOrder;
    this.wBtns().forEach((b, i) => {
      const cur = order[i] === this.core.weapon;
      p.fillRect(b.x, b.y, b.w, b.h, cur ? rgba(224, 178, 80, 150) : rgba(20, 18, 30, 130));
      this.text(`${i + 1}`, b.x + b.w / 2, b.y + b.h / 2, 18, rgba(255, 255, 255, 230), 'center', 'middle');
    });
    const lb = this.logBtn();
    p.fillRect(lb.x, lb.y, lb.w, lb.h, rgba(20, 18, 30, 130));
    this.text('日志', lb.x + lb.w / 2, lb.y + lb.h / 2, 13, rgba(255, 255, 255, 220), 'center', 'middle');
  }

  /* ---------------- 输入：键盘 ---------------- */
  keyDown(key: string): void {
    const c = this.core;
    if (c.equipPanelOpen) {
      switch (key) {
        case 'c': case 'C': c.toggleEquipPanel(); return;
        case 'ArrowUp': case 'w': case 'W': c.moveBagSel(-1); return;
        case 'ArrowDown': case 's': case 'S': c.moveBagSel(1); return;
        case 'Enter': case ' ': c.equipSelected(); return;
        default: return;
      }
    }
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': c.setMove('left', true); return;
      case 'ArrowRight': case 'd': case 'D': c.setMove('right', true); return;
      case 'ArrowUp': case 'w': case 'W': c.setMove('up', true); return;
      case 'ArrowDown': case 's': case 'S': c.setMove('down', true); return;
      case 'j': case 'J': case ' ': case 'Enter': this.pressAttackOrConfirm(); return;
      case 'c': case 'C': c.toggleEquipPanel(); return;
      case '1': c.setWeapon('sling'); return;
      case '2': c.setWeapon('staff'); return;
      case '3': c.setWeapon('harp'); return;
      case 'k': case 'K': c.cycleWeapon(); return;
      case 'q': case 'Q': c.toggleQuestLog(); return;
      case 'r': case 'R': if (this.finished) this.start(); return;
      default: break;
    }
  }

  keyUp(key: string): void {
    const c = this.core;
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': c.setMove('left', false); return;
      case 'ArrowRight': case 'd': case 'D': c.setMove('right', false); return;
      case 'ArrowUp': case 'w': case 'W': c.setMove('up', false); return;
      case 'ArrowDown': case 's': case 'S': c.setMove('down', false); return;
      case 'j': case 'J': case ' ': case 'Enter': c.setAttack(false); return;
      default: break;
    }
  }

  private pressAttackOrConfirm(): void {
    const c = this.core;
    if (this.finished) { this.start(); return; }
    if (c.dialogueActive()) { c.advanceDialogue(); return; }
    if (c.combatActive() && c.running && !c.busy) { c.setAttack(true); return; }
    c.confirm();
  }

  /* ---------------- 输入：指针/触摸 ---------------- */
  pointerDown(id: number, x: number, y: number): void {
    const c = this.core;
    if (this.finished) { this.start(); return; }
    if (c.dialogueActive()) { c.advanceDialogue(); return; }
    if (this.inBtn(this.logBtn(), x, y)) { c.toggleQuestLog(); return; }
    const wb = this.wBtns();
    for (let i = 0; i < wb.length; i++) {
      if (this.inBtn(wb[i], x, y)) { c.setWeapon(GameData.weaponOrder[i]); return; }
    }
    if (this.inBtn(this.atkBtn(), x, y)) {
      this.atkId = id;
      if (c.combatActive() && c.running && !c.busy) c.setAttack(true); else c.confirm();
      return;
    }
    // 否则当作摇杆
    if (this.joyId === -1) {
      const jb = this.joyBase();
      this.joyId = id; this.joyCX = jb.x + jb.w / 2; this.joyCY = jb.y + jb.h / 2;
      this.pointerMove(id, x, y);
    }
  }

  pointerMove(id: number, x: number, y: number): void {
    if (id !== this.joyId) return;
    const dx = x - this.joyCX; const dy = y - this.joyCY;
    const len = Math.hypot(dx, dy) || 1;
    this.joyDX = Math.max(-1, Math.min(1, dx / 40));
    this.joyDY = Math.max(-1, Math.min(1, dy / 40));
    const c = this.core;
    const th = 14;
    c.setMove('left', dx < -th); c.setMove('right', dx > th);
    c.setMove('up', dy < -th); c.setMove('down', dy > th);
    void len;
  }

  pointerUp(id: number): void {
    const c = this.core;
    if (id === this.joyId) {
      this.joyId = -1; this.joyDX = 0; this.joyDY = 0;
      c.setMove('left', false); c.setMove('right', false);
      c.setMove('up', false); c.setMove('down', false);
    }
    if (id === this.atkId) { this.atkId = -1; c.setAttack(false); }
  }

  /* ---------------- 输入：鼠标（暗黑式，桌面端） ---------------- */
  /** 屏幕坐标 → 世界坐标（按当前相机，不含抖动）。 */
  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const { camX, camY } = this.camera(0);
    return { x: sx + camX, y: sy + camY };
  }

  /** 鼠标移动：转发为核心瞄准点。 */
  mouseMove(sx: number, sy: number): void {
    const w = this.screenToWorld(sx, sy);
    this.core.mouseAim(w.x, w.y);
  }

  /** 鼠标左键按下：先处理结算/对白，否则换算到世界并交给核心（点地跑/点怪打）。 */
  mouseDownLeft(sx: number, sy: number): void {
    const c = this.core;
    if (this.finished) { this.start(); return; }
    if (c.dialogueActive()) { c.advanceDialogue(); return; }
    if (c.equipPanelOpen || c.questLogOpen) return;
    const w = this.screenToWorld(sx, sy);
    c.mouseDown(w.x, w.y);
  }

  /** 鼠标左键松开。 */
  mouseUpLeft(): void {
    this.core.mouseUp();
  }
}
