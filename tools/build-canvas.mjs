// 用 esbuild 把 Canvas 版（引擎无关核心 + Canvas 渲染层）打包为：
//   web/game.js     —— 浏览器可玩版（也用于在线预览）
//   wechat/game.js  —— 微信小游戏入口（用微信开发者工具打开 wechat/ 目录）
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const common = {
  bundle: true,
  format: 'iife',
  target: 'es2019',
  legalComments: 'none',
  tsconfig: resolve(root, 'tools/tsconfig.canvas.json'),
};

await build({
  ...common,
  entryPoints: [resolve(root, 'assets/scripts/canvas/main.web.ts')],
  outfile: resolve(root, 'web/game.js'),
});
console.log('built web/game.js');

await build({
  ...common,
  entryPoints: [resolve(root, 'assets/scripts/canvas/main.wechat.ts')],
  outfile: resolve(root, 'wechat/game.js'),
});
console.log('built wechat/game.js');
