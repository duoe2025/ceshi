/* ============================================================
 * Items.ts — 引擎无关的装备系统（稀有度 / 词缀 / 物品等级 / 掉落）。
 * 纯函数（仅依赖 Math.random），无 Cocos / DOM 依赖。
 * 见 docs/开发计划.md 第二部分「7. 装备系统」。
 * ============================================================ */

import {
  Affix, AffixStat, Item, Rarity, Slot,
} from './types';

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[ri(0, arr.length - 1)]; }

export const RARITY_META: Record<Rarity, { name: string; color: string; minAffix: number; maxAffix: number }> = {
  common: { name: '普通', color: '#c8c8c8', minAffix: 0, maxAffix: 0 },
  magic: { name: '魔法', color: '#4a90ff', minAffix: 1, maxAffix: 2 },
  rare: { name: '稀有', color: '#ffd24a', minAffix: 3, maxAffix: 4 },
  unique: { name: '暗金', color: '#ff8a3c', minAffix: 3, maxAffix: 4 },
};
const RARITY_ORDER: Rarity[] = ['common', 'magic', 'rare', 'unique'];

export function rarityColor(r: Rarity): string { return RARITY_META[r].color; }
export function rarityName(r: Rarity): string { return RARITY_META[r].name; }

const SLOT_NOUN: Record<Slot, string> = {
  focus: '投石索', armor: '皮甲', helm: '头巾', amulet: '护符', ring: '指环',
};
const SLOT_QUALITY: Record<Slot, string[]> = {
  focus: ['磨亮的', '上好的', '猎手的', '精准的'],
  armor: ['结实的', '加厚的', '磐石般的', '牧人的'],
  helm: ['轻便的', '坚固的', '守望者的', '羊毛的'],
  amulet: ['古旧的', '圣洁的', '蒙福的', '伯利恒的'],
  ring: ['朴素的', '镶嵌的', '信实的', '约定的'],
};

/** 每槽位可出现的词缀池（主题化）。 */
const SLOT_AFFIXES: Record<Slot, AffixStat[]> = {
  focus: ['physPct', 'holy', 'crit', 'str', 'fai', 'critDmg'],
  armor: ['armor', 'maxHp', 'vit', 'str'],
  helm: ['armor', 'vit', 'maxHp', 'fai'],
  amulet: ['crit', 'critDmg', 'str', 'dex', 'vit', 'fai', 'physPct'],
  ring: ['dex', 'fai', 'cdScale', 'lifeSteal', 'crit', 'pickup', 'xpPct'],
};

const AFFIX_LABEL: Record<AffixStat, string> = {
  str: '力量', dex: '敏捷', vit: '体力', fai: '信心',
  maxHp: '最大生命', physPct: '物理伤害%', armor: '护甲', crit: '暴击率%',
  critDmg: '暴击伤害%', cdScale: '攻击速度%', lifeSteal: '生命偷取%',
  holy: '驱邪伤害', xpPct: '经验获取%', pickup: '拾取范围',
};

export function affixLabel(stat: AffixStat): string { return AFFIX_LABEL[stat]; }

/** 词缀数值随物品等级缩放。 */
function rollAffixValue(stat: AffixStat, ilvl: number): number {
  switch (stat) {
    case 'str': case 'dex': case 'vit': case 'fai': return ri(1, 2 + Math.floor(ilvl / 3));
    case 'maxHp': return ri(5, 10 + ilvl * 2);
    case 'physPct': return ri(3, 6 + Math.floor(ilvl * 1.2));
    case 'armor': return ri(2, 4 + ilvl);
    case 'crit': return ri(2, 3 + Math.floor(ilvl / 2));
    case 'critDmg': return ri(8, 12 + ilvl * 2);
    case 'cdScale': return ri(3, 5 + Math.floor(ilvl / 2));
    case 'lifeSteal': return ri(1, 2 + Math.floor(ilvl / 4));
    case 'holy': return ri(2, 4 + Math.floor(ilvl * 1.2));
    case 'xpPct': return ri(3, 5 + ilvl);
    case 'pickup': return ri(5, 10 + ilvl);
    default: return 1;
  }
}

let _itemSeq = 0;
function newId(): string { _itemSeq += 1; return `it_${_itemSeq}`; }

