/* ============================================================
 * WorldData.ts — 「大卫一生」互通大世界节点图谱（引擎无关数据）。
 *
 * 这是 M3 骨架的世界结构：以世界地图枢纽连接各章节地图，主线按圣经推进、
 * 逐节点解锁，已解锁地图可回访互通。本阶段「牧场」「旷野」为可进入的真实
 * 场景，其余为占位节点（scene=null，敬请期待），将在 M5/M6 接入玩法。
 *
 * 场景 key 常量在表现层定义，这里用字符串字面量引用以保持引擎无关：
 *   'world' = 第一章·牧场（WorldScene）   'field' = 旷野探索（FieldScene）
 * ============================================================ */

import { MapNode } from './WorldEngine';

/** 大卫一生世界图谱（节点顺序即声明顺序，用于稳定绘制）。 */
export const DAVID_WORLD: MapNode[] = [
  {
    id: 'bethlehem',
    name: '伯利恒·牧场',
    subtitle: '第一章 · 牧童大卫（撒上 16-17）',
    kind: 'pasture',
    col: 1, row: 2,
    connections: ['field', 'elah'],
    scene: 'world',     // 第一章可玩
    requires: [],       // 开局解锁
  },
  {
    id: 'field',
    name: '旷野·探索',
    subtitle: '放羊与磨练（撒上 17:34-37）',
    kind: 'field',
    col: 2, row: 3,
    connections: ['bethlehem'],
    scene: 'field',     // 旷野可探索（骨架）
    requires: [],       // 与牧场互通，开局解锁
  },
  {
    id: 'elah',
    name: '以拉谷·歌利亚',
    subtitle: '第二章 · 战胜歌利亚（撒上 17）',
    kind: 'valley',
    col: 3, row: 2,
    connections: ['bethlehem', 'adullam', 'gibeah'],
    scene: null,        // 占位：M6 接入
    requires: ['bethlehem'],
  },
  {
    id: 'gibeah',
    name: '基比亚·扫罗王宫',
    subtitle: '事奉扫罗、米甲为妻（撒上 18）',
    kind: 'palace',
    col: 4, row: 3,
    connections: ['elah'],
    scene: null,
    requires: ['elah'],
  },
  {
    id: 'adullam',
    name: '亚杜兰洞·聚勇士',
    subtitle: '逃亡聚众、勇士相投（撒上 22）',
    kind: 'cave',
    col: 4, row: 1,
    connections: ['elah', 'ziklag'],
    scene: null,
    requires: ['elah'],
  },
  {
    id: 'ziklag',
    name: '洗革拉·边城',
    subtitle: '寄居非利士、追回掳掠（撒上 27-30）',
    kind: 'town',
    col: 5, row: 1,
    connections: ['adullam', 'hebron'],
    scene: null,
    requires: ['adullam'],
  },
  {
    id: 'hebron',
    name: '希伯仑·登基',
    subtitle: '受膏作王、迁都耶路撒冷（撒下 2,5）',
    kind: 'town',
    col: 6, row: 2,
    connections: ['ziklag'],
    scene: null,
    requires: ['ziklag'],
  },
];
