/* ============================================================
 * GameCore.ts — 牧童大卫 第一章 · 纯逻辑核心（引擎无关）
 * 实时 ARPG 战斗、移动碰撞、任务流程、对白状态机。
 * 不依赖 Cocos / DOM，可用 node 直接跑逻辑验证（见 tools/coretest.ts）。
 * 渲染层（Cocos GameController）只读取本类的状态来绘制，并把输入转发进来。
 * ============================================================ */

import {
  GameData, TILE, MAP_COLS, MAP_ROWS, SOLID_TILES,
} from './GameData';
import {
  DialogueLine, Effect, Enemy, Facing, IGameView, LostSheep, Phase, Player,
  Projectile, QuestEntry,
} from './types';

const VIEW_W = 800;
const VIEW_H = 576;
const MAP_W = MAP_COLS * TILE;
const MAP_H = MAP_ROWS * TILE;
const SPEED = 2.4;

// 脚部碰撞盒：在 32 格底部
const HB = { ox: 7, oy: 16, w: 18, h: 14 };

interface Vec { x: number; y: number; }
interface DialogueState {
  active: boolean;
  queue: DialogueLine[];
  current: DialogueLine | null;
  onDone: (() => void) | null;
}
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attack: boolean;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function facingVec(f: Facing): Vec {
  return f === 'left' ? { x: -1, y: 0 } : f === 'right' ? { x: 1, y: 0 }
    : f === 'up' ? { x: 0, y: -1 } : { x: 0, y: 1 };
}
function dist(a: Vec, b: Vec): number { return Math.hypot(a.x - b.x, a.y - b.y); }

export class GameCore {
  readonly VIEW_W = VIEW_W;
  readonly VIEW_H = VIEW_H;
  readonly MAP_W = MAP_W;
  readonly MAP_H = MAP_H;

  map: number[][] = GameData.buildMap();
  running = false;
  phase: Phase = 'intro';
  player: Player = {
    x: 0, y: 0, facing: 'down', hp: 20, maxHp: 20, atk: 5,
    moving: false, animTimer: 0, frame: 0,
  };
  input: InputState = { left: false, right: false, up: false, down: false, attack: false };

  lostSheep: LostSheep[] = [];
  sheepCollected = 0;
  lionActive = false;
  lionDefeated = false;
  spiritActive = false;
  spiritDefeated = false;
  busy = false;
  battles = 0;
  questLogOpen = false;

  /* ---- 即时战斗 ---- */
  weapon = 'sling';
  attackCD = 0;
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  enemy: Enemy | null = null;
  hintShown = false;
  shake = 0;
  playerHurt = 0;

  dlg: DialogueState = { active: false, queue: [], current: null, onDone: null };

  private view: IGameView;

  constructor(view: IGameView) {
    this.view = view;
  }

  /* ---------------- 生命周期 ---------------- */
  start(): void {
    this.reset();
    this.running = true;
    this.busy = true;
    this.showDialogue(GameData.dialogue.intro, () => {
      this.view.toast('用方向键 / WASD 走到父亲身边，按空格交谈');
      this.busy = false;
    });
  }

  reset(): void {
    this.map = GameData.buildMap();
    const ps = GameData.playerStart;
    this.phase = 'intro';
    this.player.x = ps.c * TILE;
    this.player.y = ps.r * TILE;
    this.player.facing = 'down';
    this.player.hp = GameData.playerStats.maxHp;
    this.player.maxHp = GameData.playerStats.maxHp;
    this.player.atk = GameData.playerStats.atk;
    this.player.moving = false;
    this.player.animTimer = 0;
    this.player.frame = 0;
    this.lostSheep = GameData.lostSheep.map((s) => ({ ...s, taken: false }));
    this.sheepCollected = 0;
    this.lionActive = false;
    this.lionDefeated = false;
    this.spiritActive = false;
    this.spiritDefeated = false;
    this.battles = 0;
    this.weapon = 'sling';
    this.attackCD = 0;
    this.projectiles = [];
    this.effects = [];
    this.enemy = null;
    this.hintShown = false;
    this.shake = 0;
    this.playerHurt = 0;
    this.input = { left: false, right: false, up: false, down: false, attack: false };
    this.dlg = { active: false, queue: [], current: null, onDone: null };
    this.questLogOpen = false;
  }

