/* ============================================================
 * Sprites.ts — 程序化像素绘制（无外部图片资源）
 * 从原 Web 版 sprites.js 移植：瓦片用矩形拼出，角色用 16x16 逻辑网格色块拼出。
 * 全部通过 Painter 绘制到 Cocos Graphics。
 * ============================================================ */

import { IPainter } from './IPainter';
import { T } from './core/GameData';

// 颜色直接用 hex 字符串（IPainter 约定），保留 hex() 为透传以减少改动
function hex(s: string): string { return s; }

// 在以 (x,y) 为左上角、每逻辑像素 = scale 的网格中画一个色块
function blk(p: IPainter, x: number, y: number, scale: number,
  col: number, row: number, w: number, h: number, color: string): void {
  p.fillRect(Math.round(x + col * scale), Math.round(y + row * scale),
    Math.ceil(w * scale), Math.ceil(h * scale), hex(color));
}

const TILE = 32;

/* ---------------- 瓦片 ---------------- */
export function tile(p: IPainter, type: number, x: number, y: number): void {
  const s = TILE;
  switch (type) {
    case T.GRASS:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillRect(x + 6, y + 10, 3, 3, hex('#5d9a45'));
      p.fillRect(x + 20, y + 22, 3, 3, hex('#5d9a45'));
      p.fillRect(x + 25, y + 6, 2, 2, hex('#5d9a45'));
      break;
    case T.TGRASS:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      for (let i = 0; i < 5; i++) p.fillRect(x + 4 + i * 6, y + 18 - (i % 2) * 4, 2, 10, hex('#4f8a3a'));
      break;
    case T.FLOWER:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillRect(x + 8, y + 10, 4, 4, hex('#e3d24a'));
      p.fillRect(x + 20, y + 18, 4, 4, hex('#e06f9c'));
      p.fillRect(x + 9, y + 11, 2, 2, hex('#ffffff'));
      p.fillRect(x + 21, y + 19, 2, 2, hex('#ffffff'));
      break;
    case T.PATH:
      p.fillRect(x, y, s, s, hex('#c2a878'));
      p.fillRect(x + 5, y + 7, 4, 3, hex('#b39866'));
      p.fillRect(x + 18, y + 16, 5, 3, hex('#b39866'));
      p.fillRect(x + 10, y + 24, 3, 3, hex('#b39866'));
      break;
    case T.FOLD:
      p.fillRect(x, y, s, s, hex('#cbb083'));
      p.fillRect(x + 6, y + 12, 6, 3, hex('#bfa172'));
      p.fillRect(x + 18, y + 22, 6, 3, hex('#bfa172'));
      break;
    case T.TREE:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillRect(x + 13, y + 18, 6, 12, hex('#5a3b22'));
      p.fillCircle(x + 16, y + 13, 13, hex('#2f6b2f'));
      p.fillCircle(x + 12, y + 11, 8, hex('#3c8a3c'));
      p.fillCircle(x + 20, y + 15, 6, hex('#4fa84f'));
      break;
    case T.ROCK:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillPoly([[x + 6, y + 26], [x + 11, y + 10], [x + 22, y + 9], [x + 27, y + 26]], hex('#8c8c94'));
      p.fillRect(x + 12, y + 13, 6, 4, hex('#a8a8b0'));
      p.fillRect(x + 6, y + 24, 21, 3, hex('#6e6e76'));
      break;
    case T.FENCE:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillRect(x + 4, y + 8, 4, 20, hex('#7a5230'));
      p.fillRect(x + 24, y + 8, 4, 20, hex('#7a5230'));
      p.fillRect(x, y + 12, s, 4, hex('#8a6038'));
      p.fillRect(x, y + 22, s, 4, hex('#8a6038'));
      break;
    case T.WELL:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillRect(x + 6, y + 12, 20, 16, hex('#7d7d86'));
      p.fillRect(x + 9, y + 15, 14, 10, hex('#2b3a55'));
      p.fillRect(x + 5, y + 4, 3, 10, hex('#5a3b22'));
      p.fillRect(x + 24, y + 4, 3, 10, hex('#5a3b22'));
      p.fillRect(x + 4, y + 3, 24, 4, hex('#8a6038'));
      break;
    case T.HOUSE:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
      p.fillRect(x + 2, y + 14, 28, 16, hex('#caa472'));
      p.fillPoly([[x, y + 15], [x + 16, y + 2], [x + 32, y + 15]], hex('#a8412f'));
      p.fillRect(x + 13, y + 20, 7, 10, hex('#5a3b22'));
      p.fillRect(x + 5, y + 18, 5, 5, hex('#7ec0d8'));
      p.fillRect(x + 22, y + 18, 5, 5, hex('#7ec0d8'));
      break;
    case T.HILL:
      p.fillRect(x, y, s, s, hex('#8f7f5f'));
      p.fillRect(x + 4, y + 6, 10, 6, hex('#7d6f52'));
      p.fillRect(x + 18, y + 16, 10, 6, hex('#7d6f52'));
      p.fillRect(x, y, s, 4, hex('#a3927040'));
      break;
    case T.CAVE:
      p.fillRect(x, y, s, s, hex('#8f7f5f'));
      p.fillRect(x + 2, y + 2, 28, 28, hex('#6b5d44'));
      p.fillEllipse(x + 16, y + 20, 11, 12, hex('#120d08'));
      break;
    default:
      p.fillRect(x, y, s, s, hex('#6aa84f'));
  }
}

