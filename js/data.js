/* ============================================================
 * data.js — 牧童大卫 第一章
 * 地图、瓦片、实体、任务与对白的静态数据。
 * 所有内容挂在全局 GameData 上（无打包器，按 <script> 顺序加载）。
 * ============================================================ */

const TILE = 32;
const MAP_COLS = 40;
const MAP_ROWS = 30;

/* 瓦片类型 */
const T = {
  GRASS: 0,
  TGRASS: 1,   // 高草丛（装饰，可走）
  FLOWER: 2,
  PATH: 3,     // 泥土小路
  TREE: 4,
  ROCK: 5,
  FENCE: 6,
  WELL: 7,
  HOUSE: 8,
  CAVE: 9,
  HILL: 10,
  FOLD: 11,    // 羊圈地面
};

const SOLID_TILES = new Set([T.TREE, T.ROCK, T.FENCE, T.WELL, T.HOUSE, T.CAVE, T.HILL]);

/* ---------- 用坐标“绘制”地图，避免手写 40x30 文本出错 ---------- */
function buildMap() {
  const map = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // 外圈一律是树，形成天然边界
      if (r === 0 || c === 0 || r === MAP_ROWS - 1 || c === MAP_COLS - 1) {
        row.push(T.TREE);
      } else {
        row.push(T.GRASS);
      }
    }
    map.push(row);
  }

  const set = (c, r, t) => {
    if (r > 0 && c > 0 && r < MAP_ROWS - 1 && c < MAP_COLS - 1) map[r][c] = t;
  };
  const rect = (c0, r0, c1, r1, t) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r, t);
  };
  const border = (c0, r0, c1, r1, t) => {
    for (let c = c0; c <= c1; c++) { set(c, r0, t); set(c, r1, t); }
    for (let r = r0; r <= r1; r++) { set(c0, r, t); set(c1, r, t); }
  };

  /* --- 村庄（左上）--- */
  set(3, 3, T.HOUSE); set(4, 3, T.HOUSE);
  set(8, 3, T.HOUSE); set(9, 3, T.HOUSE);
  set(3, 6, T.HOUSE); set(4, 6, T.HOUSE);
  rect(2, 4, 11, 4, T.PATH);          // 村庄前小路
  rect(6, 4, 6, 12, T.PATH);          // 通往牧场的竖向小路

  /* --- 水井 --- */
  set(12, 5, T.WELL);

  /* --- 羊圈（带缺口当门）--- */
  border(6, 14, 12, 19, T.FENCE);
  rect(7, 15, 11, 18, T.FOLD);
  set(9, 19, T.FOLD);  // 南侧门口

  /* --- 主干小路：村庄 → 牧场 → 东侧山丘 --- */
  rect(6, 12, 6, 22, T.PATH);
  rect(6, 22, 33, 22, T.PATH);
  rect(33, 9, 33, 22, T.PATH);

  /* --- 东侧山丘与山洞 --- */
  rect(30, 2, 38, 4, T.HILL);
  rect(36, 5, 38, 11, T.HILL);
  rect(30, 5, 31, 8, T.HILL);
  set(34, 6, T.CAVE);
  set(33, 6, T.HILL); set(35, 6, T.HILL);
  set(33, 5, T.HILL); set(34, 5, T.HILL); set(35, 5, T.HILL);

  /* --- 散布的树与石头 --- */
  const trees = [[15,3],[17,4],[20,2],[23,3],[26,5],[14,11],[19,9],[22,12],
                 [27,10],[16,20],[20,18],[24,16],[28,18],[12,24],[16,26],
                 [22,26],[27,25],[31,26],[35,24],[37,17],[10,9],[3,10],[4,20],[3,24]];
  trees.forEach(([c, r]) => set(c, r, T.TREE));

  const rocks = [[29,7],[30,12],[32,15],[35,14],[28,24],[18,23],[13,8],[25,20],[31,17]];
  rocks.forEach(([c, r]) => set(c, r, T.ROCK));

  /* --- 装饰：高草与花（不影响行走）--- */
  const grasses = [[16,7],[17,7],[18,8],[21,6],[22,6],[24,10],[25,11],[15,15],
                   [16,15],[19,16],[20,16],[23,19],[24,19],[14,21],[15,21],
                   [26,21],[27,21],[19,25],[20,25],[30,20],[31,20]];
  grasses.forEach(([c, r]) => { if (map[r][c] === T.GRASS) map[r][c] = T.TGRASS; });

  const flowers = [[18,5],[23,8],[15,13],[21,14],[27,16],[13,18],[17,24],
                   [25,24],[29,16],[12,22],[10,21]];
  flowers.forEach(([c, r]) => { if (map[r][c] === T.GRASS) map[r][c] = T.FLOWER; });

  return map;
}

