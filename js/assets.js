/* ============================================================
 * assets.js — 图片素材渲染管线（规范驱动 + 可热替换）
 *
 * 设计目标：
 *  1. 用一份「素材清单(manifest)」描述图集如何切片，把美术与代码解耦。
 *  2. 有图片就用图片，缺图片自动回退到 sprites.js 的程序化绘制——任何时候游戏都能跑。
 *  3. 美术按规范（固定网格 / 4 行=4 朝向 / 真透明 PNG）产出后，
 *     只需把文件替换到 assets/ 同名路径，无需改代码。
 *
 * 坐标说明：世界仍是 TILE(=32) 的正交俯视网格；图集源格可以是任意像素尺寸
 *           （如 48），绘制时统一缩放到世界 TILE，因此美术分辨率与世界网格解耦。
 * ============================================================ */

const Assets = (() => {
  const images = {};   // name -> HTMLImageElement
  let allDone = false;

  /* ---------------- 素材清单 ----------------
   * tileset：瓦片图集，按 cell 大小的网格切片；map 把瓦片类型映射到 [列, 行]。
   * david  ：角色精灵表，dirRow 指定每个朝向占用的行，walkCols 指定行走帧所在列。
   * 缺少对应文件 / 映射时，调用方会回退到 Sprites 程序化绘制。
   */
  const manifest = {
    tileset: {
      src: 'assets/tileset.png',
      cell: 64,
      map: {
        [T.GRASS]:  [0, 0], [T.TGRASS]: [1, 0], [T.FLOWER]: [2, 0],
        [T.PATH]:   [3, 0], [T.FOLD]:   [4, 0], [T.HILL]:   [5, 0],
        [T.TREE]:   [0, 1], [T.ROCK]:   [1, 1], [T.FENCE]:  [2, 1],
        [T.WELL]:   [3, 1], [T.HOUSE]:  [4, 1], [T.CAVE]:   [5, 1],
      },
    },
    david: {
      src: 'assets/david.png',
      cell: 64,
      // 行索引：每个朝向一行（与重生成提示词约定一致）
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      // 行走动画所在列（与 game.js 的 player.frame 循环对应）
      walkCols: [0, 1, 2, 3, 4, 5],
    },
  };

  /* ---------------- 加载 ---------------- */
  // 逐个加载 manifest 里声明 src 的条目；任一文件缺失只是「该项不可用」，不阻塞其它。
  function load(onComplete) {
    const entries = Object.keys(manifest).filter(k => manifest[k] && manifest[k].src);
    let pending = entries.length;
    if (pending === 0) { allDone = true; if (onComplete) onComplete(); return; }
    entries.forEach(name => {
      const img = new Image();
      img.onload = () => { images[name] = img; done(); };
      img.onerror = () => { /* 缺图：保持回退到程序化绘制 */ done(); };
      img.src = manifest[name].src;
    });
    function done() {
      if (--pending <= 0) { allDone = true; if (onComplete) onComplete(); }
    }
  }

  // 图片是否真正可用（已加载且有像素）
  function has(name) {
    const i = images[name];
    return !!(i && i.complete && i.naturalWidth > 0);
  }

  /* ---------------- 绘制（返回 true 表示已用图片绘制，false 表示需回退） ---------------- */
  // 瓦片：把图集中对应格缩放到世界 TILE 绘制
  function drawTile(ctx, type, x, y) {
    if (!has('tileset')) return false;
    const t = manifest.tileset;
    const cell = t.map[type];
    if (!cell) return false;            // 该瓦片未在图集映射 → 回退
    ctx.drawImage(images.tileset, cell[0] * t.cell, cell[1] * t.cell, t.cell, t.cell,
                  x, y, TILE, TILE);
    return true;
  }

  // 大卫：按朝向选行、按行走帧选列
  function drawDavid(ctx, x, y, facing, frame) {
    if (!has('david')) return false;
    const d = manifest.david;
    const row = d.dirRow[facing] != null ? d.dirRow[facing] : 0;
    const col = d.walkCols[frame % d.walkCols.length] || 0;
    ctx.drawImage(images.david, col * d.cell, row * d.cell, d.cell, d.cell,
                  x, y, TILE, TILE);
    return true;
  }

  return { manifest, load, has, drawTile, drawDavid, ready: () => allDone };
})();