  /** 每帧推进一次世界（固定步长，与原 Web 版按帧一致）。 */
  update(): void {
    if (!this.running) return;
    if (this.busy || this.dlg.active || this.questLogOpen) return;
    this.updatePlayer();
    this.updateCombat();
  }

  /* ---------------- 任务目标文本 ---------------- */
  objectiveText(): string {
    switch (this.phase) {
      case 'intro': return '去和父亲耶西谈谈';
      case 'q1': return `找回走失的羊  ${this.sheepCollected}/3`;
      case 'q1done': return '回去向父亲耶西复命';
      case 'q2': return '前往东边山洞，击退猛狮（弹弓/杖杆）';
      case 'q3': return '夜幕降临：用「弹琴赞美」(3) 驱走羊圈旁的邪灵';
      case 'done': return '第一章完成！';
      default: return '—';
    }
  }

  questList(): QuestEntry[] {
    const order: Record<Phase, number> = {
      intro: 0, q1: 1, q1done: 1, q2: 2, q3: 3, done: 4,
    };
    const p = order[this.phase];
    return [
      {
        title: '清晨的牧场', desc: '去和父亲耶西谈谈',
        state: p > 0 ? 'done' : 'active',
      },
      {
        title: '找回走失的羊', desc: '走近走失的羊，带它们回羊圈',
        state: p < 1 ? 'locked' : (this.sheepCollected >= 3 ? 'done' : 'active'),
        progress: `${this.sheepCollected}/3`,
      },
      {
        title: '守护羊群·击退猛狮', desc: '实时战斗：弹弓远程、杖杆近战，可边跑边打',
        state: this.lionDefeated ? 'done' : (this.phase === 'q2' ? 'active' : 'locked'),
      },
      {
        title: '夜半驱邪·弹琴赞美', desc: '邪灵免疫物理，唯有弹琴赞美能驱散它',
        state: this.spiritDefeated ? 'done' : (this.phase === 'q3' ? 'active' : 'locked'),
      },
    ];
  }

  /* ---------------- 对白状态机 ---------------- */
  showDialogue(lines: DialogueLine[], onDone?: () => void): void {
    this.dlg.queue = lines.slice();
    this.dlg.onDone = onDone || null;
    this.dlg.active = true;
    this.nextLine();
  }

  private nextLine(): void {
    if (this.dlg.queue.length === 0) {
      this.endDialogue();
      return;
    }
    this.dlg.current = this.dlg.queue.shift() as DialogueLine;
  }

  private endDialogue(): void {
    this.dlg.active = false;
    this.dlg.current = null;
    const cb = this.dlg.onDone;
    this.dlg.onDone = null;
    if (cb) cb();
  }

  dialogueActive(): boolean { return this.dlg.active; }
  currentLine(): DialogueLine | null { return this.dlg.current; }

  /** 推进对白；返回 true 表示消费了这次输入 */
  advanceDialogue(): boolean {
    if (!this.dlg.active) return false;
    this.nextLine();
    return true;
  }

  /* ---------------- 碰撞 ---------------- */
  private solidAtPixel(px: number, py: number): boolean {
    if (px < 0 || py < 0 || px >= MAP_W || py >= MAP_H) return true;
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    return SOLID_TILES.has(this.map[r][c]);
  }
  private blocked(x: number, y: number): boolean {
    const l = x + HB.ox;
    const t = y + HB.oy;
    const rr = x + HB.ox + HB.w - 1;
    const b = y + HB.oy + HB.h - 1;
    return this.solidAtPixel(l, t) || this.solidAtPixel(rr, t)
      || this.solidAtPixel(l, b) || this.solidAtPixel(rr, b);
  }

