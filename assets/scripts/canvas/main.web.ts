/* 浏览器入口：键盘 + 指针，RAF 循环。用于本地预览与录屏验证。 */
import { CanvasGame, VIEW_W, VIEW_H, FullCtx } from './CanvasGame';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d') as unknown as FullCtx;
const game = new CanvasGame(ctx);
game.start();

const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
window.addEventListener('keydown', (e) => {
  game.keyDown(e.key);
  if (MOVE_KEYS.indexOf(e.key) >= 0) e.preventDefault();
});
window.addEventListener('keyup', (e) => game.keyUp(e.key));

function rel(clientX: number, clientY: number): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [(clientX - r.left) * VIEW_W / r.width, (clientY - r.top) * VIEW_H / r.height];
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') game.setTouchControls(true);
  const [x, y] = rel(e.clientX, e.clientY);
  game.pointerDown(e.pointerId, x, y);
});
canvas.addEventListener('pointermove', (e) => {
  const [x, y] = rel(e.clientX, e.clientY);
  game.pointerMove(e.pointerId, x, y);
});
window.addEventListener('pointerup', (e) => game.pointerUp(e.pointerId));

function loop(): void { game.frame(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