/** 暗金（命名）装备表：固定词缀 + 传奇特效说明。 */
const UNIQUES: Record<Slot, { name: string; unique: string; affixes: Array<{ stat: AffixStat; value: number }> }[]> = {
  focus: [{
    name: '基述·伯利恒投石索', unique: '投石必中要害（暴击率大幅提升）',
    affixes: [{ stat: 'physPct', value: 30 }, { stat: 'crit', value: 15 }, { stat: 'str', value: 4 }],
  }],
  amulet: [{
    name: '蒙福的赞美护符', unique: '驱邪伤害显著提升',
    affixes: [{ stat: 'holy', value: 12 }, { stat: 'fai', value: 6 }, { stat: 'critDmg', value: 30 }],
  }],
  armor: [{
    name: '磐石牧人皮甲', unique: '坚不可摧（高护甲与生命）',
    affixes: [{ stat: 'armor', value: 30 }, { stat: 'maxHp', value: 40 }, { stat: 'vit', value: 5 }],
  }],
  helm: [{
    name: '守望者的头巾', unique: '提升警觉与生命',
    affixes: [{ stat: 'vit', value: 5 }, { stat: 'armor', value: 15 }, { stat: 'maxHp', value: 25 }],
  }],
  ring: [{
    name: '信实的约戒', unique: '攻速与生命偷取',
    affixes: [{ stat: 'cdScale', value: 12 }, { stat: 'lifeSteal', value: 4 }, { stat: 'dex', value: 4 }],
  }],
};

function buildName(slot: Slot, rarity: Rarity): string {
  const noun = SLOT_NOUN[slot];
  if (rarity === 'common') return noun;
  const q = pick(SLOT_QUALITY[slot]);
  return `${q}${noun}`;
}

/** 生成一件随机装备。 */
export function rollItem(slot: Slot, itemLevel: number, rarity: Rarity): Item {
  const ilvl = Math.max(1, itemLevel);
  const reqLevel = Math.max(1, ilvl - 2);
  const slotArmorK: Record<Slot, number> = { armor: 1.5, helm: 1, focus: 0, amulet: 0, ring: 0 };
  const baseArmor = Math.floor(ilvl * 1.5 * slotArmorK[slot]);

  if (rarity === 'unique') {
    const table = UNIQUES[slot];
    if (table && table.length) {
      const u = pick(table);
      return {
        id: newId(), name: u.name, slot, rarity: 'unique', itemLevel: ilvl, reqLevel,
        baseArmor: baseArmor + Math.floor(ilvl * 0.5),
        affixes: u.affixes.map((a) => ({ ...a })), unique: u.unique,
      };
    }
    rarity = 'rare'; // 无对应暗金则降级为稀有
  }

  const meta = RARITY_META[rarity];
  const count = ri(meta.minAffix, meta.maxAffix);
  const pool = SLOT_AFFIXES[slot].slice();
  const affixes: Affix[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = ri(0, pool.length - 1);
    const stat = pool.splice(idx, 1)[0];
    affixes.push({ stat, value: rollAffixValue(stat, ilvl) });
  }
  return {
    id: newId(), name: buildName(slot, rarity), slot, rarity, itemLevel: ilvl, reqLevel, baseArmor, affixes,
  };
}

function clampRarity(r: Rarity): Rarity {
  return RARITY_ORDER.indexOf(r) >= 0 ? r : 'common';
}

/** 在「至少 minTier」基础上做一次稀有度上浮 roll。 */
function rollRarity(minTier: Rarity): Rarity {
  const minIdx = RARITY_ORDER.indexOf(clampRarity(minTier));
  const roll = Math.random();
  let idx = minIdx;
  if (roll > 0.97) idx = Math.max(idx, 3); // unique
  else if (roll > 0.82) idx = Math.max(idx, 2); // rare
  else if (roll > 0.5) idx = Math.max(idx, 1); // magic
  return RARITY_ORDER[Math.min(3, idx)];
}

/** 敌人掉落：返回一件装备或 null。 */
export function rollLoot(enemy: { level: number; lootChance: number; lootTier: Rarity }): Item | null {
  if (Math.random() > enemy.lootChance) return null;
  const slot = pick<Slot>(['focus', 'armor', 'helm', 'amulet', 'ring']);
  const rarity = rollRarity(enemy.lootTier);
  const ilvl = Math.max(1, enemy.level + ri(-1, 2));
  return rollItem(slot, ilvl, rarity);
}

/** 宝箱掉落：保底魔法及以上。 */
export function rollChestLoot(level: number): Item {
  const slot = pick<Slot>(['focus', 'armor', 'helm', 'amulet', 'ring']);
  const rarity = rollRarity('magic');
  return rollItem(slot, Math.max(1, level + ri(0, 2)), rarity);
}
