/* ============================================================
 * GameController.ts — 牧童大卫 第一章 · Cocos 渲染 / 输入适配层
 * 引擎相关的薄层：把纯逻辑核心 GameCore 的状态画到 Cocos Graphics，
 * 并把键盘 / 触摸输入转发进核心。所有 UI 都画在画布上（无 DOM），
 * 因此可直接构建为微信小游戏。
 *
 * 使用：在场景的 Canvas 下新建一个空节点，挂上本组件即可（运行时自建子节点）。
 * 详见仓库根目录 COCOS.md。
 * ============================================================ */

import {
  _decorators, Component, Node, Graphics, Label, UITransform, Layers,
  input, Input, EventKeyboard, KeyCode, EventTouch, Vec3,
} from 'cc';
import { GameCore } from './core/GameCore';
import {
  GameData, TILE, MAP_COLS, MAP_ROWS,
} from './core/GameData';
import { FinishStats, IGameView } from './core/types';
import { Painter, rgba, toColor } from './Painter';
import * as Sprites from './Sprites';

const { ccclass } = _decorators;

const VIEW_W = 800;
const VIEW_H = 576;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const STEP = 1 / 60;

@ccclass('GameController')
export class GameController extends Component implements IGameView {
  private core!: GameCore;
  private painter!: Painter;
  private stage!: Node;

  // 文本节点
  private lblObjective!: Label;
  private lblHp!: Label;
  private lblToast!: Label;
  private lblDlgName!: Label;
  private lblDlgText!: Label;
  private lblHint!: Label;
  private lblJesse!: Label;
  private lblEnemy!: Label;
  private lblWeapons: Label[] = [];
  private lblQuest!: Label;
  private lblEnd!: Label;

  private acc = 0;
  private toastTimer = 0;
  private animClock = 0; // 用于漂浮/呼吸动画
  private finished = false;

