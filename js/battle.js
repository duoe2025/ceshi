/* ============================================================
 * battle.js — 回合制战斗
 * Battle.start(enemyKey, player, { onWin, onLose })
 * player 为共享对象 { hp, maxHp, atk }，战斗会原地修改其 hp。
 * ============================================================ */

const Battle = (() => {
  const el = (id) => document.getElementById(id);
  let ctx = null;

  const S = {
    active: false,
    busy: false,
    over: false,
    enemy: null,
    player: null,
    skills: [],
    sel: 0,
    guard: false,
    cb: null,
    hurtEnemy: 0,   // 受击闪烁计时（帧）
    hurtPlayer: 0,
    shake: 0,
  };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function start(enemyKey, player, cb) {
    const def = GameData.enemies[enemyKey];
    S.enemy = { key: enemyKey, name: def.name, type: def.type, hp: def.maxHp, maxHp: def.maxHp,
                atk: def.atk, attackName: def.attackName, sprite: def.sprite };
    S.player = player;
    S.skills = GameData.skills;
    S.sel = 0;
    S.guard = false;
    S.busy = false;
    S.over = false;
    S.active = true;
    S.cb = cb;
    S.hintShown = false;
    S.hurtEnemy = S.hurtPlayer = S.shake = 0;

    if (!ctx) ctx = el('battle-canvas').getContext('2d');
    el('battle').classList.remove('hidden');
    el('battle-log').innerHTML = '';
    log(`${S.enemy.name}挡住了去路！`);
    buildMenu();
    draw();
  }

  function log(msg) {
    const box = el('battle-log');
    const p = document.createElement('div');
    p.textContent = msg;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }

  function buildMenu() {
    const menu = el('battle-menu');
    menu.innerHTML = '';
    S.skills.forEach((sk, i) => {
      const btn = document.createElement('button');
      btn.className = 'battle-action' + (i === S.sel ? ' selected' : '');
      btn.innerHTML = `${sk.name}<small>${sk.desc}</small>`;
      btn.disabled = S.busy || S.over;
      btn.addEventListener('click', () => { if (!S.busy && !S.over) { S.sel = i; refreshMenu(); confirm(); } });
      menu.appendChild(btn);
    });
  }

  function refreshMenu() {
    const btns = el('battle-menu').querySelectorAll('.battle-action');
    btns.forEach((b, i) => {
      b.classList.toggle('selected', i === S.sel);
      b.disabled = S.busy || S.over;
    });
  }

  /* ---------- 输入（由 game.js 路由）---------- */
  function handleInput(action) {
    if (!S.active || S.busy || S.over) return;
    switch (action) {
      case 'left':  S.sel = (S.sel + S.skills.length - 1) % S.skills.length; refreshMenu(); break;
      case 'right': S.sel = (S.sel + 1) % S.skills.length; refreshMenu(); break;
      case 'up':    S.sel = (S.sel + 2) % S.skills.length; refreshMenu(); break;
      case 'down':  S.sel = (S.sel + 2) % S.skills.length; refreshMenu(); break;
      case 'confirm': confirm(); break;
    }
  }

  function confirm() {
    const sk = S.skills[S.sel];
    S.busy = true;
    refreshMenu();

    if (sk.kind === 'attack') {
      // 物理攻击（弹弓 / 杖杆）：对邪灵几乎无效
      if (Math.random() > sk.hit) {
        log(`大卫使用「${sk.name}」，可惜没有命中……`);
      } else if (S.enemy.type === 'spirit') {
        S.enemy.hp = Math.max(0, S.enemy.hp - 1);
        S.hurtEnemy = 10;
        log(`大卫使用「${sk.name}」，但邪灵虚无缥缈，物理攻击几乎无效（仅 1 点）！`);
        if (!S.hintShown) { log('试试「弹琴赞美」——赞美之声才能驱散邪灵。'); S.hintShown = true; }
      } else {
        const dmg = rand(sk.minDmg, sk.maxDmg);
        S.enemy.hp = Math.max(0, S.enemy.hp - dmg);
        S.hurtEnemy = 18; S.shake = 8;
        log(`大卫使用「${sk.name}」，命中！造成 ${dmg} 点伤害。`);
      }
    } else if (sk.kind === 'harp') {
      if (S.enemy.type === 'spirit') {
        const dmg = rand(sk.minDmg, sk.maxDmg);
        S.enemy.hp = Math.max(0, S.enemy.hp - dmg);
        S.hurtEnemy = 18; S.shake = 8;
        log(`大卫弹起竖琴向神歌唱赞美，圣洁的琴声灼伤邪灵，造成 ${dmg} 点伤害！`);
      } else {
        // 对野兽：安抚，降低其攻击并稍作鼓舞
        S.enemy.atk = Math.max(2, S.enemy.atk - 2);
        heal(2);
        log(`大卫弹琴安抚，${S.enemy.name}气势稍减（攻击力下降），自己也镇定了些（+2）。`);
      }
    } else if (sk.kind === 'guard') {
      S.guard = true;
      heal(sk.heal);
      log(`大卫摆出守势，下次受到的伤害减半，恢复 ${sk.heal} 点体力。`);
    } else if (sk.kind === 'heal') {
      heal(sk.heal);
      log(`大卫默默祷告，恢复了 ${sk.heal} 点体力。`);
    }

    setTimeout(() => {
      if (S.enemy.hp <= 0) { win(); return; }
      enemyTurn();
    }, 650);
  }

  function heal(amt) {
    S.player.hp = Math.min(S.player.maxHp, S.player.hp + amt);
    UI.setHp(S.player.hp, S.player.maxHp);
  }

  function enemyTurn() {
    let dmg = rand(S.enemy.atk - 2, S.enemy.atk + 2);
    if (S.guard) { dmg = Math.ceil(dmg / 2); S.guard = false; }
    S.player.hp = Math.max(0, S.player.hp - dmg);
    UI.setHp(S.player.hp, S.player.maxHp);
    S.hurtPlayer = 18; S.shake = 8;
    log(`${S.enemy.name}挥出「${S.enemy.attackName}」，造成 ${dmg} 点伤害。`);

    setTimeout(() => {
      if (S.player.hp <= 0) { lose(); return; }
      S.busy = false;
      refreshMenu();
    }, 650);
  }

  function win() {
    S.over = true;
    log(`${S.enemy.name}败退了！`);
    refreshMenu();
    setTimeout(() => finish(true), 900);
  }
  function lose() {
    S.over = true;
    log('大卫力竭倒下……');
    refreshMenu();
    setTimeout(() => finish(false), 900);
  }

  function finish(won) {
    S.active = false;
    el('battle').classList.add('hidden');
    const cb = S.cb; S.cb = null;
    if (cb) cb(won);
  }

  /* ---------- 渲染 ---------- */
  function draw() {
    if (!S.active) return;
    const W = 800, H = 380;
    const night = S.enemy.type === 'spirit';
    // 背景：白天草地 / 夜晚牧场
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (night) {
      sky.addColorStop(0, '#171430'); sky.addColorStop(0.55, '#23204a'); sky.addColorStop(1, '#2c3a30');
    } else {
      sky.addColorStop(0, '#bcd9e8'); sky.addColorStop(0.55, '#cfe6c9'); sky.addColorStop(1, '#7aa85c');
    }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = night ? '#2f4030' : '#6a9a4f'; ctx.fillRect(0, 250, W, H - 250);
    if (night) {
      // 月亮与星星
      ctx.fillStyle = '#e9e6c8'; ctx.beginPath(); ctx.arc(120, 70, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      [[300,50],[420,90],[520,40],[640,80],[700,140]].forEach(([sx, sy]) => ctx.fillRect(sx, sy, 2, 2));
    } else {
      // 远处山洞剪影
      ctx.fillStyle = '#5a6b4a';
      ctx.beginPath(); ctx.moveTo(600, 250); ctx.lineTo(680, 150); ctx.lineTo(760, 250); ctx.closePath(); ctx.fill();
    }

    const sh = () => (S.shake > 0 ? (Math.random() * 2 - 1) * S.shake : 0);

    // 大卫（左下）
    const dx = 110 + (S.hurtPlayer > 0 ? sh() : 0);
    const dy = 150 + (S.hurtPlayer > 0 ? sh() : 0);
    Sprites.david(ctx, dx, dy, 11, 'right', 0);

    // 敌人（右）：根据 sprite 选择绘制
    const lx = 470 + (S.hurtEnemy > 0 ? sh() : 0);
    const ly = 120 + (S.hurtEnemy > 0 ? sh() : 0);
    if (S.enemy.sprite === 'spirit') {
      Sprites.spirit(ctx, lx + 10, ly - 10, 14, S.hurtEnemy > 0);
    } else {
      Sprites.lion(ctx, lx, ly, 14, S.hurtEnemy > 0);
    }

    // 血条
    drawHpBar(60, 40, '大卫', S.player.hp, S.player.maxHp, '#4fae4f');
    drawHpBar(W - 280, 40, S.enemy.name, S.enemy.hp, S.enemy.maxHp, '#d9534f');

    if (S.hurtEnemy > 0) S.hurtEnemy--;
    if (S.hurtPlayer > 0) S.hurtPlayer--;
    if (S.shake > 0) S.shake--;
    requestAnimationFrame(draw);
  }

  function drawHpBar(x, y, name, hp, maxHp, color) {
    ctx.fillStyle = 'rgba(14,11,22,0.78)';
    ctx.fillRect(x - 8, y - 22, 232, 44);
    ctx.fillStyle = '#f4ecd8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(name, x, y - 4);
    ctx.fillStyle = '#000'; ctx.fillRect(x, y + 4, 216, 12);
    ctx.fillStyle = color; ctx.fillRect(x, y + 4, 216 * Math.max(0, hp) / maxHp, 12);
    ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 1; ctx.strokeRect(x, y + 4, 216, 12);
    ctx.fillStyle = '#f4ecd8'; ctx.font = '12px sans-serif';
    ctx.fillText(`${Math.max(0, hp)} / ${maxHp}`, x + 150, y + 14);
  }

  function isActive() { return S.active; }

  return { start, handleInput, isActive };
})();
