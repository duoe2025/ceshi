/* ============================================================
 * assets.js — 图片素材渲染管线（规范驱动 + 可热替换）
 * ============================================================ */

const Assets = (() => {
  const images = {};
  let allDone = false;

  const manifest = {
    tileset: {
      src: 'assets/tileset.png',
      cell: 64,
      map: {
        [T.GRASS]: [0, 0], [T.TGRASS]: [1, 0], [T.FLOWER]: [2, 0],
        [T.PATH]: [3, 0], [T.FOLD]: [4, 0], [T.HILL]: [5, 0],
        [T.TREE]: [0, 1], [T.ROCK]: [1, 1], [T.FENCE]: [2, 1],
        [T.WELL]: [3, 1], [T.HOUSE]: [4, 1], [T.CAVE]: [5, 1],
      },
    },
    david: {
      src: 'assets/david.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3, 4, 5],
    },
    davidRun: {
      src: 'assets/david_run.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3, 4, 5],
    },
    davidIdle: {
      src: 'assets/david_idle.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3],
    },
    davidSling: {
      src: 'assets/david_sling.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3, 4, 5],
    },
    davidStaff: {
      src: 'assets/david_staff.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3, 4, 5],
    },
    davidHarp: {
      src: 'assets/david_harp.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3],
    },
    davidPray: {
      src: 'assets/david_pray.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3],
    },
    davidHurt: {
      src: 'assets/david_hurt.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1],
    },
    davidDown: {
      src: 'assets/david_down.png',
      cell: 96,
      dirRow: { down: 0, left: 1, right: 2, up: 3 },
      cols: [0, 1, 2, 3],
    },
  };

  // 动作 -> 清单条目名（缺图自动回退到 walk/程序化）
  const DAVID_ACTION = {
    walk: 'david', run: 'davidRun', idle: 'davidIdle', sling: 'davidSling',
    staff: 'davidStaff', harp: 'davidHarp', pray: 'davidPray',
    hurt: 'davidHurt', down: 'davidDown',
  };

  // 某动作的帧数（缺图回退到行走帧数），供 game.js 计算动画进度
  function davidCols(action) {
    const name = DAVID_ACTION[action] || 'david';
    const d = manifest[has(name) ? name : 'david'];
    return d && d.cols && d.cols.length ? d.cols.length : 1;
  }

  function load(onComplete) {
    const entries = Object.keys(manifest).filter(k => manifest[k] && manifest[k].src);
    let pending = entries.length;
    if (pending === 0) { allDone = true; if (onComplete) onComplete(); return; }
    entries.forEach(name => {
      const img = new Image();
      img.onload = () => { images[name] = img; done(); };
      img.onerror = () => done();
      img.src = manifest[name].src;
    });
    function done() {
      if (--pending <= 0) { allDone = true; if (onComplete) onComplete(); }
    }
  }

  function has(name) {
    const i = images[name];
    return !!(i && i.complete && i.naturalWidth > 0);
  }

  function drawTile(ctx, type, x, y) {
    if (!has('tileset')) return false;
    const t = manifest.tileset;
    const cell = t.map[type];
    if (!cell) return false;
    ctx.drawImage(images.tileset, cell[0] * t.cell, cell[1] * t.cell, t.cell, t.cell,
      x, y, TILE, TILE);
    return true;
  }

  function drawSheet(ctx, name, x, y, facing, frame) {
    if (!has(name)) return false;
    const d = manifest[name];
    const row = d.dirRow[facing] != null ? d.dirRow[facing] : 0;
    const cols = d.cols && d.cols.length ? d.cols : [0];
    const col = cols[Math.max(0, Math.min(cols.length - 1, frame))] || 0;
    ctx.drawImage(images[name], col * d.cell, row * d.cell, d.cell, d.cell,
      x, y, TILE, TILE);
    return true;
  }

  function drawDavid(ctx, x, y, facing, frame, action = 'walk') {
    const name = DAVID_ACTION[action];
    if (name && name !== 'david' && drawSheet(ctx, name, x, y, facing, frame)) return true;
    return drawSheet(ctx, 'david', x, y, facing, frame);
  }

  return { manifest, load, has, drawTile, drawDavid, davidCols, ready: () => allDone };
})();
