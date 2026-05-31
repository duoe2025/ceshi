/* ============================================================
 * GameCore.ts — 牧童大卫 第一章 · 纯逻辑核心（引擎无关）
 * 实时 ARPG 战斗、暗黑式属性/装备/掉落、移动碰撞、任务流程、对白状态机。
 * 不依赖 Cocos / DOM，可用 node 直接跑逻辑验证（见 tools/coretest.ts）。
 * 渲染层（CanvasGame）只读取本类的状态来绘制，并把输入转发进来。
 * 数值/装备规格见 docs/开发计划.md 第二部分。
 * ============================================================ */

import {
  GameData, TILE, MAP_COLS, MAP_ROWS, SOLID_TILES,
} from './GameData';
import {
  DerivedStats, DialogueLine, Effect, Enemy, Facing, GroundItem, IGameView,
  Item, LostSheep, Phase, Player, Popup, Projectile, QuestEntry, Slot,
} from './types';
import {
  defaultAttributes, derive, emptyEquipment, reduction, scoreItem,
  weaponDamage, xpToNext, levelUpAttributes,
} from './Stats';
import { affixLabel, rarityColor, rarityName, rollChestLoot, rollLoot } from './Items';

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
interface Chest { x: number; y: number; level: number; opened: boolean; }
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
    level: 1, xp: 0, attr: defaultAttributes(), equip: emptyEquipment(),
    bag: [], stamina: 50, maxStamina: 50,
  };
  input: InputState = { left: false, right: false, up: false, down: false, attack: false };

  /* ---- 暗黑式鼠标操作（点地跑动 / 点怪追击 / 朝光标攻击） ---- */
  moveTarget: Vec | null = null;   // 左键点地：奔跑目标点（世界坐标）
  attackTarget: Enemy | null = null; // 左键点怪：追击并攻击的目标
  private aimPoint: Vec | null = null; // 光标世界坐标（用于攻击瞄准）
  private mouseHeld = false;       // 左键是否按住（按住持续跟随光标）

  lostSheep: LostSheep[] = [];
  sheepCollected = 0;
  lionActive = false;
  lionDefeated = false;
  spiritActive = false;
  spiritDefeated = false;
  busy = false;
  battles = 0;
  questLogOpen = false;
  equipPanelOpen = false;
  bagSel = 0;

  /* ---- 即时战斗 ---- */
  weapon = 'sling';
  attackCD = 0;
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  popups: Popup[] = [];
  enemy: Enemy | null = null; // 主线首领（猛狮/邪灵）
  ambient: Enemy[] = []; // 游荡小怪
  groundItems: GroundItem[] = [];
  chests: Chest[] = [];
  ambientEnabled = true;
  hintShown = false;
  shake = 0;
  playerHurt = 0;

  /* ---- 儿童版灵魂层（M10）：穿越开场 / 恐惧条 / 安静祷告 / 诗篇碎片 ---- */
  childMode = true;        // 儿童版：开场穿越叙事 + 恐惧条影响 + 诗篇收集
  fear = 0;                // 恐惧值 0~maxFear：夜战/受击升高，满则移动慢、瞄准晃
  readonly maxFear = 100;
  prayCD = 0;              // 安静祷告冷却帧（避免连点）
  psalms: string[] = [];   // 已收集的诗篇碎片 id（去重）

  derived: DerivedStats = derive(this.player.attr, this.player.equip);

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
    // 儿童版：先放穿越开场（现代孩子翻开圣经→进入伯利恒），再接清晨牧场旁白
    const opening = this.childMode
      ? [...GameData.dialogue.prologue, ...GameData.dialogue.intro]
      : GameData.dialogue.intro;
    this.showDialogue(opening, () => {
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
    this.player.moving = false;
    this.player.animTimer = 0;
    this.player.frame = 0;
    this.player.level = 1;
    this.player.xp = 0;
    this.player.attr = defaultAttributes();
    this.player.equip = emptyEquipment();
    this.player.bag = [];
    this.recomputeDerived(true);
    this.player.atk = GameData.playerStats.atk;
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
    this.popups = [];
    this.enemy = null;
    this.ambient = [];
    this.groundItems = [];
    this.chests = GameData.chests.map((c) => ({
      x: c.c * TILE, y: c.r * TILE, level: c.level, opened: false,
    }));
    this.hintShown = false;
    this.shake = 0;
    this.playerHurt = 0;
    this.fear = 0;
    this.prayCD = 0;
    this.psalms = [];
    this.input = { left: false, right: false, up: false, down: false, attack: false };
    this.moveTarget = null;
    this.attackTarget = null;
    this.aimPoint = null;
    this.mouseHeld = false;
    this.dlg = { active: false, queue: [], current: null, onDone: null };
    this.questLogOpen = false;
    this.equipPanelOpen = false;
    this.bagSel = 0;
  }

  /** 每帧推进一次世界（固定步长）。 */
  update(): void {
    if (!this.running) return;
    this.tickFear(); // 恐惧/祷告冷却始终推进（即便在对白/面板中）
    if (this.busy || this.dlg.active || this.questLogOpen || this.equipPanelOpen) return;
    this.updatePlayer();
    this.updateCombat();
  }

  /* ---------------- 儿童版灵魂层：恐惧条 / 安静祷告 / 诗篇碎片 ---------------- */
  /** 恐惧随时间缓降；无敌人在场时恢复更快。祷告冷却递减。 */
  private tickFear(): void {
    if (this.prayCD > 0) this.prayCD--;
    if (this.fear > 0) {
      const calm = this.combatActive() ? 0.04 : 0.16; // 战斗中恢复慢
      this.fear = Math.max(0, this.fear - calm);
    }
  }

  /** 升高恐惧（受击、夜幕、巨兽逼近时调用），钳制在 0~maxFear。 */
  addFear(n: number): void {
    this.fear = Math.max(0, Math.min(this.maxFear, this.fear + n));
  }

  fearPct(): number { return this.fear / this.maxFear; }
  /** 恐惧偏高（>=70%）：移动变慢、瞄准晃动。 */
  feared(): boolean { return this.fearPct() >= 0.7; }
  /** 恐惧导致的移动速度乘数（越怕越慢，最低 0.55）。 */
  private fearSpeedMul(): number {
    if (!this.childMode || !this.feared()) return 1;
    return 0.55 + (1 - this.fearPct()) * 1.5; // fear=70%→~1.0 起步，满恐惧→0.55
  }

  /** 安静祷告（按 P）：非魔法——不加攻击力，只让恐惧下降、心神安定。
   * 返回是否成功触发（冷却中或不可操作时返回 false）。 */
  pray(): boolean {
    if (!this.running || this.busy || this.dlg.active) return false;
    if (this.questLogOpen || this.equipPanelOpen) return false;
    if (this.prayCD > 0) return false;
    this.prayCD = 90;
    const before = this.fear;
    this.addFear(-45);
    this.view.toast(before > 0 ? '你安静下来，向神祷告——恐惧渐渐退去' : '你安静片刻，心里更有力量', 1600);
    return true;
  }

  /** 收集诗篇碎片（去重）。返回是否为新碎片。 */
  collectPsalm(id: string): boolean {
    if (this.psalms.indexOf(id) >= 0) return false;
    const p = GameData.psalms[id];
    if (!p) return false;
    this.psalms.push(id);
    this.view.toast(`解锁诗篇碎片 · ${p.ref}「${p.name}」`, 2000);
    return true;
  }

  hasPsalm(id: string): boolean { return this.psalms.indexOf(id) >= 0; }

  /* ---------------- 派生属性 ---------------- */
  recomputeDerived(fullHeal = false): void {
    const prevMax = this.player.maxHp;
    const d = derive(this.player.attr, this.player.equip);
    this.derived = d;
    this.player.maxHp = d.maxHp;
    this.player.maxStamina = d.maxStamina;
    if (fullHeal) {
      this.player.hp = d.maxHp;
      this.player.stamina = d.maxStamina;
    } else if (d.maxHp !== prevMax) {
      // 维持当前生命，最多到新上限
      this.player.hp = Math.min(d.maxHp, this.player.hp + Math.max(0, d.maxHp - prevMax));
    }
  }

  /* ---------------- 任务目标文本 ----------------
   * 儿童版（圣经卷轴）用「意义化」写法：强调保护与心，而非击杀。 */
  objectiveText(): string {
    if (this.childMode) {
      switch (this.phase) {
        case 'intro': return '去和父亲耶西谈谈';
        case 'q1': return `找回迷路的小羊，学习牧人的心  ${this.sheepCollected}/3`;
        case 'q1done': return '回去把好消息告诉父亲耶西';
        case 'q2': return '守护羊群，挡住山洞口的猛狮（弹弓/杖杆）';
        case 'q3': return '夜里别害怕——按 P 安静祷告，用「弹琴赞美」(3) 驱散黑暗';
        case 'done': return '第一章完成！';
        default: return '—';
      }
    }
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

    const kbActive = (dx !== 0 || dy !== 0);
    let mouseDriven = false;
    if (kbActive) {
      // 键盘输入优先，取消鼠标导航
      this.moveTarget = null;
      this.attackTarget = null;
      this.mouseHeld = false;
    } else {
      // 暗黑式鼠标导航：朝攻击目标/移动目标点奔跑
      if (this.attackTarget && this.attackTarget.dead) this.attackTarget = null;
      if (this.mouseHeld && this.aimPoint) this.moveTarget = this.aimPoint;
      let tgt: Vec | null = null;
      if (this.attackTarget) {
        const ec = this.enemyCenter(this.attackTarget);
        if (dist(this.playerCenter(), ec) > this.desiredRange()) tgt = ec; // 未进入射程则靠近
      } else if (this.moveTarget) {
        tgt = this.moveTarget;
      }
      if (tgt) {
        const pc = this.playerCenter();
        const ddx = tgt.x - pc.x;
        const ddy = tgt.y - pc.y;
        const len = Math.hypot(ddx, ddy);
        if (len > 4) { dx = ddx / len; dy = ddy / len; mouseDriven = true; }
        else if (!this.attackTarget) { this.moveTarget = null; }
      }
    }

    this.player.moving = (dx !== 0 || dy !== 0);
    if (!mouseDriven && dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    if (dx < 0) this.player.facing = 'left';
    else if (dx > 0) this.player.facing = 'right';
    else if (dy < 0) this.player.facing = 'up';
    else if (dy > 0) this.player.facing = 'down';

    const sp = SPEED * this.fearSpeedMul(); // 恐惧偏高时移动变慢（儿童版）
    const nx = this.player.x + dx * sp;
    if (!this.blocked(nx, this.player.y)) this.player.x = nx;
    const ny = this.player.y + dy * sp;
    if (!this.blocked(this.player.x, ny)) this.player.y = ny;

    if (this.player.moving) {
      this.player.animTimer++;
      if (this.player.animTimer > 8) { this.player.frame ^= 1; this.player.animTimer = 0; }
    } else {
      this.player.frame = 0;
    }

    if (this.player.stamina < this.player.maxStamina) this.player.stamina += 0.2;
    this.checkSheepPickup();
    this.checkLootPickup();
  }

  playerCenter(): Vec { return { x: this.player.x + TILE / 2, y: this.player.y + TILE / 2 }; }
  private enemyCenter(e: Enemy): Vec { return { x: e.x + TILE / 2, y: e.y + TILE / 2 }; }
  private tileCenter(c: number, r: number): Vec { return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }; }

  /** 渲染/输入层用：当前是否有可战斗的敌人（首领或游荡小怪）。 */
  combatActive(): boolean { return this.allEnemies().length > 0; }

  /** 当前所有可被攻击/造成接触伤害的敌人（首领 + 游荡小怪）。 */
  private allEnemies(): Enemy[] {
    const list: Enemy[] = [];
    if (this.enemy && !this.enemy.dead) list.push(this.enemy);
    for (const a of this.ambient) if (!a.dead) list.push(a);
    return list;
  }

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
          this.clearAmbient();
          if (this.childMode) this.collectPsalm('ps23'); // 牧羊护羊 → 诗23「耶和华是我的牧者」
          this.showDialogue(GameData.dialogue.sheepFound, () => {
            this.view.toast('三只羊都找回来了，回去找父亲');
            this.busy = false;
          });
        }
        break;
      }
    }
  }

  /* ---------------- 互动（空格/回车）：父亲对话 / 开宝箱 ---------------- */
  interact(): void {
    const pc = this.playerCenter();
    // 先看宝箱
    for (const ch of this.chests) {
      if (ch.opened) continue;
      if (dist(pc, { x: ch.x + TILE / 2, y: ch.y + TILE / 2 }) < 44) {
        this.openChest(ch);
        return;
      }
    }
    const jesse = GameData.npcs[0];
    if (dist(pc, this.tileCenter(jesse.c, jesse.r)) < 52) this.talkToJesse();
  }

  canTalkToJesse(): boolean {
    const pc = this.playerCenter();
    const jesse = GameData.npcs[0];
    return !this.busy && dist(pc, this.tileCenter(jesse.c, jesse.r)) < 52;
  }

  /** 玩家附近是否有可开启的宝箱（渲染层画提示用）。 */
  nearChest(): boolean {
    const pc = this.playerCenter();
    return this.chests.some((ch) => !ch.opened
      && dist(pc, { x: ch.x + TILE / 2, y: ch.y + TILE / 2 }) < 44);
  }

  private openChest(ch: Chest): void {
    ch.opened = true;
    const item = rollChestLoot(ch.level);
    this.dropItem(ch.x + TILE / 2, ch.y, item);
    this.view.toast(`宝箱开启！掉落 ${rarityName(item.rarity)}·${item.name}`, 1600);
  }

  private talkToJesse(): void {
    this.busy = true;
    if (this.phase === 'intro') {
      this.showDialogue(GameData.dialogue.jesseQuest1, () => {
        this.phase = 'q1';
        this.view.toast('新任务：找回走失的羊（沿途野狼可击杀刷经验/掉落）');
        this.spawnAmbient();
        this.busy = false;
      });
    } else if (this.phase === 'q1') {
      this.showDialogue(GameData.dialogue.jesseQuest1Progress, () => { this.busy = false; });
    } else if (this.phase === 'q1done') {
      this.showDialogue(GameData.dialogue.jesseQuest1Done, () => {
        this.phase = 'q2';
        this.lionActive = true;
        this.spawnEnemy('lion');
        this.view.toast('实时战斗：J/空格 攻击 · 1/2/3 切换武器 · C 查看装备', 2400);
        this.busy = false;
      });
    } else if (this.phase === 'q2') {
      this.showDialogue(GameData.dialogue.jesseQuest2, () => { this.busy = false; });
    } else {
      this.showDialogue([{ name: '父亲耶西', text: '好孩子，今天辛苦你了。' }], () => { this.busy = false; });
    }
  }

  /* ---------------- 敌人生成 ---------------- */
  private makeEnemy(key: string, c: number, r: number, ambient: boolean): Enemy {
    const def = GameData.enemies[key];
    return {
      key, name: def.name, type: def.type, sprite: def.sprite,
      x: c * TILE, y: r * TILE,
      hp: def.maxHp, maxHp: def.maxHp, atk: def.atk, spd: def.spd,
      aggro: def.aggro, touchRange: def.touchRange, touchMax: def.touchCD,
      touchCD: 0, greeted: ambient, dead: false, hurt: 0,
      level: def.level || 1, xp: def.xp || 0,
      lootChance: def.lootChance == null ? 0 : def.lootChance,
      lootTier: def.lootTier || 'common',
      ambient, scale: ambient ? 1.8 : (def.sprite === 'spirit' ? 2.6 : 3),
      vx: 0, vy: 0,
    };
  }

  spawnEnemy(key: string): void {
    const pos = key === 'lion' ? GameData.lion : GameData.spirit;
    this.enemy = this.makeEnemy(key, pos.c, pos.r, false);
  }

  spawnAmbient(): void {
    if (!this.ambientEnabled) return;
    this.ambient = GameData.ambientSpawns.map((s) => this.makeEnemy(s.key, s.c, s.r, true));
  }

  private clearAmbient(): void { this.ambient = []; }

  /* ---------------- 武器切换 ---------------- */
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

  /* ---------------- 攻击 ---------------- */
  tryAttack(): void {
    if (this.allEnemies().length === 0 || this.busy) return;
    if (this.attackCD > 0) return;
    const wpn = GameData.weapons[this.weapon];
    this.attackCD = Math.round(wpn.cd * this.derived.cdScale);
    const pc = this.playerCenter();
    const dir = this.attackDir();

    if (this.weapon === 'sling') {
      // 蓄力拉弓特效 + 飞石（带拖尾）
      this.effects.push({
        kind: 'drawback', x: pc.x, y: pc.y, life: 8, max: 8, facing: this.player.facing,
      });
      this.projectiles.push({
        x: pc.x + dir.x * 14, y: pc.y + dir.y * 14,
        vx: dir.x * (wpn.projSpeed as number),
        vy: dir.y * (wpn.projSpeed as number),
        life: wpn.projLife as number, spin: 0, trail: [],
      });
    } else if (this.weapon === 'staff') {
      // 近战弧形挥击 + 沿朝向推出的冲击波
      this.effects.push({
        kind: 'slash', x: pc.x + dir.x * 22, y: pc.y + dir.y * 22,
        facing: this.player.facing, life: 10, max: 10,
      });
      this.effects.push({
        kind: 'shockwave', x: pc.x + dir.x * 30, y: pc.y + dir.y * 30,
        facing: this.player.facing, life: 16, max: 16, radius: (wpn.reach as number),
      });
      for (const e of this.allEnemies()) {
        if (dist(pc, this.enemyCenter(e)) < (wpn.reach as number)) this.damageEnemy(e, wpn);
      }
    } else if (this.weapon === 'harp') {
      // 弹琴：周身脉冲 + 多层音波环
      this.effects.push({ kind: 'harpcast', x: pc.x, y: pc.y, life: 14, max: 14 });
      this.effects.push({ kind: 'soundwave', x: pc.x, y: pc.y, life: 34, max: 34, radius: wpn.radius });
      for (const e of this.allEnemies()) {
        if (dist(pc, this.enemyCenter(e)) < (wpn.radius as number)) this.damageEnemy(e, wpn);
      }
    }
  }

  private pushPopup(x: number, y: number, text: string, color: string, big = false): void {
    this.popups.push({
      x: x + rand(-6, 6), y, text, color, life: big ? 46 : 38, max: big ? 46 : 38, vy: -0.6,
    });
  }

  private damageEnemy(e: Enemy, wpn: typeof GameData.weapons[string]): void {
    if (e.dead) return;
    const ec = this.enemyCenter(e);
    const isHarp = wpn.kind === 'harp';

    // 邪灵门控：物理几乎无效
    if (e.type === 'spirit' && !isHarp) {
      e.hp = Math.max(0, e.hp - 1); e.hurt = 6;
      this.pushPopup(ec.x, e.y, '抵抗 -1', '#9aa0b5');
      if (!this.hintShown) {
        this.view.toast('物理攻击对邪灵几乎无效！改用「弹琴赞美」(按 3)', 2200);
        this.hintShown = true;
      }
      if (e.hp <= 0) this.onEnemyKilled(e);
      return;
    }
    // 野兽被弹琴：安抚（降攻 + 回血）而非高伤
    if (e.type === 'beast' && isHarp) {
      e.atk = Math.max(2, e.atk - 1);
      this.heal(1);
      this.pushPopup(ec.x, e.y, '安抚', '#ffe27a');
      return;
    }

    // 标准伤害公式
    const d = this.derived;
    const kind = isHarp ? 'harp' : 'phys';
    const wd = weaponDamage(kind, wpn.minDmg, wpn.maxDmg, d);
    let dmg = rand(wd.min, wd.max);
    const crit = Math.random() < d.crit;
    if (crit) dmg = Math.round(dmg * d.critMult);
    dmg = Math.max(1, dmg);

    e.hp = Math.max(0, e.hp - dmg); e.hurt = 12; this.shake = crit ? 9 : 6;
    const color = isHarp ? '#d6a0ff' : (crit ? '#ffd24a' : '#ffffff');
    this.pushPopup(ec.x, e.y, (crit ? '暴击 ' : '') + `-${dmg}`, color, crit);
    if (crit) this.effects.push({ kind: 'critstar', x: ec.x, y: ec.y, life: 12, max: 12 });
    if (isHarp) this.view.toast(`圣洁琴声驱邪！-${dmg}`, 700);

    // 生命偷取
    if (d.lifeSteal > 0) this.heal(Math.max(1, Math.floor(dmg * d.lifeSteal)));

    if (e.hp <= 0 && !e.dead) this.onEnemyKilled(e);
  }

  private heal(amount: number): void {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }

  private hitPlayer(e: Enemy): void {
    const d = this.derived;
    if (Math.random() < d.dodge) {
      this.pushPopup(this.player.x + TILE / 2, this.player.y, '闪避', '#9aa0b5');
      return;
    }
    let dmg = rand(Math.max(1, e.atk - 1), e.atk + 2);
    dmg = Math.max(1, Math.round(dmg * (1 - reduction(d.armor, e.level))));
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.pushPopup(this.player.x + TILE / 2, this.player.y, `-${dmg}`, '#ff7a7a');
    this.shake = 6; this.playerHurt = 12;
    if (this.childMode) this.addFear(10 + dmg); // 受击时恐惧上升
    if (this.player.hp <= 0) this.playerDown();
  }

  /* ---------------- 击杀处理 ---------------- */
  private onEnemyKilled(e: Enemy): void {
    e.dead = true;
    this.grantXp(e.xp);
    const loot = rollLoot(e);
    if (loot) this.dropItem(e.x + TILE / 2, e.y + TILE / 2, loot);
    if (e.ambient) {
      this.ambient = this.ambient.filter((a) => a !== e);
      return;
    }
    this.onBossDefeated(e.key);
  }

  private grantXp(amount: number): void {
    if (amount <= 0) return;
    const gain = Math.round(amount * (1 + this.derived.xpPct));
    this.player.xp += gain;
    let leveled = false;
    while (this.player.xp >= xpToNext(this.player.level)) {
      this.player.xp -= xpToNext(this.player.level);
      this.player.level += 1;
      this.player.attr = levelUpAttributes(this.player.attr, this.player.level);
      leveled = true;
    }
    if (leveled) {
      this.recomputeDerived(true);
      const pc = this.playerCenter();
      this.effects.push({ kind: 'levelup', x: pc.x, y: pc.y + 14, life: 30, max: 30 });
      this.pushPopup(pc.x, this.player.y - 6, `LEVEL UP! Lv.${this.player.level}`, '#ffe27a', true);
      this.view.toast(`升级！等级 ${this.player.level}（属性提升，生命回满）`, 1600);
    }
  }

  private onBossDefeated(key: string): void {
    this.enemy = null;
    this.projectiles = [];
    this.busy = true;
    if (key === 'lion') {
      this.lionDefeated = true; this.lionActive = false;
      this.clearAmbient();
      this.showDialogue(GameData.dialogue.lionDefeated, () => {
        this.showDialogue(GameData.dialogue.nightFall, () => {
          this.phase = 'q3';
          this.player.x = 9 * TILE; this.player.y = 23 * TILE; this.player.facing = 'up';
          this.spawnEnemy('spirit');
          this.spiritActive = true;
          this.weapon = 'harp';
          if (this.childMode) {
            this.addFear(60);            // 夜幕骤降：恐惧陡升
            this.collectPsalm('ps8');    // 星空夜晚 → 诗8「星空下的勇气」
            this.view.toast('害怕时按 P 安静祷告，恐惧会退去', 2400);
          }
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
    this.moveTarget = null;
    this.attackTarget = null;
    this.mouseHeld = false;
    this.player.hp = this.player.maxHp;
    const e = this.enemy;
    if (e) {
      const def = GameData.enemies[e.key];
      const pos = e.key === 'lion' ? GameData.lion : GameData.spirit;
      e.hp = e.maxHp; e.atk = def.atk; e.x = pos.c * TILE; e.y = pos.r * TILE;
      e.touchCD = 0; e.dead = false; e.greeted = true; e.hurt = 0;
    }
    this.clearAmbient();
    let line: DialogueLine[];
    if (this.phase === 'q3') {
      this.player.x = 9 * TILE; this.player.y = 23 * TILE; this.player.facing = 'up';
      line = [{ name: '旁白', text: '邪灵的阴影压得大卫几乎窒息……稳住心神，再弹起竖琴!' }];
    } else if (this.phase === 'q2') {
      this.player.x = 26 * TILE; this.player.y = 22 * TILE; this.player.facing = 'right';
      line = [{ name: '旁白', text: '大卫被猛狮扑退……他退到路上，深吸一口气，握紧投石索再来一次!' }];
    } else {
      // q1 找羊途中被野狼围攻
      this.player.x = 26 * TILE; this.player.y = 22 * TILE; this.player.facing = 'right';
      line = [{ name: '旁白', text: '大卫被野狼扑倒……他退回路上喘息，握紧投石索准备反击!' }];
    }
    this.showDialogue(line, () => { this.busy = false; });
  }

  /* ---------------- 掉落 / 拾取 ---------------- */
  private dropItem(x: number, y: number, item: Item): void {
    // 在掉落点附近散开，避免重叠
    const ox = rand(-10, 10);
    this.groundItems.push({ x: x + ox, y, item, bob: 0 });
  }

  private checkLootPickup(): void {
    const pc = this.playerCenter();
    const range = this.derived.pickup;
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const g = this.groundItems[i];
      if (dist(pc, { x: g.x, y: g.y }) < range) {
        this.groundItems.splice(i, 1);
        this.acquireItem(g.item);
      }
    }
  }

  /** 拾取一件装备：若比当前槽位更优则自动装备，否则进背包。 */
  private acquireItem(item: Item): void {
    const cur = this.player.equip[item.slot];
    if (scoreItem(item) > scoreItem(cur)) {
      if (cur) this.player.bag.push(cur);
      this.player.equip[item.slot] = item;
      this.recomputeDerived();
      this.view.toast(`已装备 · ${rarityName(item.rarity)}「${item.name}」`, 1500);
    } else {
      this.player.bag.push(item);
      this.view.toast(`拾取 · ${rarityName(item.rarity)}「${item.name}」(已入背包，按 C 查看)`, 1500);
    }
  }

  /* ---------------- 装备面板 ---------------- */
  toggleEquipPanel(): boolean {
    if (this.dlg.active) return this.equipPanelOpen;
    this.equipPanelOpen = !this.equipPanelOpen;
    if (this.equipPanelOpen) this.questLogOpen = false;
    this.bagSel = 0;
    return this.equipPanelOpen;
  }

  moveBagSel(delta: number): void {
    if (!this.equipPanelOpen || this.player.bag.length === 0) return;
    const n = this.player.bag.length;
    this.bagSel = ((this.bagSel + delta) % n + n) % n;
  }

  /** 装备背包中当前选中的物品（替换对应槽位）。 */
  equipSelected(): void {
    if (!this.equipPanelOpen) return;
    const bag = this.player.bag;
    if (this.bagSel < 0 || this.bagSel >= bag.length) return;
    const item = bag[this.bagSel];
    const cur = this.player.equip[item.slot];
    bag.splice(this.bagSel, 1);
    this.player.equip[item.slot] = item;
    if (cur) bag.push(cur);
    this.recomputeDerived();
    if (this.bagSel >= bag.length) this.bagSel = Math.max(0, bag.length - 1);
    this.view.toast(`装备 · ${rarityName(item.rarity)}「${item.name}」`, 1200);
  }

  /** 渲染层用：装备物品颜色（按稀有度）。 */
  itemColor(item: Item): string { return rarityColor(item.rarity); }
  affixText(item: Item): string[] {
    return item.affixes.map((a) => `  +${a.value} ${affixLabel(a.stat)}`);
  }
  slotLabel(slot: Slot): string {
    const m: Record<Slot, string> = {
      focus: '武器焦点', armor: '护甲', helm: '头盔', amulet: '护符', ring: '戒指',
    };
    return m[slot];
  }

  /* ---------------- 更新子系统 ---------------- */
  private updateProjectiles(): void {
    const sling = GameData.weapons.sling;
    const targets = this.allEnemies();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      // 拖尾
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 7) p.trail.shift();
      p.x += p.vx; p.y += p.vy; p.life--; p.spin += 0.4;
      let remove = false;
      if (p.life <= 0 || this.solidAtPixel(p.x, p.y)) {
        remove = true;
      } else {
        for (const e of targets) {
          if (!e.dead && dist(p, this.enemyCenter(e)) < (sling.hitR as number)) {
            this.damageEnemy(e, sling);
            this.effects.push({ kind: 'hit', x: p.x, y: p.y, life: 10, max: 10 });
            remove = true;
            break;
          }
        }
      }
      if (remove) this.projectiles.splice(i, 1);
    }
  }

  private updateEnemyOne(e: Enemy): void {
    if (e.dead) return;
    const pc = this.playerCenter();
    const ec = this.enemyCenter(e);
    const d = dist(pc, ec);

    if (!e.greeted && d < 175) {
      e.greeted = true;
      this.busy = true;
      const lines = e.key === 'lion' ? GameData.dialogue.lionApproach
        : GameData.dialogue.spiritApproach;
      this.showDialogue(lines, () => { this.busy = false; });
      return;
    }
    if (!e.greeted) return;

    if (d < e.aggro && d > 1) {
      const vx = (pc.x - ec.x) / d;
      const vy = (pc.y - ec.y) / d;
      e.vx = vx * e.spd; e.vy = vy * e.spd;
      e.x += e.vx; e.y += e.vy;
      e.x = Math.max(TILE, Math.min(e.x, MAP_W - TILE * 2));
      e.y = Math.max(TILE, Math.min(e.y, MAP_H - TILE * 2));
    } else {
      e.vx = 0; e.vy = 0;
    }

    if (e.touchCD > 0) e.touchCD--;
    if (d < e.touchRange && e.touchCD <= 0) {
      this.hitPlayer(e);
      e.touchCD = e.touchMax;
    }
  }

  private updateEnemies(): void {
    if (this.enemy && !this.enemy.dead) this.updateEnemyOne(this.enemy);
    for (const a of this.ambient) this.updateEnemyOne(a);
  }

  private updateEffects(): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (--this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
  }

  private updatePopups(): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pp = this.popups[i];
      pp.y += pp.vy; pp.life--;
      if (pp.life <= 0) this.popups.splice(i, 1);
    }
  }

  private updateGround(): void {
    for (const g of this.groundItems) g.bob += 0.12;
  }

  private updateCombat(): void {
    if (this.attackCD > 0) this.attackCD--;
    // 鼠标点怪：进入射程后朝目标自动攻击
    if (this.attackTarget && !this.attackTarget.dead) {
      const ec = this.enemyCenter(this.attackTarget);
      if (dist(this.playerCenter(), ec) <= this.desiredRange()) {
        this.aimPoint = this.leadAim(this.attackTarget, ec);
        this.tryAttack();
      }
    } else if (this.attackTarget) {
      this.attackTarget = null;
    }
    if (this.input.attack) this.tryAttack();
    this.updateProjectiles();
    this.updateEnemies();
    this.updateEffects();
    this.updatePopups();
    this.updateGround();
    if (this.shake > 0) this.shake--;
    if (this.playerHurt > 0) this.playerHurt--;
  }

  private finishChapter(): void {
    this.running = false;
    this.view.onFinish({ hp: this.player.hp, maxHp: this.player.maxHp, level: this.player.level });
  }

  /* ---------------- 输入入口（供渲染层转发） ---------------- */
  setMove(dir: 'left' | 'right' | 'up' | 'down', down: boolean): void {
    this.input[dir] = down;
  }
  setAttack(down: boolean): void {
    this.input.attack = down;
  }

  /* ---------------- 暗黑式鼠标输入（世界坐标，渲染层负责屏幕→世界换算） ---------------- */
  /** 光标移动：记录瞄准点；按住左键时持续跟随光标奔跑。 */
  mouseAim(wx: number, wy: number): void {
    this.aimPoint = { x: wx, y: wy };
    if (this.mouseHeld) { this.moveTarget = { x: wx, y: wy }; }
  }

  /** 左键按下：点中怪物→追击攻击；点中地面→奔跑到该点（按住持续跟随）。 */
  mouseDown(wx: number, wy: number): void {
    if (!this.running || this.busy || this.dlg.active
      || this.equipPanelOpen || this.questLogOpen) return;
    this.aimPoint = { x: wx, y: wy };
    const e = this.enemyAtWorld(wx, wy);
    if (e) {
      this.attackTarget = e;
      this.moveTarget = null;
      this.mouseHeld = false;
      return;
    }
    this.attackTarget = null;
    this.moveTarget = { x: wx, y: wy };
    this.mouseHeld = true;
  }

  /** 左键松开：停止「按住跟随」，但保留当前目标点让角色走到位（暗黑手感）。 */
  mouseUp(): void { this.mouseHeld = false; }

  /** 命中测试：返回光标命中的存活敌人（取最近一个）。 */
  private enemyAtWorld(wx: number, wy: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.allEnemies()) {
      const ec = this.enemyCenter(e);
      const radius = TILE * (e.scale || 2) * 0.5 + 6;
      const d = dist({ x: wx, y: wy }, ec);
      if (d <= radius && d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  /** 远程预判：用飞行时间 + 目标速度估算落点，使弹弓能命中移动中的怪。 */
  private leadAim(e: Enemy, ec: Vec): Vec {
    if (this.weapon !== 'sling') return ec; // 近战/弹琴无需预判
    const w = GameData.weapons.sling;
    const speed = w.projSpeed as number;
    const t = dist(this.playerCenter(), ec) / Math.max(0.001, speed);
    return { x: ec.x + e.vx * t, y: ec.y + e.vy * t };
  }

  /** 渲染层只读：光标世界坐标（用于绘制落点光标/悬停高亮）。 */
  get cursorAim(): Vec | null { return this.aimPoint; }
  /** 渲染层只读：当前是否处于「按住跟随」奔跑。 */
  get followingCursor(): boolean { return this.mouseHeld; }
  /** 渲染层只读：光标当前悬停命中的敌人（用于高亮）。 */
  enemyAtCursor(): Enemy | null {
    return this.aimPoint ? this.enemyAtWorld(this.aimPoint.x, this.aimPoint.y) : null;
  }

  /** 当前武器的「开始攻击距离」（点怪追击时用）。 */
  private desiredRange(): number {
    const w = GameData.weapons[this.weapon];
    if (this.weapon === 'staff') return (w.reach as number) - 4;
    if (this.weapon === 'harp') return (w.radius as number) - 4;
    // 弹弓远程：进入弹道有效范围即开火
    const projReach = (w.projSpeed as number) * (w.projLife as number);
    return Math.min(240, projReach || 220);
  }

  /** 攻击朝向：有光标瞄准点则朝光标（并同步精灵朝向），否则用当前 facing。 */
  private attackDir(): Vec {
    if (this.aimPoint) {
      const pc = this.playerCenter();
      const dx = this.aimPoint.x - pc.x;
      const dy = this.aimPoint.y - pc.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        if (Math.abs(dx) > Math.abs(dy)) this.player.facing = dx < 0 ? 'left' : 'right';
        else this.player.facing = dy < 0 ? 'up' : 'down';
        return { x: dx / len, y: dy / len };
      }
    }
    return facingVec(this.player.facing);
  }
  confirm(): void {
    if (this.dlg.active) { this.advanceDialogue(); return; }
    if (this.equipPanelOpen) { this.equipSelected(); return; }
    if (this.running && !this.busy && !this.questLogOpen) {
      this.interact();
    }
  }
  toggleQuestLog(): boolean {
    if (this.dlg.active) return this.questLogOpen;
    this.questLogOpen = !this.questLogOpen;
    if (this.questLogOpen) this.equipPanelOpen = false;
    return this.questLogOpen;
  }
}
