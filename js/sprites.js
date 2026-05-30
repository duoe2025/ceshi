/* ============================================================
 * sprites.js — 程序化像素绘制（无外部图片资源）
 * 瓦片用矩形拼出，角色用 16x16 逻辑网格的色块拼出。
 * ============================================================ */

const Sprites = (() => {
  // 在以 (x,y) 为左上角、每逻辑像素 = scale 的网格中画一个色块
  function blk(ctx, x, y, scale, col, row, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + col * scale), Math.round(y + row * scale),
                 Math.ceil(w * scale), Math.ceil(h * scale));
  }

  /* ---------------- 瓦片 ---------------- */
  function tile(ctx, type, x, y) {
    const s = TILE;
    switch (type) {
      case T.GRASS:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#5d9a45';
        ctx.fillRect(x + 6, y + 10, 3, 3); ctx.fillRect(x + 20, y + 22, 3, 3);
        ctx.fillRect(x + 25, y + 6, 2, 2);
        break;
      case T.TGRASS:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#4f8a3a';
        for (let i = 0; i < 5; i++) ctx.fillRect(x + 4 + i * 6, y + 18 - (i % 2) * 4, 2, 10);
        break;
      case T.FLOWER:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#e3d24a'; ctx.fillRect(x + 8, y + 10, 4, 4);
        ctx.fillStyle = '#e06f9c'; ctx.fillRect(x + 20, y + 18, 4, 4);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 9, y + 11, 2, 2); ctx.fillRect(x + 21, y + 19, 2, 2);
        break;
      case T.PATH:
        ctx.fillStyle = '#c2a878'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#b39866';
        ctx.fillRect(x + 5, y + 7, 4, 3); ctx.fillRect(x + 18, y + 16, 5, 3);
        ctx.fillRect(x + 10, y + 24, 3, 3);
        break;
      case T.FOLD:
        ctx.fillStyle = '#cbb083'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#bfa172'; ctx.fillRect(x + 6, y + 12, 6, 3); ctx.fillRect(x + 18, y + 22, 6, 3);
        break;
      case T.TREE:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#5a3b22'; ctx.fillRect(x + 13, y + 18, 6, 12);       // 树干
        ctx.fillStyle = '#2f6b2f'; ctx.beginPath();
        ctx.arc(x + 16, y + 13, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3c8a3c'; ctx.beginPath();
        ctx.arc(x + 12, y + 11, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4fa84f'; ctx.beginPath();
        ctx.arc(x + 20, y + 15, 6, 0, Math.PI * 2); ctx.fill();
        break;
      case T.ROCK:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#8c8c94'; ctx.beginPath();
        ctx.moveTo(x + 6, y + 26); ctx.lineTo(x + 11, y + 10);
        ctx.lineTo(x + 22, y + 9); ctx.lineTo(x + 27, y + 26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a8a8b0'; ctx.fillRect(x + 12, y + 13, 6, 4);
        ctx.fillStyle = '#6e6e76'; ctx.fillRect(x + 6, y + 24, 21, 3);
        break;
      case T.FENCE:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(x + 4, y + 8, 4, 20); ctx.fillRect(x + 24, y + 8, 4, 20);
        ctx.fillStyle = '#8a6038';
        ctx.fillRect(x, y + 12, s, 4); ctx.fillRect(x, y + 22, s, 4);
        break;
      case T.WELL:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#7d7d86'; ctx.fillRect(x + 6, y + 12, 20, 16);
        ctx.fillStyle = '#2b3a55'; ctx.fillRect(x + 9, y + 15, 14, 10);
        ctx.fillStyle = '#5a3b22'; ctx.fillRect(x + 5, y + 4, 3, 10); ctx.fillRect(x + 24, y + 4, 3, 10);
        ctx.fillStyle = '#8a6038'; ctx.fillRect(x + 4, y + 3, 24, 4);
        break;
      case T.HOUSE:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#caa472'; ctx.fillRect(x + 2, y + 14, 28, 16);     // 墙
        ctx.fillStyle = '#a8412f'; ctx.beginPath();                          // 屋顶
        ctx.moveTo(x, y + 15); ctx.lineTo(x + 16, y + 2); ctx.lineTo(x + 32, y + 15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a3b22'; ctx.fillRect(x + 13, y + 20, 7, 10);     // 门
        ctx.fillStyle = '#7ec0d8'; ctx.fillRect(x + 5, y + 18, 5, 5); ctx.fillRect(x + 22, y + 18, 5, 5);
        break;
      case T.HILL:
        ctx.fillStyle = '#8f7f5f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#7d6f52'; ctx.fillRect(x + 4, y + 6, 10, 6); ctx.fillRect(x + 18, y + 16, 10, 6);
        ctx.fillStyle = '#a3927040'; ctx.fillRect(x, y, s, 4);
        break;
      case T.CAVE:
        ctx.fillStyle = '#8f7f5f'; ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#6b5d44'; ctx.fillRect(x + 2, y + 2, 28, 28);
        ctx.fillStyle = '#120d08'; ctx.beginPath();
        ctx.ellipse(x + 16, y + 20, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        break;
      default:
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(x, y, s, s);
    }
  }

  /* ---------------- 角色 ---------------- */
  // 大卫：牧童，棕发、米色短袍，腰间投石索
  function david(ctx, x, y, scale, facing, frame) {
    const b = (c, r, w, h, col) => blk(ctx, x, y, scale, c, r, w, h, col);
    const step = frame ? 1 : 0;
    // 头发
    b(5, 1, 6, 2, '#6b4a2b'); b(4, 2, 8, 2, '#6b4a2b');
    // 脸
    b(5, 3, 6, 3, '#e8b88a');
    // 眼睛（按朝向左右偏移）
    const ex = facing === 'left' ? 5 : facing === 'right' ? 7 : 6;
    b(ex, 4, 1, 1, '#2a1c10'); b(ex + 2, 4, 1, 1, '#2a1c10');
    // 短袍身体
    b(4, 6, 8, 6, '#d9c08a'); b(4, 6, 8, 1, '#c2a86f');
    // 腰带
    b(4, 9, 8, 1, '#7a5230');
    // 手臂
    b(3, 6, 1, 4, '#e8b88a'); b(12, 6, 1, 4, '#e8b88a');
    // 投石索（右手一团）
    b(12, 9, 2, 2, '#efe8d8');
    // 腿（行走交替）
    b(5, 12, 2, 3 + step, '#caa06f'); b(9, 12, 2, 3 - step, '#caa06f');
    // 鞋
    b(5, 14 + step, 2, 1, '#5a3b22'); b(9, 14 - step, 2, 1, '#5a3b22');
  }

  // 父亲耶西：长袍、白须
  function jesse(ctx, x, y, scale) {
    const b = (c, r, w, h, col) => blk(ctx, x, y, scale, c, r, w, h, col);
    b(5, 0, 6, 2, '#8a8a8a');             // 头巾
    b(4, 1, 8, 2, '#6f6f6f');
    b(5, 3, 6, 3, '#e0b083');             // 脸
    b(6, 4, 1, 1, '#2a1c10'); b(9, 4, 1, 1, '#2a1c10');
    b(5, 6, 6, 1, '#cfcfcf');             // 胡须
    b(4, 6, 8, 8, '#7d6a9c');             // 长袍
    b(4, 6, 8, 1, '#6a5888');
    b(3, 7, 1, 4, '#e0b083'); b(12, 7, 1, 4, '#e0b083');
    b(5, 14, 6, 1, '#5a3b22');            // 袍角
  }

  // 羊
  function sheep(ctx, x, y, scale) {
    const b = (c, r, w, h, col) => blk(ctx, x, y, scale, c, r, w, h, col);
    b(3, 5, 10, 6, '#f3efe6');            // 羊毛身体
    b(2, 5, 2, 5, '#e8e2d4'); b(12, 5, 2, 5, '#e8e2d4');
    b(11, 4, 4, 4, '#dcd2bf');            // 头
    b(10, 5, 1, 3, '#3a3a3a'); b(15, 6, 1, 2, '#3a3a3a'); // 耳/脸
    b(12, 5, 1, 1, '#2a2a2a');            // 眼
    b(4, 11, 2, 2, '#777'); b(10, 11, 2, 2, '#777'); // 腿
  }

  // 猛狮（战斗大图用 scale 放大）
  function lion(ctx, x, y, scale, hurt) {
    const b = (c, r, w, h, col) => blk(ctx, x, y, scale, c, r, w, h, col);
    const body = hurt ? '#c97a3a' : '#d89a4a';
    const mane = hurt ? '#7a4a1f' : '#8a5a25';
    b(3, 9, 11, 5, body);                 // 身体
    b(2, 12, 2, 3, body); b(12, 12, 2, 3, body); // 腿
    b(13, 6, 4, 1, body);                 // 尾巴根
    b(2, 2, 8, 8, mane);                  // 鬃毛
    b(3, 3, 6, 6, body);                  // 脸
    b(4, 4, 1, 1, '#2a1c10'); b(7, 4, 1, 1, '#2a1c10'); // 眼
    b(5, 6, 2, 1, '#7a4a1f');             // 鼻
    b(4, 7, 1, 1, '#fff'); b(7, 7, 1, 1, '#fff'); // 獠牙
  }

  return { tile, david, jesse, sheep, lion };
})();
