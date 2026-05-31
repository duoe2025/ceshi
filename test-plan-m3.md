# M3 Multi-Scene World Hub — E2E Test Plan

## What Changed (M3)
The game now boots into a **WorldMapScene hub** (not directly into chapter 1). Players see a world map with interconnected nodes representing game chapters. They click unlocked nodes to enter scenes and press **M** to return. State persists across scene switches via a shared `WorldEngine`.

## Test Environment
- **URL**: https://html5-lqwnpzbt.devinapps.com
- **Browser**: Chrome (desktop)
- **No credentials needed** (public static frontend)

## Primary Flow: Hub → Chapter 1 → Return → Wilderness → Return

### Test 1: Hub Renders Correctly on Boot
**Actions**: Load the URL. Wait for the game canvas to appear.
**Pass criteria**:
- Title text "大卫一生 · 互通大世界" visible at top center
- Bottom hint text "点击发光节点进入地图 · 地图内按 M 返回本世界地图" visible
- At least 3 node circles visible with names underneath (伯利恒·牧场, 旷野·探索, 以拉谷·歌利亚)
- Unlocked nodes (伯利恒, 旷野) appear in color; locked nodes (以拉谷) appear gray with 🔒
- Lines connecting nodes are visible

**Broken-detection**: If scene list is wrong or WorldMapScene is not first, the game boots directly into the chapter 1 pasture map instead of the hub — visually very different (green grass tiles vs dark hub).

### Test 2: Click Locked Node Shows "尚未解锁" Flash
**Actions**: Click on the gray 以拉谷 node circle.
**Pass criteria**:
- A yellow flash message appears at bottom containing "尚未解锁"
- The scene does NOT change (hub remains visible)

**Broken-detection**: If unlock gating is broken, clicking would switch scenes or crash. The flash message text is hardcoded in WorldMapScene.ts:144.

### Test 3: Enter Chapter 1 (伯利恒·牧场)
**Actions**: Click the green 伯利恒·牧场 node circle.
**Pass criteria**:
- Scene switches to WorldScene: green pasture tilemap renders with David (pixel character) visible
- HUD visible (HP bar, weapon icons at bottom)
- NPC (Father Jesse) and/or sheep visible on the map
- The hub is no longer visible

**Broken-detection**: If scene.start or WorldEngine.enter fails, the hub stays visible or a black screen appears.

### Test 4: M Key Returns to Hub from Chapter 1
**Actions**: Press M key while in the chapter 1 pasture scene.
**Pass criteria**:
- Scene switches back to WorldMapScene hub
- Title "大卫一生 · 互通大世界" reappears
- Node circles reappear
- 伯利恒 node should now show as "visited" (not locked, not showing 🔒)

**Broken-detection**: If M key handler or returnToMap is broken, pressing M does nothing — player stays in chapter 1.

### Test 5: Enter Wilderness (旷野·探索) and Move
**Actions**: From the hub, click the tan 旷野·探索 node circle.
**Pass criteria**:
- Scene switches to FieldScene: darker green/brown wilderness tilemap renders
- A pixel David character is visible
- Press Right arrow — David moves rightward (position changes frame over frame)
- Camera scrolls to follow David (background tiles shift left)
- Trees/rocks visible as terrain obstacles

**Broken-detection**: If FieldScene keyboard mapping is broken (the bug we fixed with addKeys), David won't move at all — position stays static. If camera setBounds is wrong, camera might show black areas or not follow.

### Test 6: M Key Returns to Hub from Wilderness
**Actions**: Press M key while in the wilderness scene.
**Pass criteria**:
- Scene switches back to WorldMapScene hub
- Hub title and all nodes visible again
- 旷野 node now shows as "visited"

**Broken-detection**: If FieldScene's M handler is missing, pressing M does nothing.

### Test 7: Console Error Check
**Actions**: Open browser console after completing the full flow above.
**Pass criteria**:
- No uncaught errors or exceptions during any scene transition
- No "Cannot read property" errors (which would indicate broken key mappings or missing objects)

**Broken-detection**: The original FieldScene keyboard bug produced "Cannot read property 'isDown' of undefined" every frame — console errors are the primary signal of broken input.

## Recording Plan
One continuous recording covering Tests 1-7 in sequence. Annotate each test transition point.