const GameData = {
  TILE, MAP_COLS, MAP_ROWS, T, SOLID_TILES,
  buildMap,

  /* 大卫初始位置（瓦片坐标） */
  playerStart: { c: 6, r: 13 },

  /* 玩家初始属性 */
  playerStats: { maxHp: 20, atk: 5 },

  /* 静态实体：NPC 与已在圈中的羊（装饰）*/
  npcs: [
    {
      id: 'jesse',
      name: '父亲耶西',
      c: 8, r: 13,
      sprite: 'jesse',
      // 对白随任务进度变化，逻辑在 game.js 中处理
    },
  ],

  /* 圈里已有的羊（纯装饰）*/
  foldSheep: [
    { c: 8, r: 16 }, { c: 10, r: 17 }, { c: 9, r: 15 },
  ],

  /* 三只走失的羊（任务一目标）*/
  lostSheep: [
    { id: 'sheep1', c: 24, r: 6,  name: '走失的羊' },
    { id: 'sheep2', c: 30, r: 24, name: '走失的羊' },
    { id: 'sheep3', c: 19, r: 25, name: '走失的羊' },
  ],

  /* 狮子（任务二），任务一完成后出现在山洞口 */
  lion: { c: 33, r: 9, name: '猛狮' },

  /* 敌人数据 */
  enemies: {
    lion: {
      name: '猛狮',
      maxHp: 30,
      atk: 6,
      sprite: 'lion',
      attackName: '利爪',
    },
  },

  /* 大卫的战斗技能 */
  skills: [
    { id: 'sling',  name: '投石索', desc: '远程·准', minDmg: 6, maxDmg: 10, hit: 0.92, kind: 'attack' },
    { id: 'staff',  name: '牧杖击', desc: '近战·稳', minDmg: 4, maxDmg: 6,  hit: 1.0,  kind: 'attack' },
    { id: 'guard',  name: '守势',   desc: '减伤+回血', kind: 'guard', heal: 3 },
    { id: 'pray',   name: '祷告',   desc: '回复体力', kind: 'heal', heal: 7 },
  ],

  /* 对白脚本 */
  dialogue: {
    intro: [
      { name: '旁白', text: '伯利恒城外的牧场，清晨的薄雾还未散去。' },
      { name: '旁白', text: '你是耶西最小的儿子——大卫，今天要照看家中的羊群。' },
    ],
    jesseQuest1: [
      { name: '父亲耶西', text: '大卫，我的孩子，夜里有几只羊受了惊，跑散到牧场各处去了。' },
      { name: '父亲耶西', text: '去把走失的三只羊都找回来，带它们回羊圈。' },
      { name: '父亲耶西', text: '走近迷路的羊，它们就会认得你，跟你回来。' },
    ],
    jesseQuest1Progress: [
      { name: '父亲耶西', text: '还有羊在外头呢，仔细找找牧场的角落。' },
    ],
    jesseQuest1Done: [
      { name: '父亲耶西', text: '都找回来了！你真是个尽责的牧人。' },
      { name: '父亲耶西', text: '可是……东边山洞那里有动静。你听——' },
      { name: '旁白', text: '一声低沉的咆哮从山洞传来。一头猛狮正逼近羊群！' },
      { name: '父亲耶西', text: '大卫，拿起你的投石索!别让它伤了羊!' },
    ],
    jesseQuest2: [
      { name: '父亲耶西', text: '快去东边山洞,挡住那头狮子!' },
    ],
    sheepFound: [
      { name: '旁白', text: '走失的羊认出了你，乖乖跟在你身后回了羊圈。' },
    ],
    lionApproach: [
      { name: '猛狮', text: '（猛狮露出獠牙，朝着羊群低吼。）' },
      { name: '大卫', text: '耶和华曾救我脱离狮子的爪——今天也必不例外!' },
    ],
    lionDefeated: [
      { name: '旁白', text: '猛狮败下阵来，夹着尾巴逃回了山里。羊群安然无恙。' },
      { name: '大卫', text: '羊群安全了。父亲会为此高兴的。' },
    ],
  },
};
