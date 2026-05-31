/* ============================================================
 * WorldEngine.ts — 互通大世界引擎（引擎无关 · 纯 TS · 可单测）。
 *
 * 对应《开发计划》§12「WorldEngine」与 M3「多场景互通大世界骨架」。
 * 只管「世界结构与状态」——节点图谱、互通邻接、解锁门控、访问/通关记录、
 * 跨场景进度快照；不依赖任何渲染或 Phaser。表现层（WorldMapScene 等）只读它
 * 的状态来绘制、调它的方法来切图，逻辑可在 node 下单测，不回归现有 39 项。
 * ============================================================ */

/** 地图类型（决定世界地图上的图标/底色与玩法基调） */
export type MapKind =
  | 'pasture'  // 牧场
  | 'field'    // 旷野（探索）
  | 'valley'   // 山谷（战场）
  | 'cave'     // 山洞/营寨
  | 'palace'   // 王宫/城邑
  | 'town';    // 城镇

/** 世界地图上的一个地图节点。 */
export interface MapNode {
  /** 唯一 id */
  id: string;
  /** 显示名 */
  name: string;
  /** 副标题（圣经依据 / 说明） */
  subtitle?: string;
  /** 类型 */
  kind: MapKind;
  /** 在世界地图网格上的布局位置（用于绘制连线/图标） */
  col: number;
  row: number;
  /** 互通的相邻节点 id（无向；表现层据此画连线、做就近传送） */
  connections: string[];
  /** 进入时启动的 Phaser 场景 key；null = 占位节点（敬请期待，不可进入） */
  scene: string | null;
  /** 解锁所需「先完成」的节点 id 列表（空数组 = 开局即解锁） */
  requires: string[];
}

/** 可序列化的世界进度（存档/跨场景保持用）。 */
export interface WorldState {
  unlocked: string[];
  visited: string[];
  completed: string[];
  currentId: string | null;
  snapshot: Record<string, unknown>;
}

export class WorldEngine {
  private nodes = new Map<string, MapNode>();
  /** 保持声明顺序，便于稳定遍历/绘制 */
  private order: string[] = [];
  private unlocked = new Set<string>();
  private visited = new Set<string>();
  private completed = new Set<string>();
  /** 当前所在节点 id（未进入任何地图时为 null，即停留在世界地图枢纽） */
  currentId: string | null = null;
  /** 跨场景保持的进度快照（如玩家等级/经验/生命/背包；由表现层按需读写） */
  private snapshot: Record<string, unknown> = {};

  constructor(nodes: MapNode[]) {
    for (const n of nodes) {
      this.nodes.set(n.id, n);
      this.order.push(n.id);
    }
    this.refreshUnlocks();
  }

  /** 全部节点（按声明顺序）。 */
  list(): MapNode[] {
    return this.order.map((id) => this.nodes.get(id)).filter((n): n is MapNode => !!n);
  }

  get(id: string): MapNode | undefined { return this.nodes.get(id); }

  /** 与某节点互通的相邻节点（过滤掉无效 id）。 */
  neighbors(id: string): MapNode[] {
    const n = this.nodes.get(id);
    if (!n) return [];
    return n.connections
      .map((c) => this.nodes.get(c))
      .filter((x): x is MapNode => !!x);
  }

  isUnlocked(id: string): boolean { return this.unlocked.has(id); }
  isVisited(id: string): boolean { return this.visited.has(id); }
  isCompleted(id: string): boolean { return this.completed.has(id); }

  /** 是否可进入：已解锁 且 绑定了真实场景（占位节点 scene=null 不可进入）。 */
  canEnter(id: string): boolean {
    const n = this.nodes.get(id);
    return !!n && n.scene !== null && this.unlocked.has(id);
  }

  /** 进入某节点：成功则记当前节点 + 标记已访问；不可进入返回 false。 */
  enter(id: string): boolean {
    if (!this.canEnter(id)) return false;
    this.currentId = id;
    this.visited.add(id);
    return true;
  }

  /** 离开当前地图，回到世界地图枢纽。 */
  leave(): void { this.currentId = null; }

  /** 直接解锁某节点（剧情事件可调用）；新解锁返回 true。 */
  unlock(id: string): boolean {
    if (!this.nodes.has(id) || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    return true;
  }

  /**
   * 标记某节点「通关」，并解锁所有「依赖已满足」的节点。
   * @returns 本次新解锁的节点 id 列表（供表现层弹出「新地图解锁」提示）。
   */
  complete(id: string): string[] {
    if (this.nodes.has(id)) this.completed.add(id);
    return this.refreshUnlocks();
  }

  /** 把 requires 已全部完成、但尚未解锁的节点解锁；返回新解锁的 id。 */
  private refreshUnlocks(): string[] {
    const newly: string[] = [];
    for (const id of this.order) {
      if (this.unlocked.has(id)) continue;
      const n = this.nodes.get(id);
      if (!n) continue;
      if (n.requires.every((r) => this.completed.has(r))) {
        this.unlocked.add(id);
        newly.push(id);
      }
    }
    return newly;
  }

  /** 写入/合并进度快照（跨场景保持）。 */
  saveSnapshot(s: Record<string, unknown>): void {
    this.snapshot = { ...this.snapshot, ...s };
  }

  /** 读取进度快照副本。 */
  loadSnapshot(): Record<string, unknown> { return { ...this.snapshot }; }

  /** 序列化为可存档的纯数据。 */
  serialize(): WorldState {
    return {
      unlocked: [...this.unlocked],
      visited: [...this.visited],
      completed: [...this.completed],
      currentId: this.currentId,
      snapshot: { ...this.snapshot },
    };
  }

  /** 从存档恢复一个 WorldEngine（节点图谱仍由代码提供，状态由存档覆盖）。 */
  static restore(nodes: MapNode[], state: WorldState): WorldEngine {
    const w = new WorldEngine(nodes);
    for (const id of state.completed) if (w.nodes.has(id)) w.completed.add(id);
    w.refreshUnlocks();
    for (const id of state.unlocked) if (w.nodes.has(id)) w.unlocked.add(id);
    for (const id of state.visited) if (w.nodes.has(id)) w.visited.add(id);
    w.currentId = state.currentId && w.nodes.has(state.currentId) ? state.currentId : null;
    w.snapshot = { ...state.snapshot };
    return w;
  }
}
