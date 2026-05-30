/* ============================================================
 * coretest.ts — 引擎无关核心逻辑的无头自测（不依赖 Cocos）
 * 模拟一整章流程：交谈→找回3只羊→实时打猛狮→夜战弹琴驱邪灵→通关。
 * 运行： (cd tools && npx tsc && node out/tools/coretest.js)
 * ============================================================ */

import { GameCore } from '../assets/scripts/core/GameCore';
import {
  GameData, TILE, MAP_COLS, MAP_ROWS, SOLID_TILES,
} from '../assets/scripts/core/GameData';
import { FinishStats, IGameView } from '../assets/scripts/core/types';
import {
  defaultAttributes, derive, emptyEquipment, reduction, scoreItem, weaponDamage, xpToNext,
} from '../assets/scripts/core/Stats';
import { rollItem, rollLoot, RARITY_META } from '../assets/scripts/core/Items';

let finished: FinishStats | null = null;
const view: IGameView = {
  toast: () => {},
  onFinish: (s) => { finished = s; },
};

const core = new GameCore(view);
core.ambientEnabled = false; // 关闭游荡小怪，保证流程确定性
let assertions = 0;
let failures = 0;
function check(cond: boolean, msg: string): void {
  assertions++;
  if (!cond) { failures++; console.error('  ✗ FAIL:', msg); } else { console.log('  ✓', msg); }
}

/** 推进若干帧（带可选每帧回调，用于注入输入） */
function step(frames: number, fn?: (i: number) => void): void {
  for (let i = 0; i < frames; i++) { if (fn) fn(i); core.update(); }
}
/** 自动把所有排队对白点完 */
function clearDialogue(): void {
  let guard = 0;
  while (core.dialogueActive() && guard++ < 50) core.advanceDialogue();
}
function stopMove(): void {
  core.setMove('left', false); core.setMove('right', false);
  core.setMove('up', false); core.setMove('down', false);
}

/** 直线走向单个瓦片中心（短距离贪心 + 防卡死垂直脱困）。 */
function walkTo(cx: number, cy: number, maxFrames = 3000): boolean {
  const tx = cx * TILE + TILE / 2;
  const ty = cy * TILE + TILE / 2;
  let lastx = core.player.x;
  let lasty = core.player.y;
  let stuck = 0;
  let detour = 0;
  let detourDir: 'x' | 'y' = 'x';
  let detourSign = 1;
  for (let i = 0; i < maxFrames; i++) {
    if (core.dialogueActive() || core.busy) { core.update(); continue; }
    const pc = core.playerCenter();
    const ddx = tx - pc.x;
    const ddy = ty - pc.y;
    if (Math.hypot(ddx, ddy) < 16) { stopMove(); return true; }
    stopMove();
    if (detour > 0) {
      detour--;
      if (detourDir === 'x') core.setMove(detourSign < 0 ? 'left' : 'right', true);
      else core.setMove(detourSign < 0 ? 'up' : 'down', true);
    } else {
      core.setMove('left', ddx < -2); core.setMove('right', ddx > 2);
      core.setMove('up', ddy < -2); core.setMove('down', ddy > 2);
    }
    core.update();
    if (i % 12 === 11) {
      const moved = Math.hypot(core.player.x - lastx, core.player.y - lasty);
      lastx = core.player.x; lasty = core.player.y;
      if (moved < 5) {
        stuck++;
        detourDir = Math.abs(ddx) > Math.abs(ddy) ? 'y' : 'x';
        detourSign = (stuck % 2 === 0) ? 1 : -1;
        detour = 22;
      } else { stuck = 0; }
    }
  }
  stopMove();
  return false;
}

/** 在瓦片网格上 BFS 求可行走路径（四向，非实心瓦片）。 */
function bfsPath(sc: number, sr: number, tc: number, tr: number): Array<[number, number]> | null {
  const map = core.map;
  const walkable = (c: number, r: number): boolean =>
    c >= 0 && r >= 0 && c < MAP_COLS && r < MAP_ROWS && !SOLID_TILES.has(map[r][c]);
  if (!walkable(tc, tr)) {
    // 目标瓦片本身实心时退而取最近的可走邻格
    const adj: Array<[number, number]> = [[tc + 1, tr], [tc - 1, tr], [tc, tr + 1], [tc, tr - 1]];
    const alt = adj.find(([c, r]) => walkable(c, r));
    if (!alt) return null;
    [tc, tr] = alt;
  }
  const key = (c: number, r: number): number => r * MAP_COLS + c;
  const prev = new Map<number, number>();
  const q: Array<[number, number]> = [[sc, sr]];
  const seen = new Set<number>([key(sc, sr)]);
  while (q.length) {
    const [c, r] = q.shift() as [number, number];
    if (c === tc && r === tr) {
      const path: Array<[number, number]> = [];
      let k = key(c, r);
      while (k !== key(sc, sr)) {
        path.unshift([k % MAP_COLS, Math.floor(k / MAP_COLS)]);
        k = prev.get(k) as number;
      }
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const nc = c + dc;
      const nr = r + dr;
      if (walkable(nc, nr) && !seen.has(key(nc, nr))) {
        seen.add(key(nc, nr));
        prev.set(key(nc, nr), key(c, r));
        q.push([nc, nr]);
      }
    }
  }
  return null;
}

