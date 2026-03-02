import { Container, Graphics } from 'pixi.js';
import { CONFIG } from '../../config';

export class Panel extends Container {
  private bg: Graphics;

  constructor(width: number, height: number, radius = 16) {
    super();
    this.bg = new Graphics();
    this.drawBg(width, height, radius);
    this.addChild(this.bg);
  }

  private drawBg(width: number, height: number, radius: number): void {
    this.bg.clear();
    this.bg.roundRect(0, 0, width, height, radius);
    this.bg.fill({ color: CONFIG.display.panelColor, alpha: CONFIG.display.panelAlpha });
  }

  resize(width: number, height: number, radius = 16): void {
    this.drawBg(width, height, radius);
  }
}
