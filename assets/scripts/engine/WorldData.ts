/* ============================================================
 * WorldData.ts — 「大卫一生」互通大世界节点图谱（引擎无关数据）。
 *
 * 节点按真实以色列地理位置（mx,my 归一化 0~1，相对世界地图底图 world-map.png）
 * 布点，覆盖《大卫一生 35 章》全部主要地点；主线按圣经推进、按 requires 逐城
 * 解锁，已解锁地图可回访互通。本阶段「伯利恒·牧场」「旷野」为可进入的真实场景
 * （scene 非空），其余城市为占位节点（scene=null，灰锁/敬请期待），将随
 * QuestEngine/各章玩法逐步接入。
 *
 * 场景 key 常量在表现层定义，这里用字符串字面量引用以保持引擎无关：
 *   'world' = 第一章·牧场（WorldScene）   'field' = 旷野探索（FieldScene）
 *
 * 坐标对齐说明：mx,my 为城市图标在底图上的归一化中心；底图以 cover 方式铺满
 * 视口，表现层用同一变换把 (mx,my) 映射到屏幕像素，故节点恰好落在城上。
 * ============================================================ */

import { MapNode } from './WorldEngine';

/** 大卫一生世界图谱（节点顺序即声明顺序，用于稳定绘制）。 */
export const DAVID_WORLD: MapNode[] = [
  // —— 第一幕 · 伯利恒牧羊少年（可玩） ——
  {
    id: 'bethlehem',
    name: '伯利恒·牧场',
    subtitle: '第一章 · 牧童大卫、秘密膏立（撒上 16-17）',
    kind: 'pasture',
    mx: 0.473, my: 0.500,
    connections: ['field', 'elah', 'jerusalem'],
    scene: 'world',     // 第一章可玩
    requires: [],       // 开局解锁
  },
  {
    id: 'field',
    name: '旷野·探索',
    subtitle: '放羊磨练、狮熊试炼（撒上 17:34-37）',
    kind: 'field',
    mx: 0.545, my: 0.560,
    connections: ['bethlehem', 'engedi'],
    scene: 'field',     // 旷野可探索（骨架）
    requires: [],       // 与牧场互通，开局解锁
  },

  // —— 第二~五幕 · 歌利亚、王宫、嫉妒、夜逃 ——
  {
    id: 'elah',
    name: '以拉谷·歌利亚',
    subtitle: '第二章 · 战胜歌利亚（撒上 17）',
    kind: 'valley',
    mx: 0.300, my: 0.520,
    connections: ['bethlehem', 'adullam', 'gath', 'gibeah'],
    scene: null,
    requires: ['bethlehem'],
  },
  {
    id: 'gibeah',
    name: '基比亚·扫罗王宫',
    subtitle: '竖琴事奉、米甲为妻、扫罗嫉妒、约拿单立约（撒上 18-20）',
    kind: 'palace',
    mx: 0.469, my: 0.255,
    connections: ['elah', 'nob', 'ramah', 'jerusalem'],
    scene: null,
    requires: ['elah'],
  },
  {
    id: 'ramah',
    name: '拉玛·撒母耳之地',
    subtitle: '逃往撒母耳处避难（撒上 19）',
    kind: 'town',
    mx: 0.691, my: 0.182,
    connections: ['gibeah', 'gilboa'],
    scene: null,
    requires: ['gibeah'],
  },

  // —— 第六幕 · 荒野流亡 ——
  {
    id: 'nob',
    name: '挪伯·祭司城',
    subtitle: '得圣饼与歌利亚之剑、多益告密（撒上 21-22）',
    kind: 'town',
    mx: 0.520, my: 0.360,
    connections: ['gibeah', 'adullam'],
    scene: null,
    requires: ['gibeah'],
  },
  {
    id: 'adullam',
    name: '亚杜兰洞·聚勇士',
    subtitle: '逃亡聚众、勇士相投、四百人之首（撒上 22）',
    kind: 'cave',
    mx: 0.336, my: 0.474,
    connections: ['elah', 'nob', 'keilah'],
    scene: null,
    requires: ['nob'],
  },
  {
    id: 'keilah',
    name: '基伊拉·救城',
    subtitle: '救基伊拉、险被出卖而撤离（撒上 23）',
    kind: 'town',
    mx: 0.313, my: 0.651,
    connections: ['adullam', 'ziph'],
    scene: null,
    requires: ['adullam'],
  },
  {
    id: 'ziph',
    name: '西弗旷野·夜袭',
    subtitle: '第二次放过扫罗、取矛与水瓶（撒上 24,26）',
    kind: 'field',
    mx: 0.535, my: 0.635,
    connections: ['keilah', 'engedi', 'carmel'],
    scene: null,
    requires: ['keilah'],
  },
  {
    id: 'engedi',
    name: '隐基底·洞中',
    subtitle: '第一次放过扫罗、割衣襟（撒上 24）',
    kind: 'cave',
    mx: 0.582, my: 0.656,
    connections: ['field', 'ziph'],
    scene: null,
    requires: ['ziph'],
  },
  {
    id: 'carmel',
    name: '迦密·拿八与亚比该',
    subtitle: '怒气受拦阻、亚比该劝勉（撒上 25）',
    kind: 'town',
    mx: 0.470, my: 0.700,
    connections: ['ziph', 'hebron'],
    scene: null,
    requires: ['ziph'],
  },

  // —— 第七幕 · 洗革拉与王前黑暗 ——
  {
    id: 'gath',
    name: '迦特·投靠非利士',
    subtitle: '寄居亚吉、灰色阵营（撒上 27）',
    kind: 'town',
    mx: 0.227, my: 0.563,
    connections: ['elah', 'ziklag', 'gaza'],
    scene: null,
    requires: ['elah'],
  },
  {
    id: 'ziklag',
    name: '洗革拉·边城',
    subtitle: '城被焚、求问神、追回掳掠（撒上 30）',
    kind: 'town',
    mx: 0.262, my: 0.797,
    connections: ['gath', 'beersheba'],
    scene: null,
    requires: ['gath'],
  },
  {
    id: 'gilboa',
    name: '基利波山·哀歌',
    subtitle: '扫罗与约拿单战死、大卫作挽歌（撒上 31 / 撒下 1）',
    kind: 'valley',
    mx: 0.585, my: 0.150,
    connections: ['ramah'],
    scene: null,
    requires: ['ziklag'],
  },

  // —— 第八~九幕 · 希伯仑王、统一王国 ——
  {
    id: 'hebron',
    name: '希伯仑·登基',
    subtitle: '作犹大王七年半、扫罗家内战（撒下 2-4）',
    kind: 'palace',
    mx: 0.449, my: 0.599,
    connections: ['carmel', 'jerusalem', 'beersheba'],
    scene: null,
    requires: ['gilboa'],
  },
  {
    id: 'jerusalem',
    name: '耶路撒冷·大卫城',
    subtitle: '攻取锡安、约柜入城、大卫之约、王朝兴衰（撒下 5-24 / 王上 1-2）',
    kind: 'palace',
    mx: 0.484, my: 0.417,
    connections: ['bethlehem', 'gibeah', 'hebron', 'jericho', 'mahanaim'],
    scene: null,
    requires: ['hebron'],
  },

  // —— 第九~十二幕 · 四方征战、家庭崩坏、晚年动荡 ——
  {
    id: 'jericho',
    name: '耶利哥·东境',
    subtitle: '约旦河东征战、亚扪摩押之役（撒下 8,10）',
    kind: 'town',
    mx: 0.652, my: 0.422,
    connections: ['jerusalem'],
    scene: null,
    requires: ['jerusalem'],
  },
  {
    id: 'gaza',
    name: '迦萨·非利士',
    subtitle: '西境制伏非利士（撒下 8）',
    kind: 'town',
    mx: 0.086, my: 0.672,
    connections: ['gath'],
    scene: null,
    requires: ['jerusalem'],
  },
  {
    id: 'mahanaim',
    name: '玛哈念·避乱',
    subtitle: '押沙龙叛乱、大卫出逃与回宫（撒下 15-19）',
    kind: 'town',
    mx: 0.705, my: 0.335,
    connections: ['jerusalem'],
    scene: null,
    requires: ['jerusalem'],
  },
  {
    id: 'beersheba',
    name: '别是巴·南境',
    subtitle: '数点百姓、瘟疫与禾场（撒下 24）',
    kind: 'town',
    mx: 0.410, my: 0.844,
    connections: ['ziklag', 'hebron'],
    scene: null,
    requires: ['jerusalem'],
  },
];