  /* ---------------- 移动 ---------------- */
  private updatePlayer(): void {
    let dx = 0;
    let dy = 0;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;
    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;

    this.player.moving = (dx !== 0 || dy !== 0);
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    if (dx < 0) this.player.facing = 'left';
    else if (dx > 0) this.player.facing = 'right';
    else if (dy < 0) this.player.facing = 'up';
    else if (dy > 0) this.player.facing = 'down';

    // 分轴移动，可贴墙滑动
    const nx = this.player.x + dx * SPEED;
    if (!this.blocked(nx, this.player.y)) this.player.x = nx;
    const ny = this.player.y + dy * SPEED;
    if (!this.blocked(this.player.x, ny)) this.player.y = ny;

    // 行走动画
    if (this.player.moving) {
      this.player.animTimer++;
      if (this.player.animTimer > 8) { this.player.frame ^= 1; this.player.animTimer = 0; }
    } else {
      this.player.frame = 0;
    }

    this.checkSheepPickup();
  }

  playerCenter(): Vec { return { x: this.player.x + TILE / 2, y: this.player.y + TILE / 2 }; }
  private enemyCenter(e: Enemy): Vec { return { x: e.x + TILE / 2, y: e.y + TILE / 2 }; }
  private tileCenter(c: number, r: number): Vec { return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }; }

  /* ---------------- 羊：触碰拾取 ---------------- */
  private checkSheepPickup(): void {
    if (this.phase !== 'q1') return;
    const pc = this.playerCenter();
    for (const s of this.lostSheep) {
      if (s.taken) continue;
      if (dist(pc, this.tileCenter(s.c, s.r)) < 30) {
        s.taken = true;
        this.sheepCollected++;
        this.view.toast(`找到一只羊！(${this.sheepCollected}/3)`);
        if (this.sheepCollected >= 3) {
          this.phase = 'q1done';
          this.busy = true;
          this.showDialogue(GameData.dialogue.sheepFound, () => {
            this.view.toast('三只羊都找回来了，回去找父亲');
            this.busy = false;
          });
        }
        break;
      }
    }
  }

  /* ---------------- 互动（空格/回车）：仅与父亲耶西对话 ---------------- */
  interact(): void {
    const pc = this.playerCenter();
    const jesse = GameData.npcs[0];
    if (dist(pc, this.tileCenter(jesse.c, jesse.r)) < 52) this.talkToJesse();
  }

  /** 玩家是否站在可与父亲对话的范围内（渲染层用于画交互提示）。 */
  canTalkToJesse(): boolean {
    const pc = this.playerCenter();
    const jesse = GameData.npcs[0];
    return !this.busy && dist(pc, this.tileCenter(jesse.c, jesse.r)) < 52;
  }

  private talkToJesse(): void {
    this.busy = true;
    if (this.phase === 'intro') {
      this.showDialogue(GameData.dialogue.jesseQuest1, () => {
        this.phase = 'q1';
        this.view.toast('新任务：找回走失的羊');
        this.busy = false;
      });
    } else if (this.phase === 'q1') {
      this.showDialogue(GameData.dialogue.jesseQuest1Progress, () => { this.busy = false; });
    } else if (this.phase === 'q1done') {
      this.showDialogue(GameData.dialogue.jesseQuest1Done, () => {
        this.phase = 'q2';
        this.lionActive = true;
        this.spawnEnemy('lion');
        this.view.toast('实时战斗：J/空格 攻击 · 1/2/3 切换武器 · 可边跑边打');
        this.busy = false;
      });
    } else if (this.phase === 'q2') {
      this.showDialogue(GameData.dialogue.jesseQuest2, () => { this.busy = false; });
    } else {
      this.showDialogue([{ name: '父亲耶西', text: '好孩子，今天辛苦你了。' }], () => { this.busy = false; });
    }
  }

  /* ---------------- 即时战斗 ---------------- */
  spawnEnemy(key: string): void {
    const def = GameData.enemies[key];
    const pos = key === 'lion' ? GameData.lion : GameData.spirit;
    this.enemy = {
      key, name: def.name, type: def.type, sprite: def.sprite,
      x: pos.c * TILE, y: pos.r * TILE,
      hp: def.maxHp, maxHp: def.maxHp, atk: def.atk, spd: def.spd,
      aggro: def.aggro, touchRange: def.touchRange, touchMax: def.touchCD,
      touchCD: 0, greeted: false, dead: false, hurt: 0,
    };
  }

  setWeapon(id: string): void {
    if (!this.running || this.busy) return;
    if (this.weapon === id) return;
    this.weapon = id;
    const w = GameData.weapons[id];
    this.view.toast(`武器：${w.name} — ${w.hint}`, 1100);
  }
  cycleWeapon(): void {
    const order = GameData.weaponOrder;
    const i = order.indexOf(this.weapon);
    this.setWeapon(order[(i + 1) % order.length]);
  }

  tryAttack(): void {
    if (!this.enemy || this.busy) return;
    if (this.attackCD > 0) return;
    const wpn = GameData.weapons[this.weapon];
    this.attackCD = wpn.cd;
    const pc = this.playerCenter();
    const dir = facingVec(this.player.facing);

    if (this.weapon === 'sling') {
      this.projectiles.push({
        x: pc.x, y: pc.y,
        vx: dir.x * (wpn.projSpeed as number),
        vy: dir.y * (wpn.projSpeed as number),
        life: wpn.projLife as number,
      });
    } else if (this.weapon === 'staff') {
      this.effects.push({
        kind: 'slash', x: pc.x + dir.x * 22, y: pc.y + dir.y * 22,
        facing: this.player.facing, life: 10, max: 10,
      });
      const e = this.enemy;
      if (e && !e.dead && dist(pc, this.enemyCenter(e)) < (wpn.reach as number)) this.damageEnemy(wpn);
    } else if (this.weapon === 'harp') {
      this.effects.push({ kind: 'wave', x: pc.x, y: pc.y, life: 28, max: 28, radius: wpn.radius });
      const e = this.enemy;
      if (e && !e.dead && dist(pc, this.enemyCenter(e)) < (wpn.radius as number)) this.damageEnemy(wpn);
    }
  }

  private damageEnemy(wpn: typeof GameData.weapons[string]): void {
    const e = this.enemy;
    if (!e || e.dead) return;
    if (e.type === 'spirit') {
      if (wpn.kind === 'harp') {
        const dmg = rand(wpn.minDmg, wpn.maxDmg);
        e.hp = Math.max(0, e.hp - dmg); e.hurt = 12; this.shake = 6;
        this.view.toast(`圣洁琴声驱邪！-${dmg}`, 900);
      } else {
        e.hp = Math.max(0, e.hp - 1); e.hurt = 6;
        if (!this.hintShown) {
          this.view.toast('物理攻击对邪灵几乎无效！改用「弹琴赞美」(按 3)', 2200);
          this.hintShown = true;
        }
      }
    } else { // beast
      if (wpn.kind === 'harp') {
        e.atk = Math.max(2, e.atk - 1);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        this.view.toast('弹琴安抚，猛狮气势稍减', 900);
      } else {
        const dmg = rand(wpn.minDmg, wpn.maxDmg);
        e.hp = Math.max(0, e.hp - dmg); e.hurt = 12; this.shake = 6;
      }
    }
    if (e.hp <= 0 && !e.dead) { e.dead = true; this.onEnemyDefeated(e.key); }
  }

  private hitPlayer(): void {
    const e = this.enemy;
    if (!e) return;
    const dmg = rand(Math.max(1, e.atk - 1), e.atk + 2);
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.shake = 6; this.playerHurt = 12;
    if (this.player.hp <= 0) this.playerDown();
  }

  private onEnemyDefeated(key: string): void {
    this.enemy = null;
    this.projectiles = [];
    this.effects = [];
    this.busy = true;
    if (key === 'lion') {
      this.lionDefeated = true; this.lionActive = false;
      this.showDialogue(GameData.dialogue.lionDefeated, () => {
        this.showDialogue(GameData.dialogue.nightFall, () => {
          this.phase = 'q3';
          this.player.x = 9 * TILE; this.player.y = 23 * TILE; this.player.facing = 'up';
          this.spawnEnemy('spirit');
          this.spiritActive = true;
          this.weapon = 'harp';
          this.view.toast('夜战！用「弹琴赞美」(3) 驱散邪灵', 2200);
          this.busy = false;
        });
      });
    } else { // spirit
      this.spiritDefeated = true; this.spiritActive = false;
      this.showDialogue(GameData.dialogue.spiritDefeated, () => {
        this.phase = 'done';
        this.finishChapter();
      });
    }
  }

  private playerDown(): void {
    this.busy = true;
    this.projectiles = [];
    this.effects = [];
    this.player.hp = this.player.maxHp;
    const e = this.enemy;
    if (e) {
      const def = GameData.enemies[e.key];
      const pos = e.key === 'lion' ? GameData.lion : GameData.spirit;
      e.hp = e.maxHp; e.atk = def.atk; e.x = pos.c * TILE; e.y = pos.r * TILE;
      e.touchCD = 0; e.dead = false; e.greeted = true; e.hurt = 0;
    }
    let line: DialogueLine[];
    if (this.phase === 'q3') {
      this.player.x = 9 * TILE; this.player.y = 23 * TILE; this.player.facing = 'up';
      line = [{ name: '旁白', text: '邪灵的阴影压得大卫几乎窒息……稳住心神，再弹起竖琴!' }];
    } else {
      // 退到山洞西侧的小路上，与猛狮拉开距离再战
      this.player.x = 26 * TILE; this.player.y = 22 * TILE; this.player.facing = 'right';
      line = [{ name: '旁白', text: '大卫被猛狮扑退……他退到路上，深吸一口气，握紧投石索再来一次!' }];
    }
    this.showDialogue(line, () => { this.busy = false; });
  }

  private updateProjectiles(): void {
    const e = this.enemy;
    const sling = GameData.weapons.sling;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      let remove = false;
      if (p.life <= 0 || this.solidAtPixel(p.x, p.y)) {
        remove = true;
      } else if (e && !e.dead && dist(p, this.enemyCenter(e)) < (sling.hitR as number)) {
        this.damageEnemy(sling);
        this.effects.push({ kind: 'hit', x: p.x, y: p.y, life: 8, max: 8 });
        remove = true;
      }
      if (remove) this.projectiles.splice(i, 1);
    }
  }

  private updateEnemy(): void {
    const e = this.enemy;
    if (!e || e.dead) return;
    const pc = this.playerCenter();
    const ec = this.enemyCenter(e);
    const d = dist(pc, ec);

    // 首次接近 → 触发登场对白
    if (!e.greeted && d < 175) {
      e.greeted = true;
      this.busy = true;
      const lines = e.key === 'lion' ? GameData.dialogue.lionApproach
        : GameData.dialogue.spiritApproach;
      this.showDialogue(lines, () => { this.busy = false; });
      return;
    }
    if (!e.greeted) return;

    // 追逐（在仇恨范围内）
    if (d < e.aggro && d > 1) {
      const vx = (pc.x - ec.x) / d;
      const vy = (pc.y - ec.y) / d;
      e.x += vx * e.spd; e.y += vy * e.spd;
      // 限制在地图内
      e.x = Math.max(TILE, Math.min(e.x, MAP_W - TILE * 2));
      e.y = Math.max(TILE, Math.min(e.y, MAP_H - TILE * 2));
    }

    // 接触造成伤害
    if (e.touchCD > 0) e.touchCD--;
    if (d < e.touchRange && e.touchCD <= 0) {
      this.hitPlayer();
      e.touchCD = e.touchMax;
    }
  }

  private updateEffects(): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (--this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
  }

  private updateCombat(): void {
    if (this.attackCD > 0) this.attackCD--;
    if (this.input.attack) this.tryAttack();
    this.updateProjectiles();
    this.updateEnemy();
    this.updateEffects();
    if (this.shake > 0) this.shake--;
    if (this.playerHurt > 0) this.playerHurt--;
  }

  private finishChapter(): void {
    this.running = false;
    this.view.onFinish({ hp: this.player.hp, maxHp: this.player.maxHp });
  }

  /* ---------------- 输入入口（供渲染层转发） ---------------- */
  setMove(dir: 'left' | 'right' | 'up' | 'down', down: boolean): void {
    this.input[dir] = down;
  }
  setAttack(down: boolean): void {
    this.input.attack = down;
  }
  /** 空格 / 回车：对白中推进；战斗中无敌人时与父亲对话 */
  confirm(): void {
    if (this.dlg.active) { this.advanceDialogue(); return; }
    if (this.running && !this.busy && !this.questLogOpen && !this.enemy) {
      this.interact();
    }
  }
  toggleQuestLog(): boolean {
    if (this.dlg.active) return this.questLogOpen;
    this.questLogOpen = !this.questLogOpen;
    return this.questLogOpen;
  }
}
