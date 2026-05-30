/* ============================================================
 * types.ts — 引擎无关的类型定义
 * 这些类型被纯逻辑核心（GameData / GameCore）使用，
 * 不依赖任何 Cocos / DOM API，可在 node 下直接编译运行验证。
 * ============================================================ */

export type Facing = 'left' | 'right' | 'up' | 'down';

export interface DialogueLine {
  name: string;
  text: string;
}

export interface TilePos {
  c: number;
  r: number;
}

export interface LostSheepData {
  id: string;
  c: number;
  r: number;
  name: string;
}

export interface LostSheep extends LostSheepData {
  taken: boolean;
}

export interface WeaponDef {
  id: string;
  name: string;
  label: string;
  hint: string;
  dmgType?: 'phys';
  kind?: 'harp';
  cd: number;
  /* sling 远程 */
  projSpeed?: number;
  projLife?: number;
  hitR?: number;
  /* staff 近战 */
  reach?: number;
  /* harp 范围 */
  radius?: number;
  minDmg: number;
  maxDmg: number;
}

export type Rarity = 'common' | 'magic' | 'rare' | 'unique';
export type Slot = 'focus' | 'armor' | 'helm' | 'amulet' | 'ring';
export type AffixStat =
  | 'str' | 'dex' | 'vit' | 'fai'
  | 'maxHp' | 'physPct' | 'armor' | 'crit' | 'critDmg'
  | 'cdScale' | 'lifeSteal' | 'holy' | 'xpPct' | 'pickup';

export interface Attributes { str: number; dex: number; vit: number; fai: number; }

export interface DerivedStats {
  maxHp: number;
  maxStamina: number;
  physMul: number; // 物理伤害乘数（来自 STR）
  holyMul: number; // 驱邪伤害乘数（来自 FAI）
  physFlat: number; // 装备 +物理% 折算
  holyFlat: number; // 装备 +驱邪
  armor: number;
  crit: number;
  critMult: number;
  dodge: number;
  cdScale: number; // 攻击冷却乘数（<1 更快）
  lifeSteal: number;
  xpPct: number;
  pickup: number; // 拾取半径
}

export interface Affix { stat: AffixStat; value: number; }

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  itemLevel: number;
  reqLevel: number;
  baseArmor: number;
  affixes: Affix[];
  unique?: string;
}

export interface Equipment {
  focus: Item | null;
  armor: Item | null;
  helm: Item | null;
  amulet: Item | null;
  ring: Item | null;
}

export interface GroundItem { x: number; y: number; item: Item; bob: number; }

export interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  vy: number;
}

export interface EnemyDef {
  name: string;
  type: 'beast' | 'spirit';
  maxHp: number;
  atk: number;
  spd: number;
  aggro: number;
  touchCD: number;
  touchRange: number;
  sprite: string;
  attackName: string;
  level?: number;
  xp?: number;
  lootChance?: number; // 0-1，掉落概率（首领必掉=1）
  lootTier?: Rarity; // 掉落最低稀有度
}

export interface Enemy {
  key: string;
  name: string;
  type: string;
  sprite: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  spd: number;
  aggro: number;
  touchRange: number;
  touchMax: number;
  touchCD: number;
  greeted: boolean;
  dead: boolean;
  hurt: number;
  level: number;
  xp: number;
  lootChance: number;
  lootTier: Rarity;
  ambient: boolean; // true=游荡小怪（非主线首领）
  scale: number; // 渲染缩放
  vx: number; // 上一帧位移（用于远程攻击预判命中）
  vy: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  spin: number;
  trail: Array<{ x: number; y: number }>;
}

export type EffectKind =
  | 'slash' | 'wave' | 'hit'
  | 'drawback' | 'shockwave' | 'harpcast' | 'soundwave'
  | 'critstar' | 'levelup';

export interface Effect {
  kind: EffectKind;
  x: number;
  y: number;
  life: number;
  max: number;
  facing?: Facing;
  radius?: number;
}

export interface Player {
  x: number;
  y: number;
  facing: Facing;
  hp: number;
  maxHp: number;
  atk: number;
  moving: boolean;
  animTimer: number;
  frame: number;
  level: number;
  xp: number;
  attr: Attributes;
  equip: Equipment;
  bag: Item[];
  stamina: number;
  maxStamina: number;
}

export interface QuestEntry {
  title: string;
  desc: string;
  state: 'locked' | 'active' | 'done';
  progress?: string;
}

export interface FinishStats {
  hp: number;
  maxHp: number;
  level: number;
}

/** 视图回调：核心逻辑通过它向渲染层发出瞬时事件（提示气泡 / 通关）。 */
export interface IGameView {
  toast(msg: string, ms?: number): void;
  onFinish(stats: FinishStats): void;
}

export type Phase = 'intro' | 'q1' | 'q1done' | 'q2' | 'q3' | 'done';
