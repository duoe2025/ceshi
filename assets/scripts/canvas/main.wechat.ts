/* 微信小游戏入口：wx.createCanvas + 触摸虚拟摇杆/按键 + 全局 requestAnimationFrame。
 * 经 esbuild 打包为根目录 game.js。无 DOM 依赖。 */
import { CanvasGame, VIEW_W, VIEW_H, FullCtx } from './CanvasGame';

interface WxTouch { identifier: number; clientX: number; clientY: number; }
interface WxTouchEvent { changedTouches: WxTouch[]; }
interface WxLike {
  createCanvas(): { width: number; height: number; getContext(t: '2d'): unknown };
  getSystemInfoSync(): { windowWidth: number; windowHeight: number };
  onTouchStart(cb: (e: WxTouchEvent) => void): void;
  onTouchMove(cb: (e: WxTouchEvent) => void): void;
  onTouchEnd(cb: (e: WxTouchEvent) => void): void;
  onTouchCancel(cb: (e: WxTouchEvent) => void): void;
}
declare const wx: WxLike;

const canvas = wx.createCanvas();
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d') as FullCtx;

const sys = wx.getSystemInfoSync();
const sw = sys.windowWidth;
const sh = sys.windowHeight;
const sx = VIEW_W / sw;
const sy = VIEW_H / sh;

const game = new CanvasGame(ctx);
game.setTouchControls(true);
game.start();

wx.onTouchStart((e) => e.changedTouches.forEach((t) => game.pointerDown(t.identifier, t.clientX * sx, t.clientY * sy)));
wx.onTouchMove((e) => e.changedTouches.forEach((t) => game.pointerMove(t.identifier, t.clientX * sx, t.clientY * sy)));
wx.onTouchEnd((e) => e.changedTouches.forEach((t) => game.pointerUp(t.identifier)));
wx.onTouchCancel((e) => e.changedTouches.forEach((t) => game.pointerUp(t.identifier)));

declare const requestAnimationFrame: (cb: () => void) => number;
function loop(): void { game.frame(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