/** 用 BFS 找路并沿途逐格行走到目标瓦片。 */
function navTo(tc: number, tr: number): boolean {
  const sc = Math.floor(core.playerCenter().x / TILE);
  const sr = Math.floor(core.playerCenter().y / TILE);
  const path = bfsPath(sc, sr, tc, tr);
  if (!path) return false;
  // 路径抽稀：每隔几格设一个航点，最后精确到目标
  for (let i = 0; i < path.length; i++) {
    if (i % 3 === 0 || i === path.length - 1) {
      if (!walkTo(path[i][0], path[i][1])) { /* 继续尝试下一航点 */ }
    }
  }
  const fc = Math.floor(core.playerCenter().x / TILE);
  const fr = Math.floor(core.playerCenter().y / TILE);
  return Math.abs(fc - tc) <= 1 && Math.abs(fr - tr) <= 1;
}

console.log('\n=== 牧童大卫 第一章 · 核心逻辑无头自测 ===\n');

console.log('[0] 开局');
core.start();
check(core.running, '游戏已开始 running=true');
check(core.dialogueActive(), '开场旁白对白激活');
clearDialogue();
check(!core.dialogueActive() && !core.busy, '开场对白结束，恢复可操作');
check(core.phase === 'intro', 'phase=intro');

console.log('\n[1] 与父亲耶西对话接任务');
const j = GameData.npcs[0];
navTo(j.c, j.r);
core.confirm();
check(core.dialogueActive(), '触发父亲对白');
clearDialogue();
check(core.phase === 'q1', '接任务后 phase=q1');

console.log('\n[2] 找回三只走失的羊');
for (const s of GameData.lostSheep) {
  navTo(s.c, s.r);
  clearDialogue();
}
check(core.sheepCollected === 3, `已收集 3 只羊（实际 ${core.sheepCollected}）`);
check(core.phase === 'q1done', '集齐后 phase=q1done');

console.log('\n[3] 回去复命，触发猛狮战');
navTo(j.c, j.r);
core.confirm();
clearDialogue();
check(core.phase === 'q2', '复命后 phase=q2');
check(core.enemy !== null && core.enemy!.key === 'lion', '猛狮已生成');
check(core.lionActive, 'lionActive=true');

console.log('\n[4] 实时击退猛狮（弹弓远程，边走位边打）');
core.setWeapon('sling');
// 触发猛狮登场对白：靠近它
{
  const lion = GameData.lion;
  navTo(lion.c - 3, lion.r);
  clearDialogue();
}
// 持续攻击直到猛狮被击退（带超时保护）
{
  let guard = 0;
  while (core.lionDefeated === false && guard++ < 6000) {
    if (core.dialogueActive()) { clearDialogue(); continue; }
    const e = core.enemy;
    if (!e) break;
    // 面向敌人
    const pc = core.playerCenter();
    const dx = (e.x + TILE / 2) - pc.x;
    const dy = (e.y + TILE / 2) - pc.y;
    if (Math.abs(dx) > Math.abs(dy)) core.player.facing = dx < 0 ? 'left' : 'right';
    else core.player.facing = dy < 0 ? 'up' : 'down';
    core.setAttack(true);
    core.update();
  }
  core.setAttack(false);
}
clearDialogue();
check(core.lionDefeated, '猛狮已被击退 lionDefeated=true');
check(core.phase === 'q3', '入夜后 phase=q3');
check(core.enemy !== null && core.enemy!.key === 'spirit', '邪灵已生成');
check(core.weapon === 'harp', '自动切换到弹琴 harp');

console.log('\n[4b] 击败猛狮获得经验与掉落');
check(core.player.xp >= 20, `击败猛狮获得经验（xp=${core.player.xp}）`);
check(core.groundItems.length >= 1, `猛狮掉落了装备（地面 ${core.groundItems.length} 件）`);

