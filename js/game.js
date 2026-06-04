/* ============================================================
 * game.js — 主引擎：地图渲染、移动、ARPG 即时战斗、任务流程、输入
 * 战斗为实时制：在地图上攻击怪物，远程可边跑边打，打不过可拉开距离逃跑。
 * ============================================================ */

(() => {
  const { TILE, MAP_COLS, MAP_ROWS, SOLID_TILES } = GameData;
  const VIEW_W = 800, VIEW_H = 576;
  const MAP_W = MAP_COLS * TILE, MAP_H = MAP_ROWS * TILE;

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let map = GameData.buildMap();

  /* ---------------- 游戏状态 ---------------- */
  const G = {
    running: false,
    phase: 'intro',          // intro / q1 / q1done / q2 / q3 / done
    player: { x: 0, y: 0, facing: 'down', hp: 20, maxHp: 20, atk: 5,
              moving: false, running: false, animTimer: 0, frame: 0 },
    keys: {},
    lostSheep: [],
    sheepCollected: 0,
    lionActive: false,
    lionDefeated: false,
    spiritActive: false,
    spiritDefeated: false,
    busy: false,             // 对白/菜单期间暂停世界
    battles: 0,
    /* ---- 即时战斗 ---- */
    weapon: 'sling',         // 当前武器：sling / staff / harp
    attackCD: 0,             // 攻击冷却（帧）
    projectiles: [],         // 飞石 {x,y,vx,vy,life}
    effects: [],             // 视觉特效 {kind,x,y,life,max,...}
    enemy: null,             // 当前活体敌人
    hintShown: false,        // 是否已提示“物理打不动邪灵”
    shake: 0,                // 屏幕震动帧
    playerHurt: 0,           // 玩家受击闪烁帧
    playerAction: '',        // sling / staff / harp / pray
    playerActionTimer: 0,
    playerActionMax: 0,
    playerDownTimer: 0,      // 战败倒地动画帧
    playerDownMax: 0,
    idleTimer: 0, idleFrame: 0,   // 站立微动作
  };

  const SPEED = 2.4;

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function facingVec(f) {
    return f === 'left' ? { x: -1, y: 0 } : f === 'right' ? { x: 1, y: 0 }
         : f === 'up' ? { x: 0, y: -1 } : { x: 0, y: 1 };
  }

  function resetGame() {
    map = GameData.buildMap();
    const ps = GameData.playerStart;
    G.phase = 'intro';
    G.player.x = ps.c * TILE;
    G.player.y = ps.r * TILE;
    G.player.facing = 'down';
    G.player.hp = GameData.playerStats.maxHp;
    G.player.maxHp = GameData.playerStats.maxHp;
    G.player.atk = GameData.playerStats.atk;
    G.lostSheep = GameData.lostSheep.map(s => ({ ...s, taken: false }));
    G.sheepCollected = 0;
    G.lionActive = false;
    G.lionDefeated = false;
    G.spiritActive = false;
    G.spiritDefeated = false;
    G.battles = 0;
    G.weapon = 'sling';
    G.attackCD = 0;
    G.projectiles = [];
    G.effects = [];
    G.enemy = null;
    G.hintShown = false;
    G.shake = 0;
    G.playerHurt = 0;
    G.playerAction = '';
    G.playerActionTimer = 0;
    G.playerActionMax = 0;
    G.playerDownTimer = 0;
    G.playerDownMax = 0;
    G.idleTimer = 0; G.idleFrame = 0;
    G.player.running = false;
    G.keys = {};
    UI.setHp(G.player.hp, G.player.maxHp);
    updateObjective();
  }

  /* ---------------- 任务 ---------------- */
  function updateObjective() {
    let text = '—';
    switch (G.phase) {
      case 'intro': text = '去和父亲耶西谈谈'; break;
      case 'q1':    text = `找回走失的羊  ${G.sheepCollected}/3`; break;
      case 'q1done':text = '回去向父亲耶西复命'; break;
      case 'q2':    text = '前往东边山洞，击退猛狮（弹弓/杖杆）'; break;
      case 'q3':    text = '夜幕降临：用「弹琴赞美」(3) 驱走羊圈旁的邪灵'; break;
      case 'done':  text = '第一章完成！'; break;
    }
    UI.setObjective(text);
  }

  function questList() {
    const order = { intro: 0, q1: 1, q1done: 1, q2: 2, q3: 3, done: 4 };
    const p = order[G.phase];
    return [
      { title: '清晨的牧场', desc: '去和父亲耶西谈谈',
        state: p > 0 ? 'done' : 'active' },
      { title: '找回走失的羊', desc: '走近走失的羊，带它们回羊圈',
        state: p < 1 ? 'locked' : (G.sheepCollected >= 3 ? 'done' : 'active'),
        progress: `${G.sheepCollected}/3` },
      { title: '守护羊群·击退猛狮', desc: '实时战斗：弹弓远程、杖杆近战，可边跑边打',
        state: G.lionDefeated ? 'done' : (G.phase === 'q2' ? 'active' : 'locked') },
      { title: '夜半驱邪·弹琴赞美', desc: '邪灵免疫物理，唯有弹琴赞美能驱散它',
        state: G.spiritDefeated ? 'done' : (G.phase === 'q3' ? 'active' : 'locked') },
    ];
  }

  /* ---------------- 碰撞 ---------------- */
  // 脚部碰撞盒：在 32 格底部
  const HB = { ox: 7, oy: 16, w: 18, h: 14 };
  function solidAtPixel(px, py) {
    if (px < 0 || py < 0 || px >= MAP_W || py >= MAP_H) return true;
    const c = Math.floor(px / TILE), r = Math.floor(py / TILE);
    return SOLID_TILES.has(map[r][c]);
  }
  function blocked(x, y) {
    const l = x + HB.ox, t = y + HB.oy, rr = x + HB.ox + HB.w - 1, b = y + HB.oy + HB.h - 1;
    return solidAtPixel(l, t) || solidAtPixel(rr, t) || solidAtPixel(l, b) || solidAtPixel(rr, b);
  }

  /* ---------------- 移动 ---------------- */
  function updatePlayer() {
    let dx = 0, dy = 0;
    if (G.keys['left']) dx -= 1;
    if (G.keys['right']) dx += 1;
    if (G.keys['up']) dy -= 1;
    if (G.keys['down']) dy += 1;

    G.player.moving = (dx !== 0 || dy !== 0);
    G.player.running = G.player.moving && !!G.keys['run'];
    if (G.player.moving && G.playerAction === 'pray') {
      G.playerAction = ''; G.playerActionTimer = 0;
    }
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    if (dx < 0) G.player.facing = 'left';
    else if (dx > 0) G.player.facing = 'right';
    else if (dy < 0) G.player.facing = 'up';
    else if (dy > 0) G.player.facing = 'down';

    // 分轴移动，可贴墙滑动；按住 Shift 奔跑加速
    const spd = G.player.running ? SPEED * 1.6 : SPEED;
    const nx = G.player.x + dx * spd;
    if (!blocked(nx, G.player.y)) G.player.x = nx;
    const ny = G.player.y + dy * spd;
    if (!blocked(G.player.x, ny)) G.player.y = ny;

    // 行走/奔跑动画；站立时走 idle 微动作（缺图都会回退）
    if (G.player.moving) {
      G.idleTimer = 0; G.idleFrame = 0;
      G.player.animTimer++;
      const step = G.player.running ? 4 : 6;
      if (G.player.animTimer > step) {
        const wf = Assets.davidCols(G.player.running ? 'run' : 'walk');
        G.player.frame = (G.player.frame + 1) % wf;
        G.player.animTimer = 0;
      }
    } else {
      G.player.frame = 0;
      G.idleTimer++;
      if (G.idleTimer > 12) {
        const idf = Assets.davidCols('idle');
        G.idleFrame = (G.idleFrame + 1) % idf;
        G.idleTimer = 0;
      }
    }

    checkSheepPickup();
  }

  function playerCenter() {
    return { x: G.player.x + TILE / 2, y: G.player.y + TILE / 2 };
  }
  function enemyCenter(e) { return { x: e.x + TILE / 2, y: e.y + TILE / 2 }; }
  function tileCenter(c, r) { return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* ---------------- 羊：触碰拾取 ---------------- */
  function checkSheepPickup() {
    if (G.phase !== 'q1') return;
    const pc = playerCenter();
    for (const s of G.lostSheep) {
      if (s.taken) continue;
      if (dist(pc, tileCenter(s.c, s.r)) < 30) {
        s.taken = true;
        G.sheepCollected++;
        UI.toast(`找到一只羊！(${G.sheepCollected}/3)`);
        updateObjective();
        if (G.sheepCollected >= 3) {
          G.phase = 'q1done';
          updateObjective();
          G.busy = true;
          UI.showDialogue(GameData.dialogue.sheepFound, () => {
            UI.toast('三只羊都找回来了，回去找父亲');
            G.busy = false;
          });
        }
        break;
      }
    }
  }

  /* ---------------- 互动（空格/回车）：仅与父亲耶西对话 ---------------- */
  function interact() {
    const pc = playerCenter();
    const jesse = GameData.npcs[0];
    if (dist(pc, tileCenter(jesse.c, jesse.r)) < 52) talkToJesse();
  }

  function talkToJesse() {
    G.busy = true;
    if (G.phase === 'intro') {
      UI.showDialogue(GameData.dialogue.jesseQuest1, () => {
        G.phase = 'q1';
        updateObjective();
        UI.toast('新任务：找回走失的羊');
        G.busy = false;
      });
    } else if (G.phase === 'q1') {
      UI.showDialogue(GameData.dialogue.jesseQuest1Progress, () => { G.busy = false; });
    } else if (G.phase === 'q1done') {
      UI.showDialogue(GameData.dialogue.jesseQuest1Done, () => {
        G.phase = 'q2';
        G.lionActive = true;
        spawnEnemy('lion');
        updateObjective();
        UI.toast('实时战斗：J/空格 攻击 · 1/2/3 切换武器 · 可边跑边打');
        G.busy = false;
      });
    } else if (G.phase === 'q2') {
      UI.showDialogue(GameData.dialogue.jesseQuest2, () => { G.busy = false; });
    } else {
      UI.showDialogue([{ name: '父亲耶西', text: '好孩子，今天辛苦你了。' }], () => { G.busy = false; });
    }
  }

  /* ---------------- 即时战斗 ---------------- */
  function spawnEnemy(key) {
    const def = GameData.enemies[key];
    const pos = key === 'lion' ? GameData.lion : GameData.spirit;
    G.enemy = {
      key, name: def.name, type: def.type, sprite: def.sprite,
      x: pos.c * TILE, y: pos.r * TILE,
      hp: def.maxHp, maxHp: def.maxHp, atk: def.atk, spd: def.spd,
      aggro: def.aggro, touchRange: def.touchRange, touchMax: def.touchCD,
      touchCD: 0, greeted: false, dead: false, hurt: 0,
    };
  }

  function setWeapon(id) {
    if (!G.running || G.busy) return;
    if (G.weapon === id) return;
    G.weapon = id;
    UI.toast(`武器：${GameData.weapons[id].name} — ${GameData.weapons[id].hint}`, 1100);
  }
  function cycleWeapon() {
    const order = GameData.weaponOrder;
    const i = order.indexOf(G.weapon);
    setWeapon(order[(i + 1) % order.length]);
  }

  // 祈祷 emote（闭目双手合十）：非战斗状态下按 P 触发
  function startPray() {
    if (!G.running || G.busy || G.enemy) return;
    if (UI.dialogueActive() || UI.questLogOpen()) return;
    if (G.playerDownTimer > 0 || G.playerHurt > 0) return;
    G.playerAction = 'pray';
    G.playerActionMax = 60;
    G.playerActionTimer = 60;
    UI.toast('大卫闭目祈祷……', 1000);
  }

  function tryAttack() {
    if (!G.enemy || G.busy) return;
    if (G.attackCD > 0) return;
    const wpn = GameData.weapons[G.weapon];
    G.attackCD = wpn.cd;
    G.playerAction = G.weapon;
    G.playerActionMax = G.weapon === 'harp' ? 24 : 12;
    G.playerActionTimer = G.playerActionMax;
    const pc = playerCenter();
    const dir = facingVec(G.player.facing);

    if (G.weapon === 'sling') {
      G.projectiles.push({
        x: pc.x, y: pc.y, vx: dir.x * wpn.projSpeed, vy: dir.y * wpn.projSpeed, life: wpn.projLife,
      });
    } else if (G.weapon === 'staff') {
      G.effects.push({ kind: 'slash', x: pc.x + dir.x * 22, y: pc.y + dir.y * 22,
                       facing: G.player.facing, life: 10, max: 10 });
      const e = G.enemy;
      if (e && !e.dead && dist(pc, enemyCenter(e)) < wpn.reach) damageEnemy(wpn);
    } else if (G.weapon === 'harp') {
      G.effects.push({ kind: 'wave', x: pc.x, y: pc.y, life: 28, max: 28, radius: wpn.radius });
      const e = G.enemy;
      if (e && !e.dead && dist(pc, enemyCenter(e)) < wpn.radius) damageEnemy(wpn);
    }
  }

  function damageEnemy(wpn) {
    const e = G.enemy;
    if (!e || e.dead) return;
    if (e.type === 'spirit') {
      if (wpn.kind === 'harp') {
        const dmg = rand(wpn.minDmg, wpn.maxDmg);
        e.hp = Math.max(0, e.hp - dmg); e.hurt = 12; G.shake = 6;
        UI.toast(`圣洁琴声驱邪！-${dmg}`, 900);
      } else {
        e.hp = Math.max(0, e.hp - 1); e.hurt = 6;
        if (!G.hintShown) {
          UI.toast('物理攻击对邪灵几乎无效！改用「弹琴赞美」(按 3)', 2200);
          G.hintShown = true;
        }
      }
    } else { // beast
      if (wpn.kind === 'harp') {
        e.atk = Math.max(2, e.atk - 1);
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
        UI.setHp(G.player.hp, G.player.maxHp);
        UI.toast('弹琴安抚，猛狮气势稍减', 900);
      } else {
        const dmg = rand(wpn.minDmg, wpn.maxDmg);
        e.hp = Math.max(0, e.hp - dmg); e.hurt = 12; G.shake = 6;
      }
    }
    if (e.hp <= 0 && !e.dead) { e.dead = true; onEnemyDefeated(e.key); }
  }

  function hitPlayer() {
    const e = G.enemy;
    const dmg = rand(Math.max(1, e.atk - 1), e.atk + 2);
    G.player.hp = Math.max(0, G.player.hp - dmg);
    UI.setHp(G.player.hp, G.player.maxHp);
    G.shake = 6; G.playerHurt = 12;
    G.playerAction = ''; G.playerActionTimer = 0; G.playerActionMax = 0;
    if (G.player.hp <= 0) playerDown();
  }

  function onEnemyDefeated(key) {
    G.enemy = null;
    G.projectiles = [];
    G.effects = [];
    G.busy = true;
    if (key === 'lion') {
      G.lionDefeated = true; G.lionActive = false;
      UI.showDialogue(GameData.dialogue.lionDefeated, () => {
        UI.showDialogue(GameData.dialogue.nightFall, () => {
          G.phase = 'q3';
          G.player.x = 9 * TILE; G.player.y = 23 * TILE; G.player.facing = 'up';
          spawnEnemy('spirit');
          G.spiritActive = true;
          G.weapon = 'harp';
          updateObjective();
          UI.toast('夜战！用「弹琴赞美」(3) 驱散邪灵', 2200);
          G.busy = false;
        });
      });
    } else { // spirit
      G.spiritDefeated = true; G.spiritActive = false;
      UI.showDialogue(GameData.dialogue.spiritDefeated, () => {
        G.phase = 'done';
        updateObjective();
        finishChapter();
      });
    }
  }

  // 被击倒：先播放倒地动画，再进入复活/退守流程
  function playerDown() {
    G.busy = true;
    G.projectiles = []; G.effects = [];
    G.playerHurt = 0;
    G.playerAction = ''; G.playerActionTimer = 0; G.playerActionMax = 0;
    G.playerDownMax = 78;
    G.playerDownTimer = 78;
  }

  function playerDownResolve() {
    G.player.hp = G.player.maxHp;
    UI.setHp(G.player.hp, G.player.maxHp);
    const e = G.enemy;
    if (e) {
      const def = GameData.enemies[e.key];
      const pos = e.key === 'lion' ? GameData.lion : GameData.spirit;
      e.hp = e.maxHp; e.atk = def.atk; e.x = pos.c * TILE; e.y = pos.r * TILE;
      e.touchCD = 0; e.dead = false; e.greeted = true; e.hurt = 0;
    }
    G.playerAction = ''; G.playerActionTimer = 0; G.playerActionMax = 0;
    let line;
    if (G.phase === 'q3') {
      G.player.x = 9 * TILE; G.player.y = 23 * TILE; G.player.facing = 'up';
      line = [{ name: '旁白', text: '邪灵的阴影压得大卫几乎窒息……稳住心神，再弹起竖琴!' }];
    } else {
      // 退到山洞西侧的小路上，与猛狮拉开距离再战
      G.player.x = 26 * TILE; G.player.y = 22 * TILE; G.player.facing = 'right';
      line = [{ name: '旁白', text: '大卫被猛狮扑退……他退到路上，深吸一口气，握紧投石索再来一次!' }];
    }
    UI.showDialogue(line, () => { G.busy = false; });
  }

  function updateProjectiles() {
    const e = G.enemy;
    const sling = GameData.weapons.sling;
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const p = G.projectiles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      let remove = false;
      if (p.life <= 0 || solidAtPixel(p.x, p.y)) {
        remove = true;
      } else if (e && !e.dead && dist(p, enemyCenter(e)) < sling.hitR) {
        damageEnemy(sling);
        G.effects.push({ kind: 'hit', x: p.x, y: p.y, life: 8, max: 8 });
        remove = true;
      }
      if (remove) G.projectiles.splice(i, 1);
    }
  }

  function updateEnemy() {
    const e = G.enemy;
    if (!e || e.dead) return;
    const pc = playerCenter();
    const ec = enemyCenter(e);
    const d = dist(pc, ec);

    // 首次接近 → 触发登场对白
    if (!e.greeted && d < 175) {
      e.greeted = true;
      G.busy = true;
      const lines = e.key === 'lion' ? GameData.dialogue.lionApproach
                                      : GameData.dialogue.spiritApproach;
      UI.showDialogue(lines, () => { G.busy = false; });
      return;
    }
    if (!e.greeted) return;

    // 追逐（在仇恨范围内）
    if (d < e.aggro && d > 1) {
      const vx = (pc.x - ec.x) / d, vy = (pc.y - ec.y) / d;
      e.x += vx * e.spd; e.y += vy * e.spd;
      // 限制在地图内
      e.x = Math.max(TILE, Math.min(e.x, MAP_W - TILE * 2));
      e.y = Math.max(TILE, Math.min(e.y, MAP_H - TILE * 2));
    }

    // 接触造成伤害
    if (e.touchCD > 0) e.touchCD--;
    if (d < e.touchRange && e.touchCD <= 0) {
      hitPlayer();
      e.touchCD = e.touchMax;
    }
  }

  function updateEffects() {
    for (let i = G.effects.length - 1; i >= 0; i--) {
      if (--G.effects[i].life <= 0) G.effects.splice(i, 1);
    }
  }

  function updateCombat() {
    if (G.attackCD > 0) G.attackCD--;
    if (G.keys['attack']) tryAttack();
    updateProjectiles();
    updateEnemy();
    updateEffects();
    if (G.shake > 0) G.shake--;
    if (G.playerHurt > 0) G.playerHurt--;
    if (G.playerActionTimer > 0) G.playerActionTimer--;
    else G.playerAction = '';
  }

  function finishChapter() {
    G.running = false;
    document.getElementById('end-stats').innerHTML =
      `找回走失的羊：3/3<br>` +
      `弹弓·杖杆 即时击退猛狮 ✓<br>` +
      `弹琴赞美 驱散邪灵 ✓<br>` +
      `剩余体力：${G.player.hp}/${G.player.maxHp}`;
    document.getElementById('end-screen').classList.remove('hidden');
  }

  /* ---------------- 渲染 ---------------- */
  function camera() {
    let camX = G.player.x + TILE / 2 - VIEW_W / 2;
    let camY = G.player.y + TILE / 2 - VIEW_H / 2;
    camX = Math.max(0, Math.min(camX, MAP_W - VIEW_W));
    camY = Math.max(0, Math.min(camY, MAP_H - VIEW_H));
    return { camX: Math.round(camX), camY: Math.round(camY) };
  }

  function render() {
    let { camX, camY } = camera();
    if (G.shake > 0) {
      camX += Math.round((Math.random() * 2 - 1) * 3);
      camY += Math.round((Math.random() * 2 - 1) * 3);
    }
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    const c0 = Math.floor(camX / TILE), r0 = Math.floor(camY / TILE);
    const c1 = Math.min(MAP_COLS - 1, c0 + Math.ceil(VIEW_W / TILE) + 1);
    const r1 = Math.min(MAP_ROWS - 1, r0 + Math.ceil(VIEW_H / TILE) + 1);
    for (let r = Math.max(0, r0); r <= r1; r++) {
      for (let c = Math.max(0, c0); c <= c1; c++) {
        const sx = c * TILE - camX, sy = r * TILE - camY;
        // 有图集就用图片，缺图片回退到程序化绘制
        if (!Assets.drawTile(ctx, map[r][c], sx, sy)) Sprites.tile(ctx, map[r][c], sx, sy);
      }
    }

    // 圈中装饰羊
    GameData.foldSheep.forEach(s => {
      Sprites.sheep(ctx, s.c * TILE - camX, s.r * TILE - camY + 4, 2);
    });

    // 走失的羊
    G.lostSheep.forEach(s => {
      if (!s.taken) Sprites.sheep(ctx, s.c * TILE - camX, s.r * TILE - camY + 4, 2);
    });

    // 跟随大卫的羊（已收集）
    drawFollowers(camX, camY);

    // 父亲耶西
    const jesse = GameData.npcs[0];
    Sprites.jesse(ctx, jesse.c * TILE - camX, jesse.r * TILE - camY, 2);
    drawNameTag(jesse.name, jesse.c * TILE - camX + 16, jesse.r * TILE - camY - 4);

    // 互动提示气泡（仅父亲）
    drawInteractHints(camX, camY);

    // 飞石
    G.projectiles.forEach(p => drawProjectile(p.x - camX, p.y - camY));

    // 活体敌人
    if (G.enemy) {
      const e = G.enemy;
      const sx = e.x - camX, sy = e.y - camY;
      if (e.sprite === 'spirit') {
        const bob = Math.sin(Date.now() / 280) * 3;
        Sprites.spirit(ctx, sx - 6, sy - 10 + bob, 2.6, e.hurt > 0);
      } else {
        Sprites.lion(ctx, sx - 8, sy - 8, 3, e.hurt > 0);
      }
      drawNameTag(e.name, sx + 16, sy - 14, e.type === 'spirit' ? '#9a7fd0' : '#d9534f');
      drawEnemyHpBar(sx + 16, sy - 28, e);
      if (e.hurt > 0) e.hurt--;
    }

    // 攻击特效（覆盖在角色上方）
    drawEffects(camX, camY);

    // 大卫
    if (G.playerHurt > 0 && Math.floor(G.playerHurt / 3) % 2 === 0) ctx.globalAlpha = 0.45;
    {
      const px = G.player.x - camX, py = G.player.y - camY;
      let action = 'walk', frame = G.player.frame;
      if (G.playerDownTimer > 0) {
        // 被击倒：倒地动画，最后一帧停在地上
        action = 'down';
        const cols = Assets.davidCols('down');
        const prog = 1 - G.playerDownTimer / Math.max(1, G.playerDownMax);
        frame = Math.min(cols - 1, Math.floor(prog * cols));
      } else if (G.playerHurt > 0) {
        action = 'hurt';
        frame = Math.floor(G.playerHurt / 4) & 1;
      } else if (G.playerActionTimer > 0 && G.playerAction) {
        action = G.playerAction;
        const cols = Assets.davidCols(action);
        const max = Math.max(1, G.playerActionMax);
        frame = Math.min(cols - 1, Math.floor((1 - G.playerActionTimer / max) * cols));
      } else if (G.player.moving) {
        action = G.player.running ? 'run' : 'walk';
        frame = G.player.frame;
      } else {
        action = 'idle';
        frame = G.idleFrame;
      }
      if (!Assets.drawDavid(ctx, px, py, G.player.facing, frame, action))
        Sprites.david(ctx, px, py, 2, G.player.facing, G.player.frame & 1);
    }
    ctx.globalAlpha = 1;

    // 夜幕（任务三期间）
    if (G.phase === 'q3' && !G.spiritDefeated) {
      ctx.fillStyle = 'rgba(14,16,46,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // 武器栏（战斗中显示）
    if (G.enemy || G.phase === 'q2' || G.phase === 'q3') drawWeaponHud();
  }

  function drawProjectile(x, y) {
    ctx.fillStyle = '#cfcabb';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9b9684';
    ctx.beginPath(); ctx.arc(x + 1, y + 1, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawEffects(camX, camY) {
    G.effects.forEach(fx => {
      const x = fx.x - camX, y = fx.y - camY;
      const t = fx.life / fx.max;
      if (fx.kind === 'slash') {
        ctx.save();
        ctx.globalAlpha = t;
        ctx.strokeStyle = '#fff7e0';
        ctx.lineWidth = 4;
        const a0 = fx.facing === 'left' ? Math.PI * 0.6 : fx.facing === 'right' ? -Math.PI * 0.4
                 : fx.facing === 'up' ? Math.PI * 1.1 : Math.PI * 0.1;
        ctx.beginPath();
        ctx.arc(x, y, 26, a0, a0 + Math.PI * 0.8);
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'wave') {
        ctx.save();
        const rr = (1 - t) * fx.radius;
        ctx.globalAlpha = Math.max(0, t * 0.9);
        ctx.strokeStyle = '#ffe27a';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff6cf';
        ctx.beginPath(); ctx.arc(x, y, rr * 0.6, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'hit') {
        ctx.save();
        ctx.globalAlpha = t;
        ctx.fillStyle = '#fff2c0';
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + (1 - t);
          ctx.fillRect(x + Math.cos(a) * 8 - 1, y + Math.sin(a) * 8 - 1, 3, 3);
        }
        ctx.restore();
      }
    });
  }

  function drawFollowers(camX, camY) {
    for (let i = 0; i < G.sheepCollected && i < 3; i++) {
      const fx = G.player.x - camX + (i - 1) * 10;
      const fy = G.player.y - camY + 18 + i * 4;
      if (G.phase === 'q1' || G.phase === 'q1done') {
        ctx.globalAlpha = 0.85;
        Sprites.sheep(ctx, fx, fy, 1.4);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawNameTag(text, cx, cy, color) {
    ctx.font = '11px sans-serif';
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = 'rgba(14,11,22,0.7)';
    ctx.fillRect(cx - w / 2, cy - 12, w, 14);
    ctx.fillStyle = color || '#f4ecd8';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, cy - 1);
    ctx.textAlign = 'left';
  }

  function drawEnemyHpBar(cx, topY, e) {
    const w = 46, h = 5, x = cx - w / 2, y = topY;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = e.type === 'spirit' ? '#9a7fd0' : '#d9534f';
    ctx.fillRect(x, y, w * Math.max(0, e.hp) / e.maxHp, h);
  }

  function drawWeaponHud() {
    const order = GameData.weaponOrder;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    const y = VIEW_H - 14;
    ctx.fillStyle = 'rgba(14,11,22,0.6)';
    ctx.fillRect(8, y - 18, 268, 26);
    let x = 16;
    order.forEach(id => {
      const cur = id === G.weapon;
      const ready = !(cur && G.attackCD > 0);
      ctx.fillStyle = cur ? (ready ? '#ffd766' : '#9c8b4f') : '#cfc6b8';
      const label = GameData.weapons[id].label;
      ctx.fillText(label, x, y);
      if (cur) {
        ctx.fillStyle = ready ? '#ffd766' : '#9c8b4f';
        ctx.fillRect(x, y + 3, ctx.measureText(label).width, 2);
      }
      x += ctx.measureText(label).width + 18;
    });
    ctx.textAlign = 'left';
  }

  function drawInteractHints(camX, camY) {
    if (G.busy) return;
    const pc = playerCenter();
    const jesse = GameData.npcs[0];
    if (dist(pc, tileCenter(jesse.c, jesse.r)) < 52) {
      const x = jesse.c * TILE - camX + 16;
      const y = jesse.r * TILE - camY - 18;
      const bob = Math.sin(Date.now() / 200) * 2;
      ctx.fillStyle = '#e0b250';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('空格 ▼', x, y + bob);
      ctx.textAlign = 'left';
    }
  }

  /* ---------------- 主循环 ---------------- */
  function loop() {
    if (G.running) {
      if (G.playerDownTimer > 0) {
        G.playerDownTimer--;
        if (G.playerDownTimer === 0) playerDownResolve();
      }
      if (!G.busy && !UI.dialogueActive() && !UI.questLogOpen()) {
        updatePlayer();
        updateCombat();
      }
      render();
    }
    requestAnimationFrame(loop);
  }

  /* ---------------- 输入 ---------------- */
  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    A: 'left', D: 'right', W: 'up', S: 'down',
  };
  const ATTACK_KEYS = [' ', 'j', 'J', 'f', 'F'];

  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(k)) e.preventDefault();

    // 对白推进（空格/回车）
    if (k === ' ' || k === 'Enter') {
      if (UI.dialogueActive()) { UI.advanceDialogue(); return; }
    }

    // 攻击 / 互动（空格、J、F）
    if (ATTACK_KEYS.includes(k) || k === 'Enter') {
      if (G.running && !G.busy && !UI.questLogOpen() && !UI.dialogueActive()) {
        if (G.enemy) {
          G.keys['attack'] = true;     // 按住可连续攻击（边跑边打）
        } else if (k === ' ' || k === 'Enter') {
          interact();
        }
      }
      return;
    }

    // 切换武器
    if (k === '1') { setWeapon('sling'); return; }
    if (k === '2') { setWeapon('staff'); return; }
    if (k === '3') { setWeapon('harp'); return; }
    if (k === 'k' || k === 'K') { cycleWeapon(); return; }

    // 祈祷
    if (k === 'p' || k === 'P') { startPray(); return; }

    // 奔跑（按住 Shift）
    if (k === 'Shift') { G.keys['run'] = true; return; }

    // 任务日志
    if (k === 'q' || k === 'Q') {
      if (G.running && !UI.dialogueActive()) UI.toggleQuestLog(questList());
      return;
    }

    // 移动键
    if (KEYMAP[k]) G.keys[KEYMAP[k]] = true;
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (ATTACK_KEYS.includes(k) || k === 'Enter') G.keys['attack'] = false;
    if (k === 'Shift') G.keys['run'] = false;
    const m = KEYMAP[k];
    if (m) G.keys[m] = false;
  });

  /* ---------------- 开始 / 重开 ---------------- */
  function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    resetGame();
    G.running = true;
    G.busy = true;
    UI.showDialogue(GameData.dialogue.intro, () => {
      UI.toast('用方向键 / WASD 走到父亲身边，按空格交谈');
      G.busy = false;
    });
  }

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  UI.initDialogue();
  Assets.load();            // 异步加载图片素材；缺图片时自动回退到程序化绘制
  requestAnimationFrame(loop);
})();
