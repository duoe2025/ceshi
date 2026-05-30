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
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Effect {
  kind: 'slash' | 'wave' | 'hit';
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
}

/** 视图回调：核心逻辑通过它向渲染层发出瞬时事件（提示气泡 / 通关）。 */
export interface IGameView {
  toast(msg: string, ms?: number): void;
  onFinish(stats: FinishStats): void;
}

export type Phase = 'intro' | 'q1' | 'q1done' | 'q2' | 'q3' | 'done';
