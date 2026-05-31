/* ============================================================
 * engine/index.ts — 模块化引擎统一入口（barrel）。
 *
 * 对应《开发计划》第三部分 §12「模块化引擎」架构。逻辑引擎保持
 * 引擎无关（纯 TS，可 node 单测），表现层（Phaser 3 / Canvas）只通过
 * 这些模块与 IEngineView 回调交互，不反向依赖渲染。
 *
 * 子引擎与落地状态：
 *   ✅ StatsEngine 等级引擎  —— core/Stats.ts（属性派生/伤害公式/经验升级）
 *   ✅ LootEngine  掉落引擎  —— core/Items.ts（稀有度/词缀/物品等级/掉落表）
 *   ✅ MapEngine   地图引擎  —— core/GameData.ts（瓦片/碰撞/地图构建）
 *   ✅ Orchestrator 主编排   —— core/GameCore.ts（武器/怪物/特效/任务的当前承载）
 *   ⏳ WorldEngine / HeroEngine / QuestEngine / DialogueEngine / SaveEngine
 *      —— 见 §13–§16，将从 GameCore 渐进拆分为独立 class（不回归现有单测）。
 *
 * 说明：本文件用「引擎语义命名」重新导出已实现的纯逻辑模块，作为后续
 * 拆分的稳定入口；新代码一律从 engine/ 导入，避免散落引用 core/*。
 * ============================================================ */

// 等级引擎（属性 → 派生数值、伤害公式、经验/升级）
export * as StatsEngine from '../core/Stats';
// 掉落引擎（稀有度/词缀/物品等级/掉落与宝箱）
export * as LootEngine from '../core/Items';
// 地图引擎（瓦片常量/碰撞集合/地图构建/NPC 数据）
export * as MapEngine from '../core/GameData';

// 主编排与运行时类型（武器/怪物/特效/任务暂由 GameCore 承载，后续拆分）
export { GameCore } from '../core/GameCore';
export type { InputState } from '../core/GameCore';

// 世界引擎（互通大世界：节点图谱 / 解锁门控 / 访问·通关 / 跨场景快照）
export { WorldEngine } from './WorldEngine';
export type { MapNode, MapKind, WorldState } from './WorldEngine';
export { DAVID_WORLD } from './WorldData';