  /* ---------------- 生命周期 ---------------- */
  onLoad(): void {
    this.buildNodes();
    this.core = new GameCore(this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    input.on(Input.EventType.TOUCH_START, this.onTouch, this);
  }

  start(): void {
    this.startGame();
  }

  onDestroy(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    input.off(Input.EventType.TOUCH_START, this.onTouch, this);
  }

  startGame(): void {
    this.finished = false;
    this.lblEnd.node.active = false;
    this.core.start();
  }

  /* ---------------- 节点构建（运行时程序化） ---------------- */
  private mkNode(name: string): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform);
    this.stage.addChild(n);
    return n;
  }

  private mkLabel(name: string, fontSize: number, color: string,
    anchorX: number, anchorY: number, hAlign: number, wrapWidth = 0): Label {
    const n = this.mkNode(name);
    const ut = n.getComponent(UITransform) as UITransform;
    ut.setAnchorPoint(anchorX, anchorY);
    const lb = n.addComponent(Label);
    lb.fontSize = fontSize;
    lb.lineHeight = fontSize + 6;
    lb.color = toColor(color);
    lb.useSystemFont = true;
    lb.horizontalAlign = hAlign;
    lb.verticalAlign = Label.VerticalAlign.TOP;
    if (wrapWidth > 0) {
      lb.overflow = Label.Overflow.RESIZE_HEIGHT;
      lb.enableWrapText = true;
      ut.setContentSize(wrapWidth, fontSize + 6);
    } else {
      lb.overflow = Label.Overflow.NONE;
    }
    return lb;
  }

  private buildNodes(): void {
    // stage：以画布中心为原点的容器
    this.stage = new Node('Stage');
    this.stage.layer = Layers.Enum.UI_2D;
    this.stage.addComponent(UITransform).setContentSize(VIEW_W, VIEW_H);
    this.node.addChild(this.stage);
    this.stage.setPosition(0, 0, 0);

    // Graphics 绘制层（最底）
    const gfx = this.mkNode('Gfx');
    const g = gfx.addComponent(Graphics);
    this.painter = new Painter(g, VIEW_W, VIEW_H);

    // 文本层（在 Graphics 之上）
    const white = rgba(244, 236, 216);
    this.lblObjective = this.mkLabel('Objective', 16, rgba(255, 222, 120),
      0, 1, Label.HorizontalAlign.LEFT);
    this.lblHp = this.mkLabel('Hp', 14, white, 0, 1, Label.HorizontalAlign.LEFT);
    this.lblToast = this.mkLabel('Toast', 16, white, 0.5, 0.5, Label.HorizontalAlign.CENTER, 560);
    this.lblToast.node.active = false;
    this.lblDlgName = this.mkLabel('DlgName', 15, rgba(255, 215, 102),
      0, 1, Label.HorizontalAlign.LEFT);
    this.lblDlgText = this.mkLabel('DlgText', 17, white, 0, 1, Label.HorizontalAlign.LEFT, VIEW_W - 96);
    this.lblHint = this.mkLabel('Hint', 14, rgba(224, 178, 80), 0.5, 0.5, Label.HorizontalAlign.CENTER);
    this.lblHint.node.active = false;
    this.lblJesse = this.mkLabel('JesseTag', 11, white, 0.5, 0.5, Label.HorizontalAlign.CENTER);
    this.lblEnemy = this.mkLabel('EnemyTag', 11, white, 0.5, 0.5, Label.HorizontalAlign.CENTER);
    this.lblEnemy.node.active = false;
    for (let i = 0; i < 3; i++) {
      this.lblWeapons.push(this.mkLabel(`Weapon${i}`, 13, white, 0, 0.5, Label.HorizontalAlign.LEFT));
    }
    this.lblQuest = this.mkLabel('QuestLog', 15, white, 0, 1, Label.HorizontalAlign.LEFT, 420);
    this.lblQuest.node.active = false;
    this.lblEnd = this.mkLabel('End', 18, white, 0.5, 0.5, Label.HorizontalAlign.CENTER, 600);
    this.lblEnd.node.active = false;
  }

  /* ---------------- IGameView 回调 ---------------- */
  toast(msg: string, ms = 1800): void {
    this.lblToast.string = msg;
    this.lblToast.node.active = true;
    this.toastTimer = ms / 1000;
  }

  onFinish(stats: FinishStats): void {
    this.finished = true;
    this.lblEnd.string = `第一章 · 牧童大卫 — 完成！\n\n`
      + `大卫靠着对耶和华的信心，找回走失的羊，\n`
      + `击退猛狮，并以赞美的琴声驱散了邪灵。\n\n`
      + `剩余生命：${stats.hp} / ${stats.maxHp}\n\n`
      + `按 R 重新开始`;
    this.lblEnd.node.active = true;
  }

  /* ---------------- 输入 ---------------- */
  private onKeyDown(e: EventKeyboard): void {
    const c = this.core;
    switch (e.keyCode) {
      case KeyCode.ARROW_LEFT: case KeyCode.KEY_A: c.setMove('left', true); return;
      case KeyCode.ARROW_RIGHT: case KeyCode.KEY_D: c.setMove('right', true); return;
      case KeyCode.ARROW_UP: case KeyCode.KEY_W: c.setMove('up', true); return;
      case KeyCode.ARROW_DOWN: case KeyCode.KEY_S: c.setMove('down', true); return;
      case KeyCode.KEY_J: this.pressAttackOrConfirm(); return;
      case KeyCode.SPACE: case KeyCode.ENTER: this.pressAttackOrConfirm(); return;
      case KeyCode.DIGIT_1: c.setWeapon('sling'); return;
      case KeyCode.DIGIT_2: c.setWeapon('staff'); return;
      case KeyCode.DIGIT_3: c.setWeapon('harp'); return;
      case KeyCode.KEY_K: c.cycleWeapon(); return;
      case KeyCode.KEY_Q: c.toggleQuestLog(); return;
      case KeyCode.KEY_R: if (this.finished) this.startGame(); return;
      default: break;
    }
  }

  private pressAttackOrConfirm(): void {
    const c = this.core;
    if (this.finished) { this.startGame(); return; }
    if (c.dialogueActive()) { c.advanceDialogue(); return; }
    if (c.enemy && c.running && !c.busy) { c.setAttack(true); return; }
    c.confirm();
  }

  private onKeyUp(e: EventKeyboard): void {
    const c = this.core;
    switch (e.keyCode) {
      case KeyCode.ARROW_LEFT: case KeyCode.KEY_A: c.setMove('left', false); return;
      case KeyCode.ARROW_RIGHT: case KeyCode.KEY_D: c.setMove('right', false); return;
      case KeyCode.ARROW_UP: case KeyCode.KEY_W: c.setMove('up', false); return;
      case KeyCode.ARROW_DOWN: case KeyCode.KEY_S: c.setMove('down', false); return;
      case KeyCode.KEY_J: case KeyCode.SPACE: case KeyCode.ENTER: c.setAttack(false); return;
      default: break;
    }
  }

  private onTouch(_e: EventTouch): void {
    // 触摸：推进对白 / 通关后重开（移动端完整虚拟摇杆见 COCOS.md 的扩展说明）
    if (this.finished) { this.startGame(); return; }
    if (this.core.dialogueActive()) this.core.advanceDialogue();
  }

  /* ---------------- 主循环 ---------------- */
  update(dt: number): void {
    this.animClock += dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.lblToast.node.active = false;
    }
    // 固定步长推进核心，保持与原版按帧一致的手感
    if (!this.finished) {
      this.acc += dt;
      let guard = 0;
      while (this.acc >= STEP && guard++ < 5) { this.core.update(); this.acc -= STEP; }
    }
    this.render();
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

  /** 屏幕坐标(左上,y下) → stage 局部(中心,y上) */
  private scr2local(sx: number, sy: number): Vec3 {
    return new Vec3(sx - VIEW_W / 2, VIEW_H / 2 - sy, 0);
  }
  private placeLabel(lb: Label, sx: number, sy: number): void {
    const p = this.scr2local(sx, sy);
    lb.node.setPosition(p.x, p.y, 0);
  }

  private render(): void {
    const G = this.core;
    const p = this.painter;
    p.clear();
    const { camX, camY } = this.camera(G.shake);

    // 背景（地图外的黑边）
    p.fillRect(0, 0, VIEW_W, VIEW_H, rgba(20, 22, 28));

    // 可见瓦片
    const c0 = Math.floor(camX / TILE);
    const r0 = Math.floor(camY / TILE);
    const c1 = Math.min(MAP_COLS - 1, c0 + Math.ceil(VIEW_W / TILE) + 1);
    const r1 = Math.min(MAP_ROWS - 1, r0 + Math.ceil(VIEW_H / TILE) + 1);
    for (let r = Math.max(0, r0); r <= r1; r++) {
      for (let c = Math.max(0, c0); c <= c1; c++) {
        Sprites.tile(p, G.map[r][c], c * TILE - camX, r * TILE - camY);
      }
    }

    // 圈中装饰羊
    GameData.foldSheep.forEach((s) => {
      Sprites.sheep(p, s.c * TILE - camX, s.r * TILE - camY + 4, 2);
    });
    // 走失的羊
    G.lostSheep.forEach((s) => {
      if (!s.taken) Sprites.sheep(p, s.c * TILE - camX, s.r * TILE - camY + 4, 2);
    });
    // 跟随大卫的羊
    this.drawFollowers(camX, camY);

    // 父亲耶西 + 名牌
    const jesse = GameData.npcs[0];
    Sprites.jesse(p, jesse.c * TILE - camX, jesse.r * TILE - camY, 2);
    this.drawNameTag(this.lblJesse, jesse.name, jesse.c * TILE - camX + 16,
      jesse.r * TILE - camY - 4, rgba(244, 236, 216));

    // 互动提示
    if (G.canTalkToJesse()) {
      const bob = Math.sin(this.animClock * 5) * 2;
      this.lblHint.string = '空格 ▼';
      this.lblHint.node.active = true;
      this.placeLabel(this.lblHint, jesse.c * TILE - camX + 16, jesse.r * TILE - camY - 22 + bob);
    } else {
      this.lblHint.node.active = false;
    }

    // 飞石
    G.projectiles.forEach((pr) => this.drawProjectile(pr.x - camX, pr.y - camY));

    // 活体敌人 + 名牌 + 血条
    if (G.enemy) {
      const e = G.enemy;
      const sx = e.x - camX;
      const sy = e.y - camY;
      if (e.sprite === 'spirit') {
        const bob = Math.sin(this.animClock * 3.6) * 3;
        Sprites.spirit(p, sx - 6, sy - 10 + bob, 2.6, e.hurt > 0);
      } else {
        Sprites.lion(p, sx - 8, sy - 8, 3, e.hurt > 0);
      }
      const col = e.type === 'spirit' ? rgba(154, 127, 208) : rgba(217, 83, 79);
      this.drawNameTag(this.lblEnemy, e.name, sx + 16, sy - 14, col);
      this.drawEnemyHpBar(sx + 16, sy - 28, e);
      if (e.hurt > 0) e.hurt--;
    } else {
      this.lblEnemy.node.active = false;
    }

    // 攻击特效
    this.drawEffects(camX, camY);

    // 大卫（受击闪烁）
    let davidColor = 255;
    if (G.playerHurt > 0 && Math.floor(G.playerHurt / 3) % 2 === 0) davidColor = 115;
    this.drawDavid(G.player.x - camX, G.player.y - camY, G.player.facing, G.player.frame, davidColor);

    // 夜幕
    if (G.phase === 'q3' && !G.spiritDefeated) {
      p.fillRect(0, 0, VIEW_W, VIEW_H, rgba(14, 16, 46, 128));
    }

    // HUD：目标 + 血量
    this.lblObjective.string = `目标：${G.objectiveText()}`;
    this.placeLabel(this.lblObjective, 10, 8);
    this.drawHpBar(G);

    // 武器栏
    const showWeapon = !!G.enemy || G.phase === 'q2' || G.phase === 'q3';
    this.drawWeaponHud(showWeapon);

    // 对白框
    this.drawDialogue();

    // 任务日志
    this.drawQuestLog();
  }

  private drawDavid(x: number, y: number, facing: string, frame: number, alpha: number): void {
    // 通过临时设置 alpha——Sprites 内部用固定色，这里用半透明遮罩近似受击闪烁
    Sprites.david(this.painter, x, y, 2, facing, frame);
    if (alpha < 255) {
      this.painter.fillRect(x + 14, y + 2, 20, 30, rgba(120, 30, 40, 90));
    }
  }

  private drawProjectile(x: number, y: number): void {
    this.painter.fillCircle(x, y, 4, rgba(207, 202, 187));
    this.painter.fillCircle(x + 1, y + 1, 2, rgba(155, 150, 132));
  }

  private drawEffects(camX: number, camY: number): void {
    const p = this.painter;
    this.core.effects.forEach((fx) => {
      const x = fx.x - camX;
      const y = fx.y - camY;
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
      }
    });
  }

  private drawFollowers(camX: number, camY: number): void {
    const G = this.core;
    for (let i = 0; i < G.sheepCollected && i < 3; i++) {
      const fx = G.player.x - camX + (i - 1) * 10;
      const fy = G.player.y - camY + 18 + i * 4;
      if (G.phase === 'q1' || G.phase === 'q1done') Sprites.sheep(this.painter, fx, fy, 1.4);
    }
  }

  private drawNameTag(lb: Label, text: string, cx: number, cy: number, color: string): void {
    const w = text.length * 12 + 8;
    this.painter.fillRect(cx - w / 2, cy - 12, w, 14, rgba(14, 11, 22, 178));
    lb.string = text;
    lb.color = toColor(color);
    lb.node.active = true;
    this.placeLabel(lb, cx, cy - 5);
  }

  private drawEnemyHpBar(cx: number, topY: number, e: { hp: number; maxHp: number; type: string }): void {
    const w = 46;
    const h = 5;
    const x = cx - w / 2;
    const y = topY;
    this.painter.fillRect(x - 1, y - 1, w + 2, h + 2, rgba(0, 0, 0, 153));
    this.painter.fillRect(x, y, w, h, rgba(0, 0, 0));
    const col = e.type === 'spirit' ? rgba(154, 127, 208) : rgba(217, 83, 79);
    this.painter.fillRect(x, y, w * Math.max(0, e.hp) / e.maxHp, h, col);
  }

  private drawHpBar(G: GameCore): void {
    const x = 10;
    const y = 30;
    const w = 160;
    const h = 14;
    this.painter.fillRect(x - 2, y - 2, w + 4, h + 4, rgba(14, 11, 22, 160));
    this.painter.fillRect(x, y, w, h, rgba(40, 30, 30));
    const pct = Math.max(0, G.player.hp) / G.player.maxHp;
    this.painter.fillRect(x, y, w * pct, h, rgba(210, 80, 80));
    this.lblHp.string = `HP ${Math.max(0, G.player.hp)} / ${G.player.maxHp}`;
    this.placeLabel(this.lblHp, x + w + 8, y - 1);
  }

  private drawWeaponHud(show: boolean): void {
    if (!show) { this.lblWeapons.forEach((l) => { l.node.active = false; }); return; }
    const G = this.core;
    const order = GameData.weaponOrder;
    const y = VIEW_H - 22;
    this.painter.fillRect(8, y - 6, 300, 30, rgba(14, 11, 22, 153));
    let x = 16;
    order.forEach((id, i) => {
      const cur = id === G.weapon;
      const ready = !(cur && G.attackCD > 0);
      const lb = this.lblWeapons[i];
      const label = GameData.weapons[id].label;
      lb.string = label;
      lb.color = toColor(cur ? (ready ? rgba(255, 215, 102) : rgba(156, 139, 79)) : rgba(207, 198, 184));
      lb.node.active = true;
      this.placeLabel(lb, x, y + 8);
      if (cur) {
        this.painter.fillRect(x, y + 18, label.length * 13, 2,
          ready ? rgba(255, 215, 102) : rgba(156, 139, 79));
      }
      x += label.length * 13 + 18;
    });
  }

  private drawDialogue(): void {
    const line = this.core.currentLine();
    if (!this.core.dialogueActive() || !line) {
      this.lblDlgName.node.active = false;
      this.lblDlgText.node.active = false;
      return;
    }
    const boxX = 24;
    const boxY = VIEW_H - 128;
    const boxW = VIEW_W - 48;
    const boxH = 104;
    this.painter.fillRect(boxX, boxY, boxW, boxH, rgba(14, 11, 22, 224));
    this.painter.fillRect(boxX, boxY, boxW, 3, rgba(224, 178, 80));
    if (line.name) {
      this.lblDlgName.string = line.name;
      this.lblDlgName.node.active = true;
      this.placeLabel(this.lblDlgName, boxX + 16, boxY + 12);
    } else {
      this.lblDlgName.node.active = false;
    }
    this.lblDlgText.string = line.text;
    this.lblDlgText.node.active = true;
    this.placeLabel(this.lblDlgText, boxX + 16, boxY + (line.name ? 38 : 20));
  }

  private drawQuestLog(): void {
    if (!this.core.questLogOpen) { this.lblQuest.node.active = false; return; }
    const list = this.core.questList();
    const lines = list.map((q) => {
      const status = q.state === 'done' ? '[已完成]' : q.state === 'active'
        ? `[进行中 ${q.progress || ''}]` : '[未解锁]';
      return `${status} ${q.title}\n    ${q.state !== 'locked' ? q.desc : ''}`;
    });
    const w = 440;
    const h = 220;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    this.painter.fillRect(x, y, w, h, rgba(14, 11, 22, 230));
    this.painter.fillRect(x, y, w, 3, rgba(224, 178, 80));
    this.lblQuest.string = `任务日志（按 Q 关闭）\n\n${lines.join('\n')}`;
    this.lblQuest.node.active = true;
    this.placeLabel(this.lblQuest, x + 16, y + 14);
  }
}
