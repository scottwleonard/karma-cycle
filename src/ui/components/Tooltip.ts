import { Container, Graphics, Text } from 'pixi.js';

const WIDTH = 440;
const PADDING = 14;
const REF_W = 1080;
const REF_H = 1920;

/** A simple floating tooltip for hover/pointer-over help text. */
export class Tooltip extends Container {
  private bg: Graphics;
  private body: Text;

  constructor() {
    super();
    this.visible = false;
    this.eventMode = 'none'; // never intercept pointer events

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.body = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 19,
        fill: 0xddddee,
        wordWrap: true,
        wordWrapWidth: WIDTH - PADDING * 2,
        lineHeight: 27,
      },
    });
    this.body.x = PADDING;
    this.body.y = PADDING;
    this.addChild(this.body);
  }

  /** Show the tooltip near (anchorX, anchorY) in the parent container's coordinate space. */
  show(text: string, anchorX: number, anchorY: number): void {
    this.body.text = text;

    const h = this.body.height + PADDING * 2;

    this.bg.clear();
    this.bg.roundRect(0, 0, WIDTH, h, 10);
    this.bg.fill({ color: 0x101042 });
    this.bg.roundRect(0, 0, WIDTH, h, 10);
    this.bg.stroke({ color: 0xffd700, alpha: 0.65, width: 1.5 });

    // Show below anchor; flip above if near the bottom of the screen
    const showBelow = anchorY < REF_H * 0.72;
    const ty = showBelow ? anchorY + 10 : anchorY - h - 10;

    // Centre on anchor X, clamped to screen edges
    const tx = Math.max(8, Math.min(REF_W - WIDTH - 8, anchorX - WIDTH / 2));

    this.x = tx;
    this.y = ty;
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
