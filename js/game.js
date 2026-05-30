/* ============================================================
 * game.js — 主引擎：地图渲染、移动、互动、任务流程、输入路由
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
              moving: false, animTimer: 0, frame: 0 },
    keys: {},
    lostSheep: [],
    sheepCollected: 0,
    lionActive: false,
    lionDefeated: false,
    spiritActive: false,
    spiritDefeated: false,
    busy: false,             // 对白/战斗/菜单期间暂停世界
    battles: 0,
  };

  const SPEED = 2.4;

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
      case 'q2':    text = '前往东边山洞，击退猛狮'; break;
      case 'q3':    text = '夜幕降临：用「弹琴赞美」驱走羊圈旁的邪灵'; break;
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
      { title: '守护羊群·击退猛狮', desc: '用弹弓与杖杆击退猛狮',
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
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    if (dx < 0) G.player.facing = 'left';
    else if (dx > 0) G.player.facing = 'right';
    else if (dy < 0) G.player.facing = 'up';
    else if (dy > 0) G.player.facing = 'down';

    // 分轴移动，可贴墙滑动
    const nx = G.player.x + dx * SPEED;
    if (!blocked(nx, G.player.y)) G.player.x = nx;
    const ny = G.player.y + dy * SPEED;
    if (!blocked(G.player.x, ny)) G.player.y = ny;

    // 行走动画
    if (G.player.moving) {
      G.player.animTimer++;
      if (G.player.animTimer > 8) { G.player.frame ^= 1; G.player.animTimer = 0; }
    } else { G.player.frame = 0; }

    checkSheepPickup();
  }

  function playerCenter() {
    return { x: G.player.x + TILE / 2, y: G.player.y + TILE / 2 };
  }
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

  /* ---------------- 互动（空格/回车）---------------- */
  function interact() {
    const pc = playerCenter();

    // 父亲耶西
    const jesse = GameData.npcs[0];
    if (dist(pc, tileCenter(jesse.c, jesse.r)) < 52) {
      talkToJesse();
      return;
    }

    // 猛狮（任务二）
    if (G.lionActive && !G.lionDefeated) {
      const lion = GameData.lion;
      if (dist(pc, tileCenter(lion.c, lion.r)) < 60) {
        startLionBattle();
        return;
      }
    }

    // 邪灵（任务三）
    if (G.spiritActive && !G.spiritDefeated) {
      const sp = GameData.spirit;
      if (dist(pc, tileCenter(sp.c, sp.r)) < 64) {
        startSpiritBattle();
        return;
      }
    }
  }

  function talkToJesse() {
    G.busy = true;
    let lines;
    if (G.phase === 'intro') {
      lines = GameData.dialogue.jesseQuest1;
      UI.showDialogue(lines, () => {
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
        updateObjective();
        UI.toast('新任务：击退山洞的猛狮');
        G.busy = false;
      });
    } else if (G.phase === 'q2') {
      UI.showDialogue(GameData.dialogue.jesseQuest2, () => { G.busy = false; });
    } else {
      UI.showDialogue([{ name: '父亲耶西', text: '好孩子，今天辛苦你了。' }], () => { G.busy = false; });
    }
  }

  function startLionBattle() {
    G.busy = true;
    UI.showDialogue(GameData.dialogue.lionApproach, () => {
      G.battles++;
      Battle.start('lion', G.player, (won) => {
        UI.setHp(G.player.hp, G.player.maxHp);
        if (won) {
          G.lionDefeated = true;
          G.lionActive = false;
          // 猛狮退去 → 夜幕降临 → 邪灵来袭
          UI.showDialogue(GameData.dialogue.lionDefeated, () => {
            UI.showDialogue(GameData.dialogue.nightFall, () => {
              G.phase = 'q3';
              G.spiritActive = true;
              // 移到羊圈附近，夜战在此展开
              G.player.x = 9 * TILE; G.player.y = 23 * TILE;
              G.player.facing = 'up';
              updateObjective();
              UI.toast('新任务：用「弹琴赞美」驱走邪灵');
              G.busy = false;
            });
          });
        } else {
          // 失败：原地满血复活，可再战
          G.player.hp = G.player.maxHp;
          UI.setHp(G.player.hp, G.player.maxHp);
          const ps = GameData.playerStart;
          G.player.x = ps.c * TILE; G.player.y = ps.r * TILE;
          UI.showDialogue(
            [{ name: '旁白', text: '大卫被狮子扑退，退回了牧场。但羊群仍在危险中——再试一次！' }],
            () => { G.busy = false; });
        }
      });
    });
  }

  function startSpiritBattle() {
    G.busy = true;
    UI.showDialogue(GameData.dialogue.spiritApproach, () => {
      G.battles++;
      Battle.start('spirit', G.player, (won) => {
        UI.setHp(G.player.hp, G.player.maxHp);
        if (won) {
          G.spiritDefeated = true;
          G.spiritActive = false;
          UI.showDialogue(GameData.dialogue.spiritDefeated, () => {
            G.phase = 'done';
            updateObjective();
            finishChapter();
          });
        } else {
          G.player.hp = G.player.maxHp;
          UI.setHp(G.player.hp, G.player.maxHp);
          G.player.x = 9 * TILE; G.player.y = 23 * TILE;
          UI.showDialogue(
            [{ name: '旁白', text: '邪灵的阴影压得大卫喘不过气……稳住心神，弹起竖琴再试一次！' }],
            () => { G.busy = false; });
        }
      });
    });
  }

  function finishChapter() {
    G.running = false;
    document.getElementById('end-stats').innerHTML =
      `找回走失的羊：3/3<br>` +
      `弹弓·杖杆 击退猛狮 ✓<br>` +
      `弹琴赞美 驱散邪灵 ✓<br>` +
      `历经战斗：${G.battles} 场<br>剩余体力：${G.player.hp}/${G.player.maxHp}`;
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
    const { camX, camY } = camera();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    const c0 = Math.floor(camX / TILE), r0 = Math.floor(camY / TILE);
    const c1 = Math.min(MAP_COLS - 1, c0 + Math.ceil(VIEW_W / TILE) + 1);
    const r1 = Math.min(MAP_ROWS - 1, r0 + Math.ceil(VIEW_H / TILE) + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        Sprites.tile(ctx, map[r][c], c * TILE - camX, r * TILE - camY);
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

    // 跟随大卫的羊（已收集）—在大卫身后排成小队
    drawFollowers(camX, camY);

    // 父亲耶西
    const jesse = GameData.npcs[0];
    Sprites.jesse(ctx, jesse.c * TILE - camX, jesse.r * TILE - camY, 2);
    drawNameTag(jesse.name, jesse.c * TILE - camX + 16, jesse.r * TILE - camY - 4);

    // 互动提示气泡
    drawInteractHints(camX, camY);

    // 猛狮
    if (G.lionActive && !G.lionDefeated) {
      const lion = GameData.lion;
      Sprites.lion(ctx, lion.c * TILE - camX - 8, lion.r * TILE - camY - 8, 3);
      drawNameTag('猛狮', lion.c * TILE - camX + 16, lion.r * TILE - camY - 10, '#d9534f');
    }

    // 邪灵（任务三）
    if (G.spiritActive && !G.spiritDefeated) {
      const sp = GameData.spirit;
      const bob = Math.sin(Date.now() / 280) * 3;
      Sprites.spirit(ctx, sp.c * TILE - camX - 6, sp.r * TILE - camY - 10 + bob, 2.6, false);
      drawNameTag('邪灵', sp.c * TILE - camX + 16, sp.r * TILE - camY - 12, '#9a7fd0');
    }

    // 大卫
    Sprites.david(ctx, G.player.x - camX, G.player.y - camY, 2, G.player.facing, G.player.frame);

    // 夜幕（任务三期间）：整屏蓝黑色叠加，营造夜战氛围
    if (G.phase === 'q3' && !G.spiritDefeated) {
      ctx.fillStyle = 'rgba(14,16,46,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawFollowers(camX, camY) {
    // 已找回的羊跟在身后（简单地排在大卫下方）
    for (let i = 0; i < G.sheepCollected && i < 3; i++) {
      const fx = G.player.x - camX + (i - 1) * 10;
      const fy = G.player.y - camY + 18 + i * 4;
      // 仅在 q1done 阶段短暂展示跟随，避免遮挡；这里始终淡淡显示
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

  function drawInteractHints(camX, camY) {
    if (G.busy) return;
    const pc = playerCenter();
    const jesse = GameData.npcs[0];
    let target = null;
    if (dist(pc, tileCenter(jesse.c, jesse.r)) < 52) {
      target = { c: jesse.c, r: jesse.r };
    } else if (G.lionActive && !G.lionDefeated &&
               dist(pc, tileCenter(GameData.lion.c, GameData.lion.r)) < 60) {
      target = { c: GameData.lion.c, r: GameData.lion.r };
    } else if (G.spiritActive && !G.spiritDefeated &&
               dist(pc, tileCenter(GameData.spirit.c, GameData.spirit.r)) < 64) {
      target = { c: GameData.spirit.c, r: GameData.spirit.r };
    }
    if (target) {
      const x = target.c * TILE - camX + 16;
      const y = target.r * TILE - camY - 18;
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
      if (!G.busy && !Battle.isActive() && !UI.dialogueActive() && !UI.questLogOpen()) {
        updatePlayer();
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

  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(k)) e.preventDefault();

    // 确认 / 互动
    if (k === ' ' || k === 'Enter') {
      if (UI.dialogueActive()) { UI.advanceDialogue(); return; }
      if (Battle.isActive()) { Battle.handleInput('confirm'); return; }
      if (G.running && !G.busy && !UI.questLogOpen()) interact();
      return;
    }

    // 战斗中方向键选择
    if (Battle.isActive()) {
      if (KEYMAP[k]) Battle.handleInput(KEYMAP[k]);
      return;
    }

    // 任务日志
    if (k === 'q' || k === 'Q') {
      if (G.running && !UI.dialogueActive()) UI.toggleQuestLog(questList());
      return;
    }

    // 移动键按下
    if (KEYMAP[k]) G.keys[KEYMAP[k]] = true;
  });

  window.addEventListener('keyup', (e) => {
    const m = KEYMAP[e.key];
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
  requestAnimationFrame(loop);
})();