/* ---------------- 角色 ---------------- */
// 大卫：牧童，棕发、米色短袍，腰间投石索
export function david(p: IPainter, x: number, y: number, scale: number, facing: string, frame: number): void {
  const b = (c: number, r: number, w: number, h: number, col: string) => blk(p, x, y, scale, c, r, w, h, col);
  const step = frame ? 1 : 0;
  b(5, 1, 6, 2, '#6b4a2b'); b(4, 2, 8, 2, '#6b4a2b');
  b(5, 3, 6, 3, '#e8b88a');
  const ex = facing === 'left' ? 5 : facing === 'right' ? 7 : 6;
  b(ex, 4, 1, 1, '#2a1c10'); b(ex + 2, 4, 1, 1, '#2a1c10');
  b(4, 6, 8, 6, '#d9c08a'); b(4, 6, 8, 1, '#c2a86f');
  b(4, 9, 8, 1, '#7a5230');
  b(3, 6, 1, 4, '#e8b88a'); b(12, 6, 1, 4, '#e8b88a');
  b(12, 9, 2, 2, '#efe8d8');
  b(5, 12, 2, 3 + step, '#caa06f'); b(9, 12, 2, 3 - step, '#caa06f');
  b(5, 14 + step, 2, 1, '#5a3b22'); b(9, 14 - step, 2, 1, '#5a3b22');
}

// 父亲耶西：长袍、白须
export function jesse(p: IPainter, x: number, y: number, scale: number): void {
  const b = (c: number, r: number, w: number, h: number, col: string) => blk(p, x, y, scale, c, r, w, h, col);
  b(5, 0, 6, 2, '#8a8a8a');
  b(4, 1, 8, 2, '#6f6f6f');
  b(5, 3, 6, 3, '#e0b083');
  b(6, 4, 1, 1, '#2a1c10'); b(9, 4, 1, 1, '#2a1c10');
  b(5, 6, 6, 1, '#cfcfcf');
  b(4, 6, 8, 8, '#7d6a9c');
  b(4, 6, 8, 1, '#6a5888');
  b(3, 7, 1, 4, '#e0b083'); b(12, 7, 1, 4, '#e0b083');
  b(5, 14, 6, 1, '#5a3b22');
}

// 羊
export function sheep(p: IPainter, x: number, y: number, scale: number): void {
  const b = (c: number, r: number, w: number, h: number, col: string) => blk(p, x, y, scale, c, r, w, h, col);
  b(3, 5, 10, 6, '#f3efe6');
  b(2, 5, 2, 5, '#e8e2d4'); b(12, 5, 2, 5, '#e8e2d4');
  b(11, 4, 4, 4, '#dcd2bf');
  b(10, 5, 1, 3, '#3a3a3a'); b(15, 6, 1, 2, '#3a3a3a');
  b(12, 5, 1, 1, '#2a2a2a');
  b(4, 11, 2, 2, '#777777'); b(10, 11, 2, 2, '#777777');
}

// 猛狮
export function lion(p: IPainter, x: number, y: number, scale: number, hurt: boolean): void {
  const b = (c: number, r: number, w: number, h: number, col: string) => blk(p, x, y, scale, c, r, w, h, col);
  const body = hurt ? '#c97a3a' : '#d89a4a';
  const mane = hurt ? '#7a4a1f' : '#8a5a25';
  b(3, 9, 11, 5, body);
  b(2, 12, 2, 3, body); b(12, 12, 2, 3, body);
  b(13, 6, 4, 1, body);
  b(2, 2, 8, 8, mane);
  b(3, 3, 6, 6, body);
  b(4, 4, 1, 1, '#2a1c10'); b(7, 4, 1, 1, '#2a1c10');
  b(5, 6, 2, 1, '#7a4a1f');
  b(4, 7, 1, 1, '#ffffff'); b(7, 7, 1, 1, '#ffffff');
}

// 邪灵：漂浮的黑色斗篷，发光的双眼
export function spirit(p: IPainter, x: number, y: number, scale: number, hurt: boolean): void {
  const b = (c: number, r: number, w: number, h: number, col: string) => blk(p, x, y, scale, c, r, w, h, col);
  const robe = hurt ? '#5a4a7a' : '#2e2540';
  const robe2 = hurt ? '#7a6aa0' : '#403458';
  const eye = hurt ? '#fff2a0' : '#8be0ff';
  b(5, 1, 6, 3, robe2);
  b(4, 3, 8, 7, robe);
  b(3, 5, 1, 4, robe); b(12, 5, 1, 4, robe);
  b(4, 10, 2, 2, robe2); b(7, 11, 2, 2, robe); b(10, 10, 2, 2, robe2);
  b(5, 12, 1, 1, robe); b(9, 12, 1, 1, robe);
  b(6, 4, 1, 2, eye); b(9, 4, 1, 2, eye);
  b(2, 2, 1, 1, robe2); b(13, 3, 1, 1, robe2); b(3, 9, 1, 1, robe2);
}
