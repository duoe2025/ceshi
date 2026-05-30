# Cocos Creator 3.8 装配与构建指南

本工程把逻辑与渲染分离（见 `README.md`）。渲染组件 `GameController` 会在运行时
**自动创建所有子节点**（Graphics 画面层 + 文本层），所以你几乎不用在编辑器里摆任何东西。

---

## 1. 准备

- 安装 **Cocos Dashboard**，再安装 **Cocos Creator 3.8.x**（建议 3.8.6 LTS）。
- 发布微信小游戏还需安装 **微信开发者工具**，并用微信小游戏 AppID 登录。

## 2. 打开工程

1. 打开 Cocos Dashboard → **Project → Open** → 选择本仓库根目录（含 `package.json`）。
2. 首次打开时编辑器会生成 `library/`、`temp/`、`settings/` 等本地目录（已在 `.gitignore` 中忽略），
   并为 `assets/` 下的脚本自动生成 `.meta`。

## 3. 设置设计分辨率（可选但推荐）

**Project → Project Settings → Project Data**（或 Canvas 的 `ResolutionPolicy`）里把
设计分辨率设为 **800 × 576**，适配策略选 `SHOW_ALL`。游戏内部逻辑也按 800×576 计算。

## 4. 装配场景（约 1 分钟）

1. 在 **Assets** 面板 `assets/scenes/` 上右键 → **Create → Scene**，命名 `Game`，双击打开。
   - 新场景会自动带一个 **Canvas**（内含 Camera）。
2. 右键 **Canvas** → **Create → Empty Node**，命名 `Game`。
3. 选中 `Game` 节点 → Inspector 面板 **Add Component → Custom Script → GameController**。
4. 顶部点 **▶（Play On Device / Preview）** 或 `Ctrl/Cmd + P` 预览。

> 不需要手动添加 Graphics / Label —— `GameController` 在 `onLoad` 里自建。
> 只要保证 `Game` 节点在 **Canvas** 之下即可（这样才在 2D UI 渲染管线内）。

## 5. 运行 / 操作

| 操作 | 键位 |
|---|---|
| 移动 | 方向键 / WASD |
| 攻击（可按住边跑边打） | J / 空格 |
| 切换武器 | 1 / 2 / 3（K 循环） |
| 对话推进 / 与父亲交谈 | 空格 / 回车（移动端：点屏幕） |
| 任务日志 | Q |
| 通关后重开 | R |

## 6. 构建微信小游戏

1. **Project → Build**（或菜单 **Menu → Project → Build**）。
2. **Platform** 选 **微信小游戏（WeChat Mini Game）**。
3. 填入微信小游戏 **AppID**（测试可用 `wxidtest...` 占位，正式发布需真实 AppID）。
4. 点 **Build**，完成后点 **Run** 或 **打开生成目录** → 用「微信开发者工具」打开
   `build/wechatgame/` 目录预览、上传。

其他平台同理：在 Build 面板切换 Platform 即可（H5 选 **Web Mobile/Web Desktop**，
原生选 **Android / iOS**）。一套代码多平台发布。

## 7. 移动端触摸（扩展点）

当前触摸已支持「点屏幕推进对白 / 通关后重开」。完整的移动端操作（虚拟摇杆 + 攻击键 +
武器切换）建议这样加：

- 在 `GameController` 里再建几个 UI 节点作为虚拟按钮/摇杆，监听
  `Input.EventType.TOUCH_START / TOUCH_MOVE / TOUCH_END`；
- 摇杆把方向换算后调用 `core.setMove(dir, bool)`，攻击键调用 `core.setAttack(bool)`，
  武器键调用 `core.setWeapon(id)`。

逻辑核心已经把这些输入入口都暴露好了，加触摸 UI 不需要动 `core/`。

## 8. 架构与扩展新关卡

- **改数据不改逻辑**：地图、敌人属性、武器数值、对白都在 `assets/scripts/core/GameData.ts`。
  做新关卡通常只改这里 + `GameCore` 的任务分支。
- **核心可无头验证**：改完逻辑后在 `tools/` 跑一遍自测（见 `README.md`），
  不用打开编辑器就能确认关卡流程没被改坏。
- **渲染层很薄**：`GameController` 只读取 `core` 状态来画，`Sprites.ts` 负责像素外观。
  想换成图片素材 / 瓦片地图（TileMap）时，只替换渲染层，逻辑核心不动。

## 常见问题

- **打开后脚本报红 / 找不到模块**：等编辑器把 `assets/` 导入完成并生成 `.meta` 后，
  在 **Developer → Cache → Clear** 或重启编辑器即可。
- **画面是空的**：确认 `Game` 节点挂了 `GameController` 且位于 **Canvas** 之下；
  确认场景里有 Camera（新建场景默认有）。
- **中文不显示**：`Label` 默认用系统字体；个别平台需在工程里挂一个含中文字形的字体资源，
  把 `GameController.mkLabel` 里 `useSystemFont` 改为指定 `font`。
