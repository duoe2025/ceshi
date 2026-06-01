# assets/ — 图片素材规范

游戏的图片渲染管线见 [`js/assets.js`](../js/assets.js)。原则：**有图片就用图片，缺图片自动回退到 `js/sprites.js` 的程序化绘制**，所以任何文件缺失都不会让游戏崩溃。

当前仓库内的 `tileset.png` / `david.png` 是 **占位图(programmer art)**，由 [`_gen_placeholder.py`](./_gen_placeholder.py) 生成，仅用于跑通管线。请用真美术按下面的布局**同名替换**，无需改任何代码。

## 通用要求
- **真·透明 PNG**（RGBA，alpha 通道），不要白底 / 米底 / 棋盘格填充。
- **固定网格、等格、无间距**：每格像素见下表（默认 48×48）。
- 源格尺寸可自定（在 `js/assets.js` 的 `manifest.*.cell` 改），绘制时会自动缩放到世界 `TILE`(=32)，所以美术分辨率与世界网格解耦。

## tileset.png（瓦片图集）
6 列 × 2 行，每格 **48×48**，共 288×96（替换时尺寸可按 `cell` 等比放大）。

| | 列0 | 列1 | 列2 | 列3 | 列4 | 列5 |
|---|---|---|---|---|---|---|
| **行0** | 草地 GRASS | 高草 TGRASS | 花 FLOWER | 小路 PATH | 羊圈地 FOLD | 山丘 HILL |
| **行1** | 树 TREE | 石 ROCK | 篱笆 FENCE | 水井 WELL | 房屋 HOUSE | 山洞 CAVE |

- 地面类（行0）应铺满整格；物体类（行1，树/石/井/房/洞）建议**自带一层草地底 + 物体**，因为它们会替换整格。
- 瓦片类型 → [列, 行] 的映射在 `js/assets.js` 的 `manifest.tileset.map`，新增瓦片改这里即可。

## david.png（角色精灵表）
2 列 × 4 行，每格 **48×48**，共 96×192。

| 行 | 含义 | 列0 | 列1 |
|---|---|---|---|
| 行0 | 朝下 down | 行走帧0 | 行走帧1 |
| 行1 | 朝左 left | 行走帧0 | 行走帧1 |
| 行2 | 朝右 right | 行走帧0 | 行走帧1 |
| 行3 | 朝上 up | 行走帧0 | 行走帧1 |

- 朝向行映射在 `manifest.david.dirRow`；行走帧列在 `manifest.david.walkCols`。
- 每帧**脚底位置应一致**，否则行走时会抖动。
- 想加更多动作（攻击/弹琴等）：在 `manifest.david` 增列并在 `js/assets.js` 的 `drawDavid` 里按战斗状态选列即可。

## 想扩展到更多对象（羊 / 耶西 / 狮子 / 邪灵）
目前这些仍走程序化绘制。按相同模式在 `manifest` 增条目、在 `js/assets.js` 加一个 `drawXxx()`，并在 `js/game.js` 的渲染处用「`if (!Assets.drawXxx(...)) Sprites.xxx(...)`」接上即可。