console.log('\n[5] 物理攻击对邪灵几乎无效（伤害门控）');
if (core.enemy) {
  core.setWeapon('sling');
  core.player.facing = 'down';
  // 靠近触发登场对白
  const sp = GameData.spirit;
  navTo(sp.c, sp.r - 2);
  clearDialogue();
  // 打几下弹弓
  const hpBeforePhys = core.enemy!.hp;
  let guard = 0;
  while (guard++ < 400 && core.enemy && core.enemy.hp > hpBeforePhys - 3) {
    const e = core.enemy; if (!e) break;
    const pc = core.playerCenter();
    const dx = (e.x + TILE / 2) - pc.x; const dy = (e.y + TILE / 2) - pc.y;
    if (Math.abs(dx) > Math.abs(dy)) core.player.facing = dx < 0 ? 'left' : 'right';
    else core.player.facing = dy < 0 ? 'up' : 'down';
    core.setAttack(true); core.update();
  }
  core.setAttack(false);
  check(core.hintShown, '已弹出「物理无效」提示');
  check(core.enemy !== null && !core.spiritDefeated, '物理攻击未能击败邪灵');
}

console.log('\n[6] 弹琴赞美驱散邪灵 → 通关');
core.setWeapon('harp');
{
  let guard = 0;
  while (core.spiritDefeated === false && guard++ < 6000) {
    if (core.dialogueActive()) { clearDialogue(); continue; }
    const e = core.enemy; if (!e) break;
    const pc = core.playerCenter();
    const dx = (e.x + TILE / 2) - pc.x; const dy = (e.y + TILE / 2) - pc.y;
    if (Math.abs(dx) > Math.abs(dy)) core.player.facing = dx < 0 ? 'left' : 'right';
    else core.player.facing = dy < 0 ? 'up' : 'down';
    core.setAttack(true); core.update();
  }
  core.setAttack(false);
}
clearDialogue();
check(core.spiritDefeated, '邪灵已被驱散 spiritDefeated=true');
check(core.phase === 'done', 'phase=done');
check(finished !== null, '已触发通关回调 onFinish');
check(!core.running, '通关后 running=false');

console.log('\n[7] 数值系统单元校验（属性/伤害/减伤/经验）');
{
  const d0 = derive(defaultAttributes(), emptyEquipment());
  check(d0.maxHp === 20 + 6 * 4, `初始最大生命 = 20+VIT*4 = ${d0.maxHp}`);
  check(d0.physMul > 1, `力量提升物理乘数 physMul=${d0.physMul.toFixed(3)}`);
  check(d0.holyMul > 1, `信心提升驱邪乘数 holyMul=${d0.holyMul.toFixed(3)}`);
  const wd = weaponDamage('phys', 6, 10, d0);
  check(wd.min >= 6 && wd.max >= wd.min, `物理伤害随属性放大 [${wd.min},${wd.max}]`);
  const wh = weaponDamage('harp', 9, 13, d0);
  check(wh.min >= 9, `驱邪伤害随信心放大 [${wh.min},${wh.max}]`);
  check(reduction(0, 1) === 0, '无护甲时减伤为 0');
  check(reduction(50, 1) > reduction(10, 1), '护甲越高减伤越高（单调）');
  check(reduction(99999, 1) <= 0.75, '护甲减伤封顶 75%');
  check(xpToNext(1) === 35 && xpToNext(2) === 50, '升级经验曲线 xpToNext 正确');
}

console.log('\n[8] 装备系统单元校验（稀有度/词缀/评分/掉落）');
{
  const common = rollItem('armor', 8, 'common');
  const rare = rollItem('armor', 8, 'rare');
  const uniq = rollItem('focus', 12, 'unique');
  check(common.affixes.length >= RARITY_META.common.minAffix
    && common.affixes.length <= RARITY_META.common.maxAffix, `普通装备词缀数符合区间（${common.affixes.length}）`);
  check(rare.affixes.length >= RARITY_META.rare.minAffix, `稀有装备至少 ${RARITY_META.rare.minAffix} 条词缀（${rare.affixes.length}）`);
  check(scoreItem(rare) > scoreItem(common), '稀有装备评分高于普通装备');
  check(scoreItem(uniq) > scoreItem(null), '暗金装备评分高于空槽');
  const d1 = derive(defaultAttributes(), { focus: null, armor: rare, helm: null, amulet: null, ring: null });
  const d0 = derive(defaultAttributes(), emptyEquipment());
  check(d1.armor >= d0.armor, `穿上护甲后护甲值不降（${d0.armor}→${d1.armor}）`);
  let dropped = 0;
  for (let i = 0; i < 50; i++) if (rollLoot({ level: 2, lootChance: 1, lootTier: 'rare' })) dropped++;
  check(dropped === 50, '必掉敌人（lootChance=1）每次都掉落');
  const rareOrBetter = ['rare', 'unique'];
  const sample = rollLoot({ level: 2, lootChance: 1, lootTier: 'rare' });
  check(!!sample && rareOrBetter.indexOf(sample.rarity) >= 0, `掉落稀有度不低于下限（${sample && sample.rarity}）`);
}

console.log(`\n=== 结果：${assertions - failures}/${assertions} 通过 ===`);
if (failures > 0) { console.error(`有 ${failures} 项失败`); process.exit(1); }
console.log('全部通过 ✓\n');
