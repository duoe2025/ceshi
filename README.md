# 牧童大卫 · 第一章 Demo（Cocos Creator 3.8）

把网页版 ARPG Demo「牧童大卫」移植到 **Cocos Creator 3.8 LTS**，可一键发布到
**微信小游戏**及多平台（抖音小游戏 / H5 / Android / iOS）。

> 玩法：在像素牧场地图上实时战斗（ARPG）。三种武器——① 弹弓（远程·边跑边打）、
> ② 杖与杆（近战护羊）、③ 弹琴赞美（圣洁声波·驱邪）。流程：和父亲耶西对话 →
> 找回 3 只走失的羊 → 实时击退猛狮 → 入夜后用弹琴赞美驱散邪灵 → 通关。

---

## 工程架构：引擎无关核心 + 薄渲染层

为了方便复用与测试，逻辑与渲染完全分离：

```
assets/scripts/
├── core/                 # 纯 TypeScript 逻辑，不依赖 Cocos / DOM（可 node 直接验证）
│   ├── types.ts          #   类型定义
│   ├── GameData.ts       #   静态数据：地图、瓦片、敌人、武器、NPC、对白
│   └── GameCore.ts       #   即时战斗 / 移动碰撞 / 敌人 AI / 任务流程 / 对白状态机
├── Painter.ts            # 把「屏幕坐标」2D 绘制适配到 Cocos Graphics
├── Sprites.ts            # 程序化像素绘制（瓦片 / 角色 / 敌人，无图片资源）
└── GameController.ts     # Cocos 组件：渲染 + 键盘/触摸输入 + 接入 core
```

- **微信小游戏没有 DOM**，所以所有 UI（对白框、HUD、血条、任务日志、结算）都
  **画在画布上**，不使用任何网页元素。
- 渲染全部为**程序化绘制**，不依赖图片资源，开箱即跑。
- 核心逻辑可在 Node 下无头验证（见下文），无需打开编辑器即可回归测试关卡流程。

## 快速开始

1. 用 **Cocos Creator 3.8.x** 打开本仓库根目录（含 `package.json` 的目录）。
2. 按 [`COCOS.md`](./COCOS.md) 装配场景（约 1 分钟：新建场景 → Canvas 下加一个
   空节点 → 挂 `GameController` 组件 → 运行）。
3. 构建 → 选择 **微信小游戏** 平台 → 一键生成。

详细步骤、平台构建、移动端触摸扩展、按键说明都在 [`COCOS.md`](./COCOS.md)。

## 验证核心逻辑（无需编辑器）

`tools/` 下有一个无头自测，模拟整章流程并断言每个关键状态：

```bash
cd tools
npm install            # 安装 typescript + @types/node（仅首次）
npx tsc -p tsconfig.json
node out/tools/coretest.js
```

预期：`=== 结果：21/21 通过 ===`。

## 操作

| 操作 | 键位 |
|---|---|
| 移动 | 方向键 / WASD |
| 攻击（可按住边跑边打） | J / 空格 |
| 切换武器 | 1 / 2 / 3（或 K 循环） |
| 对话推进 / 与父亲交谈 | 空格 / 回车（触摸：点屏幕） |
| 任务日志 | Q |
| 通关后重开 | R |
