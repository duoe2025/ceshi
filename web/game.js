"use strict";
(() => {
  // assets/scripts/core/GameData.ts
  var TILE = 32;
  var MAP_COLS = 40;
  var MAP_ROWS = 30;
  var SOLID_TILES = /* @__PURE__ */ new Set([
    4 /* TREE */,
    5 /* ROCK */,
    6 /* FENCE */,
    7 /* WELL */,
    8 /* HOUSE */,
    9 /* CAVE */,
    10 /* HILL */
  ]);
  function buildMap() {
    const map = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      const row = [];
      for (let c = 0; c < MAP_COLS; c++) {
        if (r === 0 || c === 0 || r === MAP_ROWS - 1 || c === MAP_COLS - 1) {
          row.push(4 /* TREE */);
        } else {
          row.push(0 /* GRASS */);
        }
      }
      map.push(row);
    }
    const set = (c, r, t) => {
      if (r > 0 && c > 0 && r < MAP_ROWS - 1 && c < MAP_COLS - 1)
        map[r][c] = t;
    };
    const rect = (c0, r0, c1, r1, t) => {
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++)
          set(c, r, t);
    };
    const border = (c0, r0, c1, r1, t) => {
      for (let c = c0; c <= c1; c++) {
        set(c, r0, t);
        set(c, r1, t);
      }
      for (let r = r0; r <= r1; r++) {
        set(c0, r, t);
        set(c1, r, t);
      }
    };
    set(3, 3, 8 /* HOUSE */);
    set(4, 3, 8 /* HOUSE */);
    set(8, 3, 8 /* HOUSE */);
    set(9, 3, 8 /* HOUSE */);
    set(3, 6, 8 /* HOUSE */);
    set(4, 6, 8 /* HOUSE */);
    rect(2, 4, 11, 4, 3 /* PATH */);
    rect(6, 4, 6, 12, 3 /* PATH */);
    set(12, 5, 7 /* WELL */);
    border(6, 14, 12, 19, 6 /* FENCE */);
    rect(7, 15, 11, 18, 11 /* FOLD */);
    set(9, 19, 11 /* FOLD */);
    rect(6, 12, 6, 22, 3 /* PATH */);
    rect(6, 22, 33, 22, 3 /* PATH */);
    rect(33, 9, 33, 22, 3 /* PATH */);
    rect(30, 2, 38, 4, 10 /* HILL */);
    rect(36, 5, 38, 11, 10 /* HILL */);
    rect(30, 5, 31, 8, 10 /* HILL */);
    set(34, 6, 9 /* CAVE */);
    set(33, 6, 10 /* HILL */);
    set(35, 6, 10 /* HILL */);
    set(33, 5, 10 /* HILL */);
    set(34, 5, 10 /* HILL */);
    set(35, 5, 10 /* HILL */);
    const trees = [
      [15, 3],
      [17, 4],
      [20, 2],
      [23, 3],
      [26, 5],
      [14, 11],
      [19, 9],
      [22, 12],
      [27, 10],
      [16, 20],
      [20, 18],
      [24, 16],
      [28, 18],
      [12, 24],
      [16, 26],
      [22, 26],
      [27, 25],
      [31, 26],
      [35, 24],
      [37, 17],
      [10, 9],
      [3, 10],
      [4, 20],
      [3, 24]
    ];
    trees.forEach(([c, r]) => set(c, r, 4 /* TREE */));
    const rocks = [
      [29, 7],
      [30, 12],
      [32, 15],
      [35, 14],
      [28, 24],
      [18, 23],
      [13, 8],
      [25, 20],
      [31, 17]
    ];
    rocks.forEach(([c, r]) => set(c, r, 5 /* ROCK */));
    const grasses = [
      [16, 7],
      [17, 7],
      [18, 8],
      [21, 6],
      [22, 6],
      [24, 10],
      [25, 11],
      [15, 15],
      [16, 15],
      [19, 16],
      [20, 16],
      [23, 19],
      [24, 19],
      [14, 21],
      [15, 21],
      [26, 21],
      [27, 21],
      [19, 25],
      [20, 25],
      [30, 20],
      [31, 20]
    ];
    grasses.forEach(([c, r]) => {
      if (map[r][c] === 0 /* GRASS */)
        map[r][c] = 1 /* TGRASS */;
    });
    const flowers = [
      [18, 5],
      [23, 8],
      [15, 13],
      [21, 14],
      [27, 16],
      [13, 18],
      [17, 24],
      [25, 24],
      [29, 16],
      [12, 22],
      [10, 21]
    ];
    flowers.forEach(([c, r]) => {
      if (map[r][c] === 0 /* GRASS */)
        map[r][c] = 2 /* FLOWER */;
    });
    return map;
  }
  var GameData = {
    TILE,
    MAP_COLS,
    MAP_ROWS,
    buildMap,
    /* 大卫初始位置（瓦片坐标） */
    playerStart: { c: 6, r: 13 },
    /* 玩家初始属性 */
    playerStats: { maxHp: 20, atk: 5 },
    /* 静态实体：NPC（父亲耶西）*/
    npcs: [
      { id: "jesse", name: "\u7236\u4EB2\u8036\u897F", c: 8, r: 13, sprite: "jesse" }
    ],
    /* 圈里已有的羊（纯装饰）*/
    foldSheep: [
      { c: 8, r: 16 },
      { c: 10, r: 17 },
      { c: 9, r: 15 }
    ],
    /* 三只走失的羊（任务一目标）*/
    lostSheep: [
      { id: "sheep1", c: 24, r: 6, name: "\u8D70\u5931\u7684\u7F8A" },
      { id: "sheep2", c: 30, r: 24, name: "\u8D70\u5931\u7684\u7F8A" },
      { id: "sheep3", c: 19, r: 25, name: "\u8D70\u5931\u7684\u7F8A" }
    ],
    /* 狮子（任务二），任务一完成后出现在山洞口 */
    lion: { c: 33, r: 9, name: "\u731B\u72EE" },
    /* 邪灵（任务三），击退猛狮后夜里出现在羊圈门口 */
    spirit: { c: 9, r: 21, name: "\u90AA\u7075" },
    /* 敌人数据（ARPG 即时战斗）。
     * type=beast 受物理伤害；type=spirit 几乎免疫物理，惧怕弹琴
     * spd=每帧移动像素；aggro=进入追逐的距离；touchCD=接触攻击冷却帧；touchRange=接触判定距离 */
    enemies: {
      lion: {
        name: "\u731B\u72EE",
        type: "beast",
        maxHp: 30,
        atk: 4,
        spd: 1.6,
        aggro: 220,
        touchCD: 50,
        touchRange: 28,
        sprite: "lion",
        attackName: "\u5229\u722A"
      },
      spirit: {
        name: "\u90AA\u7075",
        type: "spirit",
        maxHp: 26,
        atk: 4,
        spd: 1.5,
        aggro: 999,
        touchCD: 50,
        touchRange: 32,
        sprite: "spirit",
        attackName: "\u9634\u5F71\u4FB5\u8680"
      }
    },
    /* 三种武器（即时攻击）
     * dmgType:'phys' 物理（弹弓/杖杆）——对邪灵几乎无效
     * kind:'harp' 弹琴赞美——驱赶邪灵的关键，对野兽则起安抚作用
     * cd=攻击冷却帧；sling 远程发射飞石，staff 近战范围，harp 周身圣琴声波 */
    weapons: {
      sling: {
        id: "sling",
        name: "\u5F39\u5F13",
        label: "\u2460 \u5F39\u5F13",
        hint: "\u8FDC\u7A0B\xB7\u8FB9\u8DD1\u8FB9\u6253",
        dmgType: "phys",
        cd: 22,
        projSpeed: 7,
        projLife: 64,
        hitR: 22,
        minDmg: 6,
        maxDmg: 10
      },
      staff: {
        id: "staff",
        name: "\u6756\u4E0E\u6746",
        label: "\u2461 \u6756\u6746",
        hint: "\u8FD1\u6218\xB7\u62A4\u7F8A",
        dmgType: "phys",
        cd: 16,
        reach: 48,
        minDmg: 5,
        maxDmg: 8
      },
      harp: {
        id: "harp",
        name: "\u5F39\u7434\u8D5E\u7F8E",
        label: "\u2462 \u5F39\u7434",
        hint: "\u9A71\u90AA\xB7\u5468\u8EAB\u58F0\u6CE2",
        kind: "harp",
        cd: 58,
        radius: 124,
        minDmg: 9,
        maxDmg: 13
      }
    },
    weaponOrder: ["sling", "staff", "harp"],
    /* 对白脚本 */
    dialogue: {
      intro: [
        { name: "\u65C1\u767D", text: "\u4F2F\u5229\u6052\u57CE\u5916\u7684\u7267\u573A\uFF0C\u6E05\u6668\u7684\u8584\u96FE\u8FD8\u672A\u6563\u53BB\u3002" },
        { name: "\u65C1\u767D", text: "\u4F60\u662F\u8036\u897F\u6700\u5C0F\u7684\u513F\u5B50\u2014\u2014\u5927\u536B\uFF0C\u4ECA\u5929\u8981\u7167\u770B\u5BB6\u4E2D\u7684\u7F8A\u7FA4\u3002" }
      ],
      jesseQuest1: [
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u5927\u536B\uFF0C\u6211\u7684\u5B69\u5B50\uFF0C\u591C\u91CC\u6709\u51E0\u53EA\u7F8A\u53D7\u4E86\u60CA\uFF0C\u8DD1\u6563\u5230\u7267\u573A\u5404\u5904\u53BB\u4E86\u3002" },
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u53BB\u628A\u8D70\u5931\u7684\u4E09\u53EA\u7F8A\u90FD\u627E\u56DE\u6765\uFF0C\u5E26\u5B83\u4EEC\u56DE\u7F8A\u5708\u3002" },
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u8D70\u8FD1\u8FF7\u8DEF\u7684\u7F8A\uFF0C\u5B83\u4EEC\u5C31\u4F1A\u8BA4\u5F97\u4F60\uFF0C\u8DDF\u4F60\u56DE\u6765\u3002" }
      ],
      jesseQuest1Progress: [
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u8FD8\u6709\u7F8A\u5728\u5916\u5934\u5462\uFF0C\u4ED4\u7EC6\u627E\u627E\u7267\u573A\u7684\u89D2\u843D\u3002" }
      ],
      jesseQuest1Done: [
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u90FD\u627E\u56DE\u6765\u4E86\uFF01\u4F60\u771F\u662F\u4E2A\u5C3D\u8D23\u7684\u7267\u4EBA\u3002" },
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u53EF\u662F\u2026\u2026\u4E1C\u8FB9\u5C71\u6D1E\u90A3\u91CC\u6709\u52A8\u9759\u3002\u4F60\u542C\u2014\u2014" },
        { name: "\u65C1\u767D", text: "\u4E00\u58F0\u4F4E\u6C89\u7684\u5486\u54EE\u4ECE\u5C71\u6D1E\u4F20\u6765\u3002\u4E00\u5934\u731B\u72EE\u6B63\u903C\u8FD1\u7F8A\u7FA4\uFF01" },
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u5927\u536B\uFF0C\u62FF\u8D77\u4F60\u7684\u6295\u77F3\u7D22!\u522B\u8BA9\u5B83\u4F24\u4E86\u7F8A!" }
      ],
      jesseQuest2: [
        { name: "\u7236\u4EB2\u8036\u897F", text: "\u5FEB\u53BB\u4E1C\u8FB9\u5C71\u6D1E,\u6321\u4F4F\u90A3\u5934\u72EE\u5B50!" }
      ],
      sheepFound: [
        { name: "\u65C1\u767D", text: "\u8D70\u5931\u7684\u7F8A\u8BA4\u51FA\u4E86\u4F60\uFF0C\u4E56\u4E56\u8DDF\u5728\u4F60\u8EAB\u540E\u56DE\u4E86\u7F8A\u5708\u3002" }
      ],
      lionApproach: [
        { name: "\u731B\u72EE", text: "\uFF08\u731B\u72EE\u9732\u51FA\u7360\u7259\uFF0C\u671D\u7740\u7F8A\u7FA4\u4F4E\u543C\u3002\uFF09" },
        { name: "\u5927\u536B", text: "\u8036\u548C\u534E\u66FE\u6551\u6211\u8131\u79BB\u72EE\u5B50\u7684\u722A\u2014\u2014\u4ECA\u5929\u4E5F\u5FC5\u4E0D\u4F8B\u5916!" }
      ],
      lionDefeated: [
        { name: "\u65C1\u767D", text: "\u731B\u72EE\u8D25\u4E0B\u9635\u6765\uFF0C\u5939\u7740\u5C3E\u5DF4\u9003\u56DE\u4E86\u5C71\u91CC\u3002\u7F8A\u7FA4\u5B89\u7136\u65E0\u6059\u3002" },
        { name: "\u5927\u536B", text: "\u7F8A\u7FA4\u5B89\u5168\u4E86\u2026\u2026\u53EF\u662F\u5929\u600E\u4E48\u5FFD\u7136\u6697\u4E86\u4E0B\u6765\uFF1F" }
      ],
      nightFall: [
        { name: "\u65C1\u767D", text: "\u591C\u5E55\u9AA4\u7136\u7B3C\u7F69\u7267\u573A\u3002\u7F8A\u5708\u65C1\u805A\u8D77\u4E00\u56E2\u9ED1\u5F71\uFF0C\u7F8A\u7FA4\u60CA\u60E7\u5730\u6324\u4F5C\u4E00\u56E2\u3002" },
        { name: "\u65C1\u767D", text: "\u4E00\u53EA\u90AA\u7075\u4ECE\u9ED1\u6697\u4E2D\u6D6E\u73B0\uFF0C\u5F39\u5F13\u4E0E\u6728\u6756\u90FD\u4F24\u4E0D\u5230\u5B83\u5206\u6BEB\u3002" },
        { name: "\u5927\u536B", text: "\u8FD9\u7B49\u9634\u90AA\u4E4B\u7269\u2026\u2026\u6295\u77F3\u7D22\u4E0E\u6756\u90FD\u5948\u4F55\u4E0D\u4E86\u5B83\u3002" },
        { name: "\u5927\u536B", text: "\u6211\u8981\u5F39\u8D77\u7AD6\u7434\uFF0C\u5411\u8036\u548C\u534E\u6B4C\u5531\u8D5E\u7F8E\u2014\u2014\u9ED1\u6697\u5FC5\u8981\u9000\u53BB!" }
      ],
      spiritApproach: [
        { name: "\u90AA\u7075", text: "\uFF08\u90AA\u7075\u76D8\u65CB\u7740\u903C\u8FD1\u7F8A\u5708\uFF0C\u5410\u51FA\u9634\u51B7\u7684\u6C14\u606F\u3002\uFF09" },
        { name: "\u5927\u536B", text: "\uFF08\u5927\u536B\u53D6\u4E0B\u7AD6\u7434\u3002\uFF09\u7528\u8D5E\u7F8E\u9A71\u6563\u4F60!" }
      ],
      spiritPhysFail: [
        { name: "\u65C1\u767D", text: "\u63D0\u793A\uFF1A\u90AA\u7075\u865A\u65E0\u7F25\u7F08\uFF0C\u5F39\u5F13\u548C\u6756\u51E0\u4E4E\u65E0\u6CD5\u4F24\u5230\u5B83\u3002\u8BD5\u8BD5\u300C\u5F39\u7434\u8D5E\u7F8E\u300D\u3002" }
      ],
      spiritDefeated: [
        { name: "\u65C1\u767D", text: "\u7434\u58F0\u4E0E\u8D5E\u7F8E\u5982\u5149\u6D8C\u51FA\uFF0C\u90AA\u7075\u53D1\u51FA\u5C16\u5578\uFF0C\u5316\u4F5C\u9ED1\u70DF\u6D88\u6563\u3002" },
        { name: "\u65C1\u767D", text: "\u591C\u8272\u9000\u53BB\uFF0C\u6668\u5149\u91CD\u65B0\u7167\u4EAE\u7267\u573A\uFF0C\u7F8A\u7FA4\u5B89\u7136\u65E0\u6059\u3002" },
        { name: "\u5927\u536B", text: "\u9760\u7740\u8036\u548C\u534E\uFF0C\u72EE\u5B50\u4E0E\u90AA\u7075\u90FD\u4E0D\u80FD\u4F24\u5BB3\u4ED6\u7684\u7F8A\u7FA4\u3002" }
      ]
    }
  };

  // assets/scripts/core/GameCore.ts
  var VIEW_W = 800;
  var VIEW_H = 576;
  var MAP_W = MAP_COLS * TILE;
  var MAP_H = MAP_ROWS * TILE;
  var SPEED = 2.4;
  var HB = { ox: 7, oy: 16, w: 18, h: 14 };
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function facingVec(f) {
    return f === "left" ? { x: -1, y: 0 } : f === "right" ? { x: 1, y: 0 } : f === "up" ? { x: 0, y: -1 } : { x: 0, y: 1 };
  }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  var GameCore = class {
    constructor(view) {
      this.VIEW_W = VIEW_W;
      this.VIEW_H = VIEW_H;
      this.MAP_W = MAP_W;
      this.MAP_H = MAP_H;
      this.map = GameData.buildMap();
      this.running = false;
      this.phase = "intro";
      this.player = {
        x: 0,
        y: 0,
        facing: "down",
        hp: 20,
        maxHp: 20,
        atk: 5,
        moving: false,
        animTimer: 0,
        frame: 0
      };
      this.input = { left: false, right: false, up: false, down: false, attack: false };
      this.lostSheep = [];
      this.sheepCollected = 0;
      this.lionActive = false;
      this.lionDefeated = false;
      this.spiritActive = false;
      this.spiritDefeated = false;
      this.busy = false;
      this.battles = 0;
      this.questLogOpen = false;
      /* ---- 即时战斗 ---- */
      this.weapon = "sling";
      this.attackCD = 0;
      this.projectiles = [];
      this.effects = [];
      this.enemy = null;
      this.hintShown = false;
      this.shake = 0;
      this.playerHurt = 0;
      this.dlg = { active: false, queue: [], current: null, onDone: null };
      this.view = view;
    }
    /* ---------------- 生命周期 ---------------- */
    start() {
      this.reset();
      this.running = true;
      this.busy = true;
      this.showDialogue(GameData.dialogue.intro, () => {
        this.view.toast("\u7528\u65B9\u5411\u952E / WASD \u8D70\u5230\u7236\u4EB2\u8EAB\u8FB9\uFF0C\u6309\u7A7A\u683C\u4EA4\u8C08");
        this.busy = false;
      });
    }
    reset() {
      this.map = GameData.buildMap();
      const ps = GameData.playerStart;
      this.phase = "intro";
      this.player.x = ps.c * TILE;
      this.player.y = ps.r * TILE;
      this.player.facing = "down";
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
      this.weapon = "sling";
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
    update() {
      if (!this.running)
        return;
      if (this.busy || this.dlg.active || this.questLogOpen)
        return;
      this.updatePlayer();
      this.updateCombat();
    }
    /* ---------------- 任务目标文本 ---------------- */
    objectiveText() {
      switch (this.phase) {
        case "intro":
          return "\u53BB\u548C\u7236\u4EB2\u8036\u897F\u8C08\u8C08";
        case "q1":
          return `\u627E\u56DE\u8D70\u5931\u7684\u7F8A  ${this.sheepCollected}/3`;
        case "q1done":
          return "\u56DE\u53BB\u5411\u7236\u4EB2\u8036\u897F\u590D\u547D";
        case "q2":
          return "\u524D\u5F80\u4E1C\u8FB9\u5C71\u6D1E\uFF0C\u51FB\u9000\u731B\u72EE\uFF08\u5F39\u5F13/\u6756\u6746\uFF09";
        case "q3":
          return "\u591C\u5E55\u964D\u4E34\uFF1A\u7528\u300C\u5F39\u7434\u8D5E\u7F8E\u300D(3) \u9A71\u8D70\u7F8A\u5708\u65C1\u7684\u90AA\u7075";
        case "done":
          return "\u7B2C\u4E00\u7AE0\u5B8C\u6210\uFF01";
        default:
          return "\u2014";
      }
    }
    questList() {
      const order = {
        intro: 0,
        q1: 1,
        q1done: 1,
        q2: 2,
        q3: 3,
        done: 4
      };
      const p = order[this.phase];
      return [
        {
          title: "\u6E05\u6668\u7684\u7267\u573A",
          desc: "\u53BB\u548C\u7236\u4EB2\u8036\u897F\u8C08\u8C08",
          state: p > 0 ? "done" : "active"
        },
        {
          title: "\u627E\u56DE\u8D70\u5931\u7684\u7F8A",
          desc: "\u8D70\u8FD1\u8D70\u5931\u7684\u7F8A\uFF0C\u5E26\u5B83\u4EEC\u56DE\u7F8A\u5708",
          state: p < 1 ? "locked" : this.sheepCollected >= 3 ? "done" : "active",
          progress: `${this.sheepCollected}/3`
        },
        {
          title: "\u5B88\u62A4\u7F8A\u7FA4\xB7\u51FB\u9000\u731B\u72EE",
          desc: "\u5B9E\u65F6\u6218\u6597\uFF1A\u5F39\u5F13\u8FDC\u7A0B\u3001\u6756\u6746\u8FD1\u6218\uFF0C\u53EF\u8FB9\u8DD1\u8FB9\u6253",
          state: this.lionDefeated ? "done" : this.phase === "q2" ? "active" : "locked"
        },
        {
          title: "\u591C\u534A\u9A71\u90AA\xB7\u5F39\u7434\u8D5E\u7F8E",
          desc: "\u90AA\u7075\u514D\u75AB\u7269\u7406\uFF0C\u552F\u6709\u5F39\u7434\u8D5E\u7F8E\u80FD\u9A71\u6563\u5B83",
          state: this.spiritDefeated ? "done" : this.phase === "q3" ? "active" : "locked"
        }
      ];
    }
    /* ---------------- 对白状态机 ---------------- */
    showDialogue(lines, onDone) {
      this.dlg.queue = lines.slice();
      this.dlg.onDone = onDone || null;
      this.dlg.active = true;
      this.nextLine();
    }
    nextLine() {
      if (this.dlg.queue.length === 0) {
        this.endDialogue();
        return;
      }
      this.dlg.current = this.dlg.queue.shift();
    }
    endDialogue() {
      this.dlg.active = false;
      this.dlg.current = null;
      const cb = this.dlg.onDone;
      this.dlg.onDone = null;
      if (cb)
        cb();
    }
    dialogueActive() {
      return this.dlg.active;
    }
    currentLine() {
      return this.dlg.current;
    }
    /** 推进对白；返回 true 表示消费了这次输入 */
    advanceDialogue() {
      if (!this.dlg.active)
        return false;
      this.nextLine();
      return true;
    }
    /* ---------------- 碰撞 ---------------- */
    solidAtPixel(px, py) {
      if (px < 0 || py < 0 || px >= MAP_W || py >= MAP_H)
        return true;
      const c = Math.floor(px / TILE);
      const r = Math.floor(py / TILE);
      return SOLID_TILES.has(this.map[r][c]);
    }
    blocked(x, y) {
      const l = x + HB.ox;
      const t = y + HB.oy;
      const rr = x + HB.ox + HB.w - 1;
      const b = y + HB.oy + HB.h - 1;
      return this.solidAtPixel(l, t) || this.solidAtPixel(rr, t) || this.solidAtPixel(l, b) || this.solidAtPixel(rr, b);
    }
    /* ---------------- 移动 ---------------- */
    updatePlayer() {
      let dx = 0;
      let dy = 0;
      if (this.input.left)
        dx -= 1;
      if (this.input.right)
        dx += 1;
      if (this.input.up)
        dy -= 1;
      if (this.input.down)
        dy += 1;
      this.player.moving = dx !== 0 || dy !== 0;
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }
      if (dx < 0)
        this.player.facing = "left";
      else if (dx > 0)
        this.player.facing = "right";
      else if (dy < 0)
        this.player.facing = "up";
      else if (dy > 0)
        this.player.facing = "down";
      const nx = this.player.x + dx * SPEED;
      if (!this.blocked(nx, this.player.y))
        this.player.x = nx;
      const ny = this.player.y + dy * SPEED;
      if (!this.blocked(this.player.x, ny))
        this.player.y = ny;
      if (this.player.moving) {
        this.player.animTimer++;
        if (this.player.animTimer > 8) {
          this.player.frame ^= 1;
          this.player.animTimer = 0;
        }
      } else {
        this.player.frame = 0;
      }
      this.checkSheepPickup();
    }
    playerCenter() {
      return { x: this.player.x + TILE / 2, y: this.player.y + TILE / 2 };
    }
    enemyCenter(e) {
      return { x: e.x + TILE / 2, y: e.y + TILE / 2 };
    }
    tileCenter(c, r) {
      return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
    }
    /* ---------------- 羊：触碰拾取 ---------------- */
    checkSheepPickup() {
      if (this.phase !== "q1")
        return;
      const pc = this.playerCenter();
      for (const s of this.lostSheep) {
        if (s.taken)
          continue;
        if (dist(pc, this.tileCenter(s.c, s.r)) < 30) {
          s.taken = true;
          this.sheepCollected++;
          this.view.toast(`\u627E\u5230\u4E00\u53EA\u7F8A\uFF01(${this.sheepCollected}/3)`);
          if (this.sheepCollected >= 3) {
            this.phase = "q1done";
            this.busy = true;
            this.showDialogue(GameData.dialogue.sheepFound, () => {
              this.view.toast("\u4E09\u53EA\u7F8A\u90FD\u627E\u56DE\u6765\u4E86\uFF0C\u56DE\u53BB\u627E\u7236\u4EB2");
              this.busy = false;
            });
          }
          break;
        }
      }
    }
    /* ---------------- 互动（空格/回车）：仅与父亲耶西对话 ---------------- */
    interact() {
      const pc = this.playerCenter();
      const jesse2 = GameData.npcs[0];
      if (dist(pc, this.tileCenter(jesse2.c, jesse2.r)) < 52)
        this.talkToJesse();
    }
    /** 玩家是否站在可与父亲对话的范围内（渲染层用于画交互提示）。 */
    canTalkToJesse() {
      const pc = this.playerCenter();
      const jesse2 = GameData.npcs[0];
      return !this.busy && dist(pc, this.tileCenter(jesse2.c, jesse2.r)) < 52;
    }
    talkToJesse() {
      this.busy = true;
      if (this.phase === "intro") {
        this.showDialogue(GameData.dialogue.jesseQuest1, () => {
          this.phase = "q1";
          this.view.toast("\u65B0\u4EFB\u52A1\uFF1A\u627E\u56DE\u8D70\u5931\u7684\u7F8A");
          this.busy = false;
        });
      } else if (this.phase === "q1") {
        this.showDialogue(GameData.dialogue.jesseQuest1Progress, () => {
          this.busy = false;
        });
      } else if (this.phase === "q1done") {
        this.showDialogue(GameData.dialogue.jesseQuest1Done, () => {
          this.phase = "q2";
          this.lionActive = true;
          this.spawnEnemy("lion");
          this.view.toast("\u5B9E\u65F6\u6218\u6597\uFF1AJ/\u7A7A\u683C \u653B\u51FB \xB7 1/2/3 \u5207\u6362\u6B66\u5668 \xB7 \u53EF\u8FB9\u8DD1\u8FB9\u6253");
          this.busy = false;
        });
      } else if (this.phase === "q2") {
        this.showDialogue(GameData.dialogue.jesseQuest2, () => {
          this.busy = false;
        });
      } else {
        this.showDialogue([{ name: "\u7236\u4EB2\u8036\u897F", text: "\u597D\u5B69\u5B50\uFF0C\u4ECA\u5929\u8F9B\u82E6\u4F60\u4E86\u3002" }], () => {
          this.busy = false;
        });
      }
    }
    /* ---------------- 即时战斗 ---------------- */
    spawnEnemy(key) {
      const def = GameData.enemies[key];
      const pos = key === "lion" ? GameData.lion : GameData.spirit;
      this.enemy = {
        key,
        name: def.name,
        type: def.type,
        sprite: def.sprite,
        x: pos.c * TILE,
        y: pos.r * TILE,
        hp: def.maxHp,
        maxHp: def.maxHp,
        atk: def.atk,
        spd: def.spd,
        aggro: def.aggro,
        touchRange: def.touchRange,
        touchMax: def.touchCD,
        touchCD: 0,
        greeted: false,
        dead: false,
        hurt: 0
      };
    }
    setWeapon(id) {
      if (!this.running || this.busy)
        return;
      if (this.weapon === id)
        return;
      this.weapon = id;
      const w = GameData.weapons[id];
      this.view.toast(`\u6B66\u5668\uFF1A${w.name} \u2014 ${w.hint}`, 1100);
    }
    cycleWeapon() {
      const order = GameData.weaponOrder;
      const i = order.indexOf(this.weapon);
      this.setWeapon(order[(i + 1) % order.length]);
    }
    tryAttack() {
      if (!this.enemy || this.busy)
        return;
      if (this.attackCD > 0)
        return;
      const wpn = GameData.weapons[this.weapon];
      this.attackCD = wpn.cd;
      const pc = this.playerCenter();
      const dir = facingVec(this.player.facing);
      if (this.weapon === "sling") {
        this.projectiles.push({
          x: pc.x,
          y: pc.y,
          vx: dir.x * wpn.projSpeed,
          vy: dir.y * wpn.projSpeed,
          life: wpn.projLife
        });
      } else if (this.weapon === "staff") {
        this.effects.push({
          kind: "slash",
          x: pc.x + dir.x * 22,
          y: pc.y + dir.y * 22,
          facing: this.player.facing,
          life: 10,
          max: 10
        });
        const e = this.enemy;
        if (e && !e.dead && dist(pc, this.enemyCenter(e)) < wpn.reach)
          this.damageEnemy(wpn);
      } else if (this.weapon === "harp") {
        this.effects.push({ kind: "wave", x: pc.x, y: pc.y, life: 28, max: 28, radius: wpn.radius });
        const e = this.enemy;
        if (e && !e.dead && dist(pc, this.enemyCenter(e)) < wpn.radius)
          this.damageEnemy(wpn);
      }
    }
    damageEnemy(wpn) {
      const e = this.enemy;
      if (!e || e.dead)
        return;
      if (e.type === "spirit") {
        if (wpn.kind === "harp") {
          const dmg = rand(wpn.minDmg, wpn.maxDmg);
          e.hp = Math.max(0, e.hp - dmg);
          e.hurt = 12;
          this.shake = 6;
          this.view.toast(`\u5723\u6D01\u7434\u58F0\u9A71\u90AA\uFF01-${dmg}`, 900);
        } else {
          e.hp = Math.max(0, e.hp - 1);
          e.hurt = 6;
          if (!this.hintShown) {
            this.view.toast("\u7269\u7406\u653B\u51FB\u5BF9\u90AA\u7075\u51E0\u4E4E\u65E0\u6548\uFF01\u6539\u7528\u300C\u5F39\u7434\u8D5E\u7F8E\u300D(\u6309 3)", 2200);
            this.hintShown = true;
          }
        }
      } else {
        if (wpn.kind === "harp") {
          e.atk = Math.max(2, e.atk - 1);
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
          this.view.toast("\u5F39\u7434\u5B89\u629A\uFF0C\u731B\u72EE\u6C14\u52BF\u7A0D\u51CF", 900);
        } else {
          const dmg = rand(wpn.minDmg, wpn.maxDmg);
          e.hp = Math.max(0, e.hp - dmg);
          e.hurt = 12;
          this.shake = 6;
        }
      }
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        this.onEnemyDefeated(e.key);
      }
    }
    hitPlayer() {
      const e = this.enemy;
      if (!e)
        return;
      const dmg = rand(Math.max(1, e.atk - 1), e.atk + 2);
      this.player.hp = Math.max(0, this.player.hp - dmg);
      this.shake = 6;
      this.playerHurt = 12;
      if (this.player.hp <= 0)
        this.playerDown();
    }
    onEnemyDefeated(key) {
      this.enemy = null;
      this.projectiles = [];
      this.effects = [];
      this.busy = true;
      if (key === "lion") {
        this.lionDefeated = true;
        this.lionActive = false;
        this.showDialogue(GameData.dialogue.lionDefeated, () => {
          this.showDialogue(GameData.dialogue.nightFall, () => {
            this.phase = "q3";
            this.player.x = 9 * TILE;
            this.player.y = 23 * TILE;
            this.player.facing = "up";
            this.spawnEnemy("spirit");
            this.spiritActive = true;
            this.weapon = "harp";
            this.view.toast("\u591C\u6218\uFF01\u7528\u300C\u5F39\u7434\u8D5E\u7F8E\u300D(3) \u9A71\u6563\u90AA\u7075", 2200);
            this.busy = false;
          });
        });
      } else {
        this.spiritDefeated = true;
        this.spiritActive = false;
        this.showDialogue(GameData.dialogue.spiritDefeated, () => {
          this.phase = "done";
          this.finishChapter();
        });
      }
    }
    playerDown() {
      this.busy = true;
      this.projectiles = [];
      this.effects = [];
      this.player.hp = this.player.maxHp;
      const e = this.enemy;
      if (e) {
        const def = GameData.enemies[e.key];
        const pos = e.key === "lion" ? GameData.lion : GameData.spirit;
        e.hp = e.maxHp;
        e.atk = def.atk;
        e.x = pos.c * TILE;
        e.y = pos.r * TILE;
        e.touchCD = 0;
        e.dead = false;
        e.greeted = true;
        e.hurt = 0;
      }
      let line;
      if (this.phase === "q3") {
        this.player.x = 9 * TILE;
        this.player.y = 23 * TILE;
        this.player.facing = "up";
        line = [{ name: "\u65C1\u767D", text: "\u90AA\u7075\u7684\u9634\u5F71\u538B\u5F97\u5927\u536B\u51E0\u4E4E\u7A92\u606F\u2026\u2026\u7A33\u4F4F\u5FC3\u795E\uFF0C\u518D\u5F39\u8D77\u7AD6\u7434!" }];
      } else {
        this.player.x = 26 * TILE;
        this.player.y = 22 * TILE;
        this.player.facing = "right";
        line = [{ name: "\u65C1\u767D", text: "\u5927\u536B\u88AB\u731B\u72EE\u6251\u9000\u2026\u2026\u4ED6\u9000\u5230\u8DEF\u4E0A\uFF0C\u6DF1\u5438\u4E00\u53E3\u6C14\uFF0C\u63E1\u7D27\u6295\u77F3\u7D22\u518D\u6765\u4E00\u6B21!" }];
      }
      this.showDialogue(line, () => {
        this.busy = false;
      });
    }
    updateProjectiles() {
      const e = this.enemy;
      const sling = GameData.weapons.sling;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        let remove = false;
        if (p.life <= 0 || this.solidAtPixel(p.x, p.y)) {
          remove = true;
        } else if (e && !e.dead && dist(p, this.enemyCenter(e)) < sling.hitR) {
          this.damageEnemy(sling);
          this.effects.push({ kind: "hit", x: p.x, y: p.y, life: 8, max: 8 });
          remove = true;
        }
        if (remove)
          this.projectiles.splice(i, 1);
      }
    }
    updateEnemy() {
      const e = this.enemy;
      if (!e || e.dead)
        return;
      const pc = this.playerCenter();
      const ec = this.enemyCenter(e);
      const d = dist(pc, ec);
      if (!e.greeted && d < 175) {
        e.greeted = true;
        this.busy = true;
        const lines = e.key === "lion" ? GameData.dialogue.lionApproach : GameData.dialogue.spiritApproach;
        this.showDialogue(lines, () => {
          this.busy = false;
        });
        return;
      }
      if (!e.greeted)
        return;
      if (d < e.aggro && d > 1) {
        const vx = (pc.x - ec.x) / d;
        const vy = (pc.y - ec.y) / d;
        e.x += vx * e.spd;
        e.y += vy * e.spd;
        e.x = Math.max(TILE, Math.min(e.x, MAP_W - TILE * 2));
        e.y = Math.max(TILE, Math.min(e.y, MAP_H - TILE * 2));
      }
      if (e.touchCD > 0)
        e.touchCD--;
      if (d < e.touchRange && e.touchCD <= 0) {
        this.hitPlayer();
        e.touchCD = e.touchMax;
      }
    }
    updateEffects() {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        if (--this.effects[i].life <= 0)
          this.effects.splice(i, 1);
      }
    }
    updateCombat() {
      if (this.attackCD > 0)
        this.attackCD--;
      if (this.input.attack)
        this.tryAttack();
      this.updateProjectiles();
      this.updateEnemy();
      this.updateEffects();
      if (this.shake > 0)
        this.shake--;
      if (this.playerHurt > 0)
        this.playerHurt--;
    }
    finishChapter() {
      this.running = false;
      this.view.onFinish({ hp: this.player.hp, maxHp: this.player.maxHp });
    }
    /* ---------------- 输入入口（供渲染层转发） ---------------- */
    setMove(dir, down) {
      this.input[dir] = down;
    }
    setAttack(down) {
      this.input.attack = down;
    }
    /** 空格 / 回车：对白中推进；战斗中无敌人时与父亲对话 */
    confirm() {
      if (this.dlg.active) {
        this.advanceDialogue();
        return;
      }
      if (this.running && !this.busy && !this.questLogOpen && !this.enemy) {
        this.interact();
      }
    }
    toggleQuestLog() {
      if (this.dlg.active)
        return this.questLogOpen;
      this.questLogOpen = !this.questLogOpen;
      return this.questLogOpen;
    }
  };

  // assets/scripts/canvas/CanvasPainter.ts
  var cssCache = {};
  function cssColor(hex2) {
    if (hex2.length !== 9 || hex2[0] !== "#")
      return hex2;
    if (!cssCache[hex2]) {
      const r = parseInt(hex2.slice(1, 3), 16);
      const g = parseInt(hex2.slice(3, 5), 16);
      const b = parseInt(hex2.slice(5, 7), 16);
      const a = parseInt(hex2.slice(7, 9), 16) / 255;
      cssCache[hex2] = `rgba(${r},${g},${b},${a.toFixed(3)})`;
    }
    return cssCache[hex2];
  }
  var CanvasPainter = class {
    constructor(ctx2) {
      this.ctx = ctx2;
    }
    clear() {
    }
    fillRect(sx, sy, w, h, color) {
      if (w <= 0 || h <= 0)
        return;
      this.ctx.fillStyle = cssColor(color);
      this.ctx.fillRect(sx, sy, w, h);
    }
    fillCircle(sx, sy, r, color) {
      if (r <= 0)
        return;
      this.ctx.fillStyle = cssColor(color);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    fillEllipse(sx, sy, rx, ry, color) {
      if (rx <= 0 || ry <= 0)
        return;
      this.ctx.fillStyle = cssColor(color);
      this.ctx.beginPath();
      this.ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
    fillPoly(pts, color) {
      if (pts.length < 3)
        return;
      this.ctx.fillStyle = cssColor(color);
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        this.ctx.lineTo(pts[i][0], pts[i][1]);
      this.ctx.closePath();
      this.ctx.fill();
    }
    strokeCircle(sx, sy, r, lineWidth, color) {
      if (r <= 0)
        return;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = cssColor(color);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    strokeArc(sx, sy, r, a0, a1, lineWidth, color) {
      if (r <= 0)
        return;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = cssColor(color);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, r, a0, a1);
      this.ctx.stroke();
    }
  };

  // assets/scripts/Sprites.ts
  function hex(s) {
    return s;
  }
  function blk(p, x, y, scale, col, row, w, h, color) {
    p.fillRect(
      Math.round(x + col * scale),
      Math.round(y + row * scale),
      Math.ceil(w * scale),
      Math.ceil(h * scale),
      hex(color)
    );
  }
  var TILE2 = 32;
  function tile(p, type, x, y) {
    const s = TILE2;
    switch (type) {
      case 0 /* GRASS */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillRect(x + 6, y + 10, 3, 3, hex("#5d9a45"));
        p.fillRect(x + 20, y + 22, 3, 3, hex("#5d9a45"));
        p.fillRect(x + 25, y + 6, 2, 2, hex("#5d9a45"));
        break;
      case 1 /* TGRASS */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        for (let i = 0; i < 5; i++)
          p.fillRect(x + 4 + i * 6, y + 18 - i % 2 * 4, 2, 10, hex("#4f8a3a"));
        break;
      case 2 /* FLOWER */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillRect(x + 8, y + 10, 4, 4, hex("#e3d24a"));
        p.fillRect(x + 20, y + 18, 4, 4, hex("#e06f9c"));
        p.fillRect(x + 9, y + 11, 2, 2, hex("#ffffff"));
        p.fillRect(x + 21, y + 19, 2, 2, hex("#ffffff"));
        break;
      case 3 /* PATH */:
        p.fillRect(x, y, s, s, hex("#c2a878"));
        p.fillRect(x + 5, y + 7, 4, 3, hex("#b39866"));
        p.fillRect(x + 18, y + 16, 5, 3, hex("#b39866"));
        p.fillRect(x + 10, y + 24, 3, 3, hex("#b39866"));
        break;
      case 11 /* FOLD */:
        p.fillRect(x, y, s, s, hex("#cbb083"));
        p.fillRect(x + 6, y + 12, 6, 3, hex("#bfa172"));
        p.fillRect(x + 18, y + 22, 6, 3, hex("#bfa172"));
        break;
      case 4 /* TREE */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillRect(x + 13, y + 18, 6, 12, hex("#5a3b22"));
        p.fillCircle(x + 16, y + 13, 13, hex("#2f6b2f"));
        p.fillCircle(x + 12, y + 11, 8, hex("#3c8a3c"));
        p.fillCircle(x + 20, y + 15, 6, hex("#4fa84f"));
        break;
      case 5 /* ROCK */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillPoly([[x + 6, y + 26], [x + 11, y + 10], [x + 22, y + 9], [x + 27, y + 26]], hex("#8c8c94"));
        p.fillRect(x + 12, y + 13, 6, 4, hex("#a8a8b0"));
        p.fillRect(x + 6, y + 24, 21, 3, hex("#6e6e76"));
        break;
      case 6 /* FENCE */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillRect(x + 4, y + 8, 4, 20, hex("#7a5230"));
        p.fillRect(x + 24, y + 8, 4, 20, hex("#7a5230"));
        p.fillRect(x, y + 12, s, 4, hex("#8a6038"));
        p.fillRect(x, y + 22, s, 4, hex("#8a6038"));
        break;
      case 7 /* WELL */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillRect(x + 6, y + 12, 20, 16, hex("#7d7d86"));
        p.fillRect(x + 9, y + 15, 14, 10, hex("#2b3a55"));
        p.fillRect(x + 5, y + 4, 3, 10, hex("#5a3b22"));
        p.fillRect(x + 24, y + 4, 3, 10, hex("#5a3b22"));
        p.fillRect(x + 4, y + 3, 24, 4, hex("#8a6038"));
        break;
      case 8 /* HOUSE */:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
        p.fillRect(x + 2, y + 14, 28, 16, hex("#caa472"));
        p.fillPoly([[x, y + 15], [x + 16, y + 2], [x + 32, y + 15]], hex("#a8412f"));
        p.fillRect(x + 13, y + 20, 7, 10, hex("#5a3b22"));
        p.fillRect(x + 5, y + 18, 5, 5, hex("#7ec0d8"));
        p.fillRect(x + 22, y + 18, 5, 5, hex("#7ec0d8"));
        break;
      case 10 /* HILL */:
        p.fillRect(x, y, s, s, hex("#8f7f5f"));
        p.fillRect(x + 4, y + 6, 10, 6, hex("#7d6f52"));
        p.fillRect(x + 18, y + 16, 10, 6, hex("#7d6f52"));
        p.fillRect(x, y, s, 4, hex("#a3927040"));
        break;
      case 9 /* CAVE */:
        p.fillRect(x, y, s, s, hex("#8f7f5f"));
        p.fillRect(x + 2, y + 2, 28, 28, hex("#6b5d44"));
        p.fillEllipse(x + 16, y + 20, 11, 12, hex("#120d08"));
        break;
      default:
        p.fillRect(x, y, s, s, hex("#6aa84f"));
    }
  }
  function david(p, x, y, scale, facing, frame) {
    const b = (c, r, w, h, col) => blk(p, x, y, scale, c, r, w, h, col);
    const step = frame ? 1 : 0;
    b(5, 1, 6, 2, "#6b4a2b");
    b(4, 2, 8, 2, "#6b4a2b");
    b(5, 3, 6, 3, "#e8b88a");
    const ex = facing === "left" ? 5 : facing === "right" ? 7 : 6;
    b(ex, 4, 1, 1, "#2a1c10");
    b(ex + 2, 4, 1, 1, "#2a1c10");
    b(4, 6, 8, 6, "#d9c08a");
    b(4, 6, 8, 1, "#c2a86f");
    b(4, 9, 8, 1, "#7a5230");
    b(3, 6, 1, 4, "#e8b88a");
    b(12, 6, 1, 4, "#e8b88a");
    b(12, 9, 2, 2, "#efe8d8");
    b(5, 12, 2, 3 + step, "#caa06f");
    b(9, 12, 2, 3 - step, "#caa06f");
    b(5, 14 + step, 2, 1, "#5a3b22");
    b(9, 14 - step, 2, 1, "#5a3b22");
  }
  function jesse(p, x, y, scale) {
    const b = (c, r, w, h, col) => blk(p, x, y, scale, c, r, w, h, col);
    b(5, 0, 6, 2, "#8a8a8a");
    b(4, 1, 8, 2, "#6f6f6f");
    b(5, 3, 6, 3, "#e0b083");
    b(6, 4, 1, 1, "#2a1c10");
    b(9, 4, 1, 1, "#2a1c10");
    b(5, 6, 6, 1, "#cfcfcf");
    b(4, 6, 8, 8, "#7d6a9c");
    b(4, 6, 8, 1, "#6a5888");
    b(3, 7, 1, 4, "#e0b083");
    b(12, 7, 1, 4, "#e0b083");
    b(5, 14, 6, 1, "#5a3b22");
  }
  function sheep(p, x, y, scale) {
    const b = (c, r, w, h, col) => blk(p, x, y, scale, c, r, w, h, col);
    b(3, 5, 10, 6, "#f3efe6");
    b(2, 5, 2, 5, "#e8e2d4");
    b(12, 5, 2, 5, "#e8e2d4");
    b(11, 4, 4, 4, "#dcd2bf");
    b(10, 5, 1, 3, "#3a3a3a");
    b(15, 6, 1, 2, "#3a3a3a");
    b(12, 5, 1, 1, "#2a2a2a");
    b(4, 11, 2, 2, "#777777");
    b(10, 11, 2, 2, "#777777");
  }
  function lion(p, x, y, scale, hurt) {
    const b = (c, r, w, h, col) => blk(p, x, y, scale, c, r, w, h, col);
    const body = hurt ? "#c97a3a" : "#d89a4a";
    const mane = hurt ? "#7a4a1f" : "#8a5a25";
    b(3, 9, 11, 5, body);
    b(2, 12, 2, 3, body);
    b(12, 12, 2, 3, body);
    b(13, 6, 4, 1, body);
    b(2, 2, 8, 8, mane);
    b(3, 3, 6, 6, body);
    b(4, 4, 1, 1, "#2a1c10");
    b(7, 4, 1, 1, "#2a1c10");
    b(5, 6, 2, 1, "#7a4a1f");
    b(4, 7, 1, 1, "#ffffff");
    b(7, 7, 1, 1, "#ffffff");
  }
  function spirit(p, x, y, scale, hurt) {
    const b = (c, r, w, h, col) => blk(p, x, y, scale, c, r, w, h, col);
    const robe = hurt ? "#5a4a7a" : "#2e2540";
    const robe2 = hurt ? "#7a6aa0" : "#403458";
    const eye = hurt ? "#fff2a0" : "#8be0ff";
    b(5, 1, 6, 3, robe2);
    b(4, 3, 8, 7, robe);
    b(3, 5, 1, 4, robe);
    b(12, 5, 1, 4, robe);
    b(4, 10, 2, 2, robe2);
    b(7, 11, 2, 2, robe);
    b(10, 10, 2, 2, robe2);
    b(5, 12, 1, 1, robe);
    b(9, 12, 1, 1, robe);
    b(6, 4, 1, 2, eye);
    b(9, 4, 1, 2, eye);
    b(2, 2, 1, 1, robe2);
    b(13, 3, 1, 1, robe2);
    b(3, 9, 1, 1, robe2);
  }

  // assets/scripts/IPainter.ts
  function rgba(r, g, b, a = 255) {
    const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}${h(a)}`;
  }

  // assets/scripts/canvas/CanvasGame.ts
  var VIEW_W2 = 800;
  var VIEW_H2 = 576;
  var MAP_W2 = MAP_COLS * TILE;
  var MAP_H2 = MAP_ROWS * TILE;
  var STEP = 1 / 60;
  var CanvasGame = class {
    constructor(ctx2) {
      this.acc = 0;
      this.last = 0;
      this.animClock = 0;
      this.toastMsg = "";
      this.toastTimer = 0;
      this.finished = false;
      // 触摸控件
      this.touchUI = false;
      this.joyId = -1;
      this.joyCX = 0;
      this.joyCY = 0;
      this.joyDX = 0;
      this.joyDY = 0;
      this.atkId = -1;
      this.endText = "";
      this.ctx = ctx2;
      this.painter = new CanvasPainter(ctx2);
      this.core = new GameCore(this);
    }
    start() {
      this.finished = false;
      this.core.start();
      this.last = this.now();
    }
    now() {
      return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    }
    setTouchControls(on) {
      this.touchUI = on;
    }
    /* ---------------- IGameView ---------------- */
    toast(msg, ms = 1800) {
      this.toastMsg = msg;
      this.toastTimer = ms / 1e3;
    }
    onFinish(stats) {
      this.finished = true;
      this.endText = `\u7B2C\u4E00\u7AE0 \xB7 \u7267\u7AE5\u5927\u536B \u2014 \u5B8C\u6210\uFF01

\u5927\u536B\u9760\u7740\u5BF9\u8036\u548C\u534E\u7684\u4FE1\u5FC3\uFF0C\u627E\u56DE\u8D70\u5931\u7684\u7F8A\uFF0C
\u51FB\u9000\u731B\u72EE\uFF0C\u5E76\u4EE5\u8D5E\u7F8E\u7684\u7434\u58F0\u9A71\u6563\u4E86\u90AA\u7075\u3002

\u5269\u4F59\u751F\u547D\uFF1A${stats.hp} / ${stats.maxHp}

` + (this.touchUI ? "\u70B9\u51FB\u5C4F\u5E55\u91CD\u65B0\u5F00\u59CB" : "\u6309 R \u91CD\u65B0\u5F00\u59CB");
    }
    /* ---------------- 主循环（由入口每帧调用） ---------------- */
    frame() {
      const t = this.now();
      let dt = (t - this.last) / 1e3;
      this.last = t;
      if (dt > 0.1)
        dt = 0.1;
      this.animClock += dt;
      if (this.toastTimer > 0)
        this.toastTimer -= dt;
      if (!this.finished) {
        this.acc += dt;
        let guard = 0;
        while (this.acc >= STEP && guard++ < 5) {
          this.core.update();
          this.acc -= STEP;
        }
      }
      this.render();
    }
    /* ---------------- 文本工具 ---------------- */
    text(str, x, y, size, color, align = "left", baseline = "top") {
      const c = this.ctx;
      c.font = `${size}px sans-serif`;
      c.textAlign = align;
      c.textBaseline = baseline;
      c.fillStyle = cssColor(color);
      c.fillText(str, x, y);
    }
    wrap(str, size, maxW) {
      const c = this.ctx;
      c.font = `${size}px sans-serif`;
      const out = [];
      str.split("\n").forEach((para) => {
        let line = "";
        for (const ch of para) {
          if (c.measureText(line + ch).width > maxW && line) {
            out.push(line);
            line = ch;
          } else
            line += ch;
        }
        out.push(line);
      });
      return out;
    }
    textBlock(str, x, y, size, color, maxW, align = "left") {
      const lines = this.wrap(str, size, maxW);
      const lh = size + 6;
      lines.forEach((ln, i) => this.text(ln, x, y + i * lh, size, color, align, "top"));
    }
    /* ---------------- 渲染 ---------------- */
    camera(shake) {
      const G = this.core;
      let camX = G.player.x + TILE / 2 - VIEW_W2 / 2;
      let camY = G.player.y + TILE / 2 - VIEW_H2 / 2;
      camX = Math.max(0, Math.min(camX, MAP_W2 - VIEW_W2));
      camY = Math.max(0, Math.min(camY, MAP_H2 - VIEW_H2));
      camX = Math.round(camX);
      camY = Math.round(camY);
      if (shake > 0) {
        camX += Math.round((Math.random() * 2 - 1) * 3);
        camY += Math.round((Math.random() * 2 - 1) * 3);
      }
      return { camX, camY };
    }
    render() {
      const G = this.core;
      const p = this.painter;
      const { camX, camY } = this.camera(G.shake);
      p.fillRect(0, 0, VIEW_W2, VIEW_H2, rgba(20, 22, 28));
      const c0 = Math.floor(camX / TILE);
      const r0 = Math.floor(camY / TILE);
      const c1 = Math.min(MAP_COLS - 1, c0 + Math.ceil(VIEW_W2 / TILE) + 1);
      const r1 = Math.min(MAP_ROWS - 1, r0 + Math.ceil(VIEW_H2 / TILE) + 1);
      for (let r = Math.max(0, r0); r <= r1; r++) {
        for (let c = Math.max(0, c0); c <= c1; c++) {
          tile(p, G.map[r][c], c * TILE - camX, r * TILE - camY);
        }
      }
      GameData.foldSheep.forEach((s) => sheep(p, s.c * TILE - camX, s.r * TILE - camY + 4, 2));
      G.lostSheep.forEach((s) => {
        if (!s.taken)
          sheep(p, s.c * TILE - camX, s.r * TILE - camY + 4, 2);
      });
      this.drawFollowers(camX, camY);
      const jesse2 = GameData.npcs[0];
      jesse(p, jesse2.c * TILE - camX, jesse2.r * TILE - camY, 2);
      this.nameTag(jesse2.name, jesse2.c * TILE - camX + 16, jesse2.r * TILE - camY - 4, rgba(244, 236, 216));
      if (G.canTalkToJesse()) {
        const bob = Math.sin(this.animClock * 5) * 2;
        this.text("\u7A7A\u683C/\u70B9\u51FB \u25BC", jesse2.c * TILE - camX + 16, jesse2.r * TILE - camY - 22 + bob, 14, rgba(224, 178, 80), "center", "middle");
      }
      G.projectiles.forEach((pr) => this.drawProjectile(pr.x - camX, pr.y - camY));
      if (G.enemy) {
        const e = G.enemy;
        const sx = e.x - camX;
        const sy = e.y - camY;
        if (e.sprite === "spirit") {
          const bob = Math.sin(this.animClock * 3.6) * 3;
          spirit(p, sx - 6, sy - 10 + bob, 2.6, e.hurt > 0);
        } else {
          lion(p, sx - 8, sy - 8, 3, e.hurt > 0);
        }
        const col = e.type === "spirit" ? rgba(154, 127, 208) : rgba(217, 83, 79);
        this.nameTag(e.name, sx + 16, sy - 14, col);
        this.enemyHpBar(sx + 16, sy - 28, e);
        if (e.hurt > 0)
          e.hurt--;
      }
      this.drawEffects(camX, camY);
      let davidAlpha = 255;
      if (G.playerHurt > 0 && Math.floor(G.playerHurt / 3) % 2 === 0)
        davidAlpha = 115;
      david(p, G.player.x - camX, G.player.y - camY, 2, G.player.facing, G.player.frame);
      if (davidAlpha < 255)
        p.fillRect(G.player.x - camX + 14, G.player.y - camY + 2, 20, 30, rgba(120, 30, 40, 90));
      if (G.phase === "q3" && !G.spiritDefeated)
        p.fillRect(0, 0, VIEW_W2, VIEW_H2, rgba(14, 16, 46, 128));
      this.text(`\u76EE\u6807\uFF1A${G.objectiveText()}`, 10, 8, 16, rgba(255, 222, 120));
      this.drawHpBar(G);
      const showWeapon = !!G.enemy || G.phase === "q2" || G.phase === "q3";
      if (showWeapon)
        this.drawWeaponHud();
      this.drawDialogue();
      this.drawQuestLog();
      if (this.toastTimer > 0)
        this.drawToast();
      if (this.touchUI && !this.finished)
        this.drawTouchControls();
      if (this.finished)
        this.drawEnd();
    }
    drawFollowers(camX, camY) {
      const G = this.core;
      for (let i = 0; i < G.sheepCollected && i < 3; i++) {
        const fx = G.player.x - camX + (i - 1) * 10;
        const fy = G.player.y - camY + 18 + i * 4;
        if (G.phase === "q1" || G.phase === "q1done")
          sheep(this.painter, fx, fy, 1.4);
      }
    }
    drawProjectile(x, y) {
      this.painter.fillCircle(x, y, 4, rgba(207, 202, 187));
      this.painter.fillCircle(x + 1, y + 1, 2, rgba(155, 150, 132));
    }
    drawEffects(camX, camY) {
      const p = this.painter;
      this.core.effects.forEach((fx) => {
        const x = fx.x - camX;
        const y = fx.y - camY;
        const t = fx.life / fx.max;
        if (fx.kind === "slash") {
          const a0 = fx.facing === "left" ? Math.PI * 0.6 : fx.facing === "right" ? -Math.PI * 0.4 : fx.facing === "up" ? Math.PI * 1.1 : Math.PI * 0.1;
          p.strokeArc(x, y, 26, a0, a0 + Math.PI * 0.8, 4, rgba(255, 247, 224, Math.round(255 * t)));
        } else if (fx.kind === "wave") {
          const rr = (1 - t) * (fx.radius || 0);
          const a = Math.max(0, Math.round(255 * t * 0.9));
          p.strokeCircle(x, y, rr, 3, rgba(255, 226, 122, a));
          p.strokeCircle(x, y, rr * 0.6, 2, rgba(255, 246, 207, a));
        } else if (fx.kind === "hit") {
          const a = Math.round(255 * t);
          for (let i = 0; i < 4; i++) {
            const ang = i * Math.PI / 2 + (1 - t);
            p.fillRect(x + Math.cos(ang) * 8 - 1, y + Math.sin(ang) * 8 - 1, 3, 3, rgba(255, 242, 192, a));
          }
        }
      });
    }
    nameTag(text, cx, cy, color) {
      const w = text.length * 12 + 8;
      this.painter.fillRect(cx - w / 2, cy - 12, w, 14, rgba(14, 11, 22, 178));
      this.text(text, cx, cy - 5, 11, color, "center", "middle");
    }
    enemyHpBar(cx, topY, e) {
      const w = 46;
      const h = 5;
      const x = cx - w / 2;
      const y = topY;
      this.painter.fillRect(x - 1, y - 1, w + 2, h + 2, rgba(0, 0, 0, 153));
      this.painter.fillRect(x, y, w, h, rgba(0, 0, 0));
      const col = e.type === "spirit" ? rgba(154, 127, 208) : rgba(217, 83, 79);
      this.painter.fillRect(x, y, w * Math.max(0, e.hp) / e.maxHp, h, col);
    }
    drawHpBar(G) {
      const x = 10;
      const y = 30;
      const w = 160;
      const h = 14;
      this.painter.fillRect(x - 2, y - 2, w + 4, h + 4, rgba(14, 11, 22, 160));
      this.painter.fillRect(x, y, w, h, rgba(40, 30, 30));
      const pct = Math.max(0, G.player.hp) / G.player.maxHp;
      this.painter.fillRect(x, y, w * pct, h, rgba(210, 80, 80));
      this.text(`HP ${Math.max(0, G.player.hp)} / ${G.player.maxHp}`, x + w + 8, y + 7, 14, rgba(244, 236, 216), "left", "middle");
    }
    drawWeaponHud() {
      const G = this.core;
      const order = GameData.weaponOrder;
      const y = VIEW_H2 - 22;
      this.painter.fillRect(8, y - 6, 300, 30, rgba(14, 11, 22, 153));
      let x = 16;
      order.forEach((id) => {
        const cur = id === G.weapon;
        const ready = !(cur && G.attackCD > 0);
        const label = GameData.weapons[id].label;
        const col = cur ? ready ? rgba(255, 215, 102) : rgba(156, 139, 79) : rgba(207, 198, 184);
        this.text(label, x, y + 8, 13, col, "left", "middle");
        if (cur)
          this.painter.fillRect(x, y + 18, label.length * 13, 2, ready ? rgba(255, 215, 102) : rgba(156, 139, 79));
        x += label.length * 13 + 18;
      });
    }
    drawDialogue() {
      const line = this.core.currentLine();
      if (!this.core.dialogueActive() || !line)
        return;
      const boxX = 24;
      const boxY = VIEW_H2 - 128;
      const boxW = VIEW_W2 - 48;
      const boxH = 104;
      this.painter.fillRect(boxX, boxY, boxW, boxH, rgba(14, 11, 22, 224));
      this.painter.fillRect(boxX, boxY, boxW, 3, rgba(224, 178, 80));
      if (line.name)
        this.text(line.name, boxX + 16, boxY + 12, 15, rgba(255, 215, 102));
      this.textBlock(line.text, boxX + 16, boxY + (line.name ? 38 : 20), 17, rgba(244, 236, 216), boxW - 32);
    }
    drawQuestLog() {
      if (!this.core.questLogOpen)
        return;
      const list = this.core.questList();
      const lines = list.map((q) => {
        const status = q.state === "done" ? "[\u5DF2\u5B8C\u6210]" : q.state === "active" ? `[\u8FDB\u884C\u4E2D ${q.progress || ""}]` : "[\u672A\u89E3\u9501]";
        return `${status} ${q.title}
    ${q.state !== "locked" ? q.desc : ""}`;
      });
      const w = 440;
      const h = 220;
      const x = (VIEW_W2 - w) / 2;
      const y = (VIEW_H2 - h) / 2;
      this.painter.fillRect(x, y, w, h, rgba(14, 11, 22, 230));
      this.painter.fillRect(x, y, w, 3, rgba(224, 178, 80));
      this.textBlock(`\u4EFB\u52A1\u65E5\u5FD7\uFF08\u6309 Q \u5173\u95ED\uFF09

${lines.join("\n")}`, x + 16, y + 14, 15, rgba(244, 236, 216), w - 32);
    }
    drawToast() {
      const y = 92;
      this.ctx.font = "16px sans-serif";
      const w = Math.min(560, this.ctx.measureText(this.toastMsg).width + 28);
      this.painter.fillRect((VIEW_W2 - w) / 2, y - 16, w, 30, rgba(14, 11, 22, 200));
      this.text(this.toastMsg, VIEW_W2 / 2, y, 16, rgba(255, 244, 214), "center", "middle");
    }
    drawEnd() {
      this.painter.fillRect(0, 0, VIEW_W2, VIEW_H2, rgba(8, 10, 18, 210));
      this.textBlock(this.endText, VIEW_W2 / 2, 150, 18, rgba(244, 236, 216), 600, "center");
    }
    /* ---------------- 触摸虚拟控件 ---------------- */
    joyBase() {
      return { x: 40, y: VIEW_H2 - 150, w: 110, h: 110 };
    }
    atkBtn() {
      return { x: VIEW_W2 - 130, y: VIEW_H2 - 130, w: 90, h: 90 };
    }
    wBtns() {
      return [0, 1, 2].map((i) => ({ x: VIEW_W2 - 60, y: 60 + i * 58, w: 46, h: 46 }));
    }
    logBtn() {
      return { x: VIEW_W2 - 60, y: 8, w: 46, h: 40 };
    }
    inBtn(b, x, y) {
      return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }
    drawTouchControls() {
      const p = this.painter;
      const jb = this.joyBase();
      const jcx = jb.x + jb.w / 2;
      const jcy = jb.y + jb.h / 2;
      p.strokeCircle(jcx, jcy, jb.w / 2, 3, rgba(255, 255, 255, 60));
      const kx = jcx + this.joyDX * 34;
      const ky = jcy + this.joyDY * 34;
      p.fillCircle(kx, ky, 24, rgba(255, 255, 255, 80));
      const ab = this.atkBtn();
      p.fillCircle(ab.x + ab.w / 2, ab.y + ab.h / 2, ab.w / 2, rgba(220, 90, 80, 110));
      this.text("\u653B\u51FB", ab.x + ab.w / 2, ab.y + ab.h / 2, 16, rgba(255, 255, 255, 230), "center", "middle");
      const order = GameData.weaponOrder;
      this.wBtns().forEach((b, i) => {
        const cur = order[i] === this.core.weapon;
        p.fillRect(b.x, b.y, b.w, b.h, cur ? rgba(224, 178, 80, 150) : rgba(20, 18, 30, 130));
        this.text(`${i + 1}`, b.x + b.w / 2, b.y + b.h / 2, 18, rgba(255, 255, 255, 230), "center", "middle");
      });
      const lb = this.logBtn();
      p.fillRect(lb.x, lb.y, lb.w, lb.h, rgba(20, 18, 30, 130));
      this.text("\u65E5\u5FD7", lb.x + lb.w / 2, lb.y + lb.h / 2, 13, rgba(255, 255, 255, 220), "center", "middle");
    }
    /* ---------------- 输入：键盘 ---------------- */
    keyDown(key) {
      const c = this.core;
      switch (key) {
        case "ArrowLeft":
        case "a":
        case "A":
          c.setMove("left", true);
          return;
        case "ArrowRight":
        case "d":
        case "D":
          c.setMove("right", true);
          return;
        case "ArrowUp":
        case "w":
        case "W":
          c.setMove("up", true);
          return;
        case "ArrowDown":
        case "s":
        case "S":
          c.setMove("down", true);
          return;
        case "j":
        case "J":
        case " ":
        case "Enter":
          this.pressAttackOrConfirm();
          return;
        case "1":
          c.setWeapon("sling");
          return;
        case "2":
          c.setWeapon("staff");
          return;
        case "3":
          c.setWeapon("harp");
          return;
        case "k":
        case "K":
          c.cycleWeapon();
          return;
        case "q":
        case "Q":
          c.toggleQuestLog();
          return;
        case "r":
        case "R":
          if (this.finished)
            this.start();
          return;
        default:
          break;
      }
    }
    keyUp(key) {
      const c = this.core;
      switch (key) {
        case "ArrowLeft":
        case "a":
        case "A":
          c.setMove("left", false);
          return;
        case "ArrowRight":
        case "d":
        case "D":
          c.setMove("right", false);
          return;
        case "ArrowUp":
        case "w":
        case "W":
          c.setMove("up", false);
          return;
        case "ArrowDown":
        case "s":
        case "S":
          c.setMove("down", false);
          return;
        case "j":
        case "J":
        case " ":
        case "Enter":
          c.setAttack(false);
          return;
        default:
          break;
      }
    }
    pressAttackOrConfirm() {
      const c = this.core;
      if (this.finished) {
        this.start();
        return;
      }
      if (c.dialogueActive()) {
        c.advanceDialogue();
        return;
      }
      if (c.enemy && c.running && !c.busy) {
        c.setAttack(true);
        return;
      }
      c.confirm();
    }
    /* ---------------- 输入：指针/触摸 ---------------- */
    pointerDown(id, x, y) {
      const c = this.core;
      if (this.finished) {
        this.start();
        return;
      }
      if (c.dialogueActive()) {
        c.advanceDialogue();
        return;
      }
      if (this.inBtn(this.logBtn(), x, y)) {
        c.toggleQuestLog();
        return;
      }
      const wb = this.wBtns();
      for (let i = 0; i < wb.length; i++) {
        if (this.inBtn(wb[i], x, y)) {
          c.setWeapon(GameData.weaponOrder[i]);
          return;
        }
      }
      if (this.inBtn(this.atkBtn(), x, y)) {
        this.atkId = id;
        if (c.enemy && c.running && !c.busy)
          c.setAttack(true);
        else
          c.confirm();
        return;
      }
      if (this.joyId === -1) {
        const jb = this.joyBase();
        this.joyId = id;
        this.joyCX = jb.x + jb.w / 2;
        this.joyCY = jb.y + jb.h / 2;
        this.pointerMove(id, x, y);
      }
    }
    pointerMove(id, x, y) {
      if (id !== this.joyId)
        return;
      const dx = x - this.joyCX;
      const dy = y - this.joyCY;
      const len = Math.hypot(dx, dy) || 1;
      this.joyDX = Math.max(-1, Math.min(1, dx / 40));
      this.joyDY = Math.max(-1, Math.min(1, dy / 40));
      const c = this.core;
      const th = 14;
      c.setMove("left", dx < -th);
      c.setMove("right", dx > th);
      c.setMove("up", dy < -th);
      c.setMove("down", dy > th);
    }
    pointerUp(id) {
      const c = this.core;
      if (id === this.joyId) {
        this.joyId = -1;
        this.joyDX = 0;
        this.joyDY = 0;
        c.setMove("left", false);
        c.setMove("right", false);
        c.setMove("up", false);
        c.setMove("down", false);
      }
      if (id === this.atkId) {
        this.atkId = -1;
        c.setAttack(false);
      }
    }
  };

  // assets/scripts/canvas/main.web.ts
  var canvas = document.getElementById("game");
  canvas.width = VIEW_W2;
  canvas.height = VIEW_H2;
  var ctx = canvas.getContext("2d");
  var game = new CanvasGame(ctx);
  game.start();
  var MOVE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
  window.addEventListener("keydown", (e) => {
    game.keyDown(e.key);
    if (MOVE_KEYS.indexOf(e.key) >= 0)
      e.preventDefault();
  });
  window.addEventListener("keyup", (e) => game.keyUp(e.key));
  function rel(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return [(clientX - r.left) * VIEW_W2 / r.width, (clientY - r.top) * VIEW_H2 / r.height];
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch")
      game.setTouchControls(true);
    const [x, y] = rel(e.clientX, e.clientY);
    game.pointerDown(e.pointerId, x, y);
  });
  canvas.addEventListener("pointermove", (e) => {
    const [x, y] = rel(e.clientX, e.clientY);
    game.pointerMove(e.pointerId, x, y);
  });
  window.addEventListener("pointerup", (e) => game.pointerUp(e.pointerId));
  function loop() {
    game.frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
