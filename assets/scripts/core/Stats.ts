/* ============================================================
 * Stats.ts — 引擎无关的数值系统（暗黑式属性 + 派生 + 伤害公式）。
 * 纯函数，无 Cocos / DOM 依赖，可在 node 下直接验证。
 * 见 docs/开发计划.md 第二部分「6. 数值系统」。
 * ============================================================ */

import {
  Affix, AffixStat, Attributes, DerivedStats, Equipment, Item, Slot,
} from './types';

export const SLOTS: Slot[] = ['focus', 'armor', 'helm', 'amulet', 'ring'];

export function defaultAttributes(): Attributes {
  return { str: 6, dex: 6, vit: 6, fai: 6 };
}

export function emptyEquipment(): Equipment {
  return { focus: null, armor: null, helm: null, amulet: null, ring: null };
}

/** 汇总装备中某条词缀的总值（含基础护甲计入 armor）。 */
export function sumAffix(equip: Equipment, stat: AffixStat): number {
  let total = 0;
  for (const s of SLOTS) {
    const it = equip[s];
    if (!it) continue;
    if (stat === 'armor') total += it.baseArmor;
    for (const a of it.affixes) if (a.stat === stat) total += a.value;
  }
  return total;
}

/** 由主属性 + 装备实时计算派生属性。 */
export function derive(attr: Attributes, equip: Equipment): DerivedStats {
  const str = attr.str + sumAffix(equip, 'str');
  const dex = attr.dex + sumAffix(equip, 'dex');
  const vit = attr.vit + sumAffix(equip, 'vit');
  const fai = attr.fai + sumAffix(equip, 'fai');

  const physMul = (1 + str * 0.03) * (1 + sumAffix(equip, 'physPct') / 100);
  const holyMul = 1 + fai * 0.05;
  const cdRaw = (1 - Math.min(0.4, dex * 0.004)) * (1 - sumAffix(equip, 'cdScale') / 100);

  return {
    maxHp: Math.round(20 + vit * 4 + sumAffix(equip, 'maxHp')),
    maxStamina: Math.round(50 + fai * 2),
    physMul,
    holyMul,
    physFlat: 0,
    holyFlat: sumAffix(equip, 'holy'),
    armor: Math.floor(sumAffix(equip, 'armor') + dex * 0.25),
    crit: Math.min(0.5, 0.05 + dex * 0.002 + sumAffix(equip, 'crit') / 100),
    critMult: 1.5 + sumAffix(equip, 'critDmg') / 100,
    dodge: Math.min(0.3, dex * 0.003),
    cdScale: Math.max(0.5, cdRaw),
    lifeSteal: sumAffix(equip, 'lifeSteal') / 100,
    xpPct: sumAffix(equip, 'xpPct') / 100,
    pickup: 30 + sumAffix(equip, 'pickup'),
  };
}

/** 暗黑式护甲减伤曲线，封顶 75%。 */
export function reduction(armor: number, enemyLevel: number): number {
  return Math.min(0.75, armor / (armor + 10 + 8 * Math.max(1, enemyLevel)));
}

/** 某武器（按 kind）在当前派生属性下的伤害区间。 */
export function weaponDamage(
  kind: 'phys' | 'harp', baseMin: number, baseMax: number, d: DerivedStats,
): { min: number; max: number } {
  if (kind === 'harp') {
    return {
      min: Math.round(baseMin * d.holyMul + d.holyFlat),
      max: Math.round(baseMax * d.holyMul + d.holyFlat),
    };
  }
  return {
    min: Math.round(baseMin * d.physMul + d.physFlat),
    max: Math.round(baseMax * d.physMul + d.physFlat),
  };
}

export function xpToNext(level: number): number {
  return 20 + level * 15;
}

/** 升级时分配属性点（每级约 +3.5）。返回新的属性对象（不可变）。 */
export function levelUpAttributes(attr: Attributes, newLevel: number): Attributes {
  const next: Attributes = {
    str: attr.str + 1, dex: attr.dex + 1, vit: attr.vit + 1, fai: attr.fai,
  };
  if (newLevel % 2 === 0) next.fai += 1;
  return next;
}

/** 武器是否物理（用于伤害公式选择）。 */
export function isPhysKind(weaponKind: string | undefined): boolean {
  return weaponKind !== 'harp';
}

/** 一件装备的综合评分（用于「自动装备更优」比较）。 */
export function scoreItem(item: Item | null): number {
  if (!item) return -1;
  const W: Partial<Record<AffixStat, number>> = {
    str: 1.2, dex: 1.2, vit: 1, fai: 1.2,
    maxHp: 0.25, physPct: 1.5, armor: 0.4, crit: 2, critDmg: 0.6,
    cdScale: 1.5, lifeSteal: 1.5, holy: 1, xpPct: 0.5, pickup: 0.1,
  };
  let s = item.baseArmor * 0.4 + item.itemLevel * 0.5;
  for (const a of item.affixes) s += a.value * (W[a.stat] || 0.5);
  const rarityBonus: Record<string, number> = { common: 0, magic: 2, rare: 5, unique: 10 };
  return s + (rarityBonus[item.rarity] || 0);
}
