/* ============================================================
 * main.ts — Phaser 3 HTML5 入口（牧童大卫 · 大卫一生 ARPG）。
 * 仅负责创建 Phaser.Game 并装载场景；逻辑全部在引擎无关核心里。
 * 由 esbuild 打包为 html5/game.js（见 tools/build-phaser.mjs）。
 * ============================================================ */

import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../canvas/CanvasGame';
import { WorldMapScene } from './WorldMapScene';
import { WorldScene } from './WorldScene';
import { UIScene } from './UIScene';
import { FieldScene } from './FieldScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: 'game',
  backgroundColor: '#14161c',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 启动场景=世界地图枢纽（WorldMapScene，列表首个）；点击节点切入对应地图。
  // 渲染层级按列表顺序：WorldScene 在 UIScene 之前 → HUD 叠加在世界之上。
  scene: [WorldMapScene, WorldScene, UIScene, FieldScene],
});
// 调试钩子：浏览器控制台可访问 __DAVID.game / 当前场景
(window as unknown as { __DAVID: Phaser.Game }).__DAVID = game;
