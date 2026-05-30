// 用 esbuild 把 Phaser 3 HTML5 版（引擎无关核心 + CanvasGame 像素渲染 + Phaser 场景/循环）
// 打包为 html5/game.js（HTML5 网页游戏，可直接用浏览器打开 html5/index.html 试玩）。
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  legalComments: 'none',
  // 用 Phaser 官方预编译产物（已内置渲染特性开关），避免从源码打包导致体积爆炸
  alias: { phaser: resolve(root, 'tools/node_modules/phaser/dist/phaser.min.js') },
  // phaser 安装在 tools/node_modules 下，让 esbuild 能从这里解析裸模块
  nodePaths: [resolve(root, 'tools/node_modules')],
  tsconfig: resolve(root, 'tools/tsconfig.phaser.json'),
  entryPoints: [resolve(root, 'assets/scripts/phaser/main.ts')],
  outfile: resolve(root, 'html5/game.js'),
});
console.log('built html5/game.js');
