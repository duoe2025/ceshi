/* ============================================================
 * main.ts — Phaser 3 HTML5 入口（牧童大卫 · 大卫一生 ARPG）。
 * 仅负责创建 Phaser.Game 并装载场景；逻辑全部在引擎无关核心里。
 * 由 esbuild 打包为 html5/game.js（见 tools/build-phaser.mjs）。
 * ============================================================ */

import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../canvas/CanvasGame';
import { WorldScene } from './WorldScene';
import { UIScene } from './UIScene';

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
  // WorldScene 在前：每帧先 step()+渲染世界并写入 registry；UIScene 叠加渲染 HUD。
  scene: [WorldScene, UIScene],
});
// 调试钩子：浏览器控制台可访问 __DAVID.game / 当前场景
(window as unknown as { __DAVID: Phaser.Game }).__DAVID = game;
