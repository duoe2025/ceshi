/* 仅用于在沙盒里对引擎适配层做语法/自有模块类型检查的 'cc' 桩声明。
 * 真实类型由 Cocos Creator 编辑器在打开工程时提供，这里一律按 any 处理。 */
declare module 'cc' {
  export const _decorators: any;
  export class Component { node: any; }
  export class Node { constructor(name?: string); layer: any; addComponent(c: any): any; getComponent(c: any): any; addChild(n: any): void; setPosition(x: number, y: number, z: number): void; active: boolean; }
  export class Graphics { clear(): void; rect(x: number, y: number, w: number, h: number): void; circle(x: number, y: number, r: number): void; ellipse(x: number, y: number, rx: number, ry: number): void; arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw?: boolean): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; close(): void; fill(): void; stroke(): void; fillColor: any; strokeColor: any; lineWidth: number; }
  export class Label { string: string; fontSize: number; lineHeight: number; color: any; useSystemFont: boolean; horizontalAlign: any; verticalAlign: any; overflow: any; enableWrapText: boolean; node: any; static HorizontalAlign: any; static VerticalAlign: any; static Overflow: any; }
  export class UITransform { setAnchorPoint(x: number, y: number): void; setContentSize(w: number, h: number): void; }
  export class Color { constructor(r?: number, g?: number, b?: number, a?: number); fromHEX(s: string): Color; }
  export const Layers: any;
  export const input: any;
  export const Input: any;
  export class EventKeyboard { keyCode: any; }
  export const KeyCode: any;
  export class EventTouch {}
  export class Vec3 { constructor(x?: number, y?: number, z?: number); x: number; y: number; z: number; }
}
