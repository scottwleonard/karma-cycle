import { Container, Graphics, Text } from 'pixi.js';
import { lerpColor } from '../../utils/math';

const COLOR_GREEN = 0x4caf50;
const COLOR_YELLOW = 0xffeb3b;
const COLOR_RED = 0xf44336;

export class NeedBar extends Container {
  private bg: Graphics;
  private fill: Graphics;
  private nameLabel: Text;
  private valueLabel: Text;
  private barWidth: number;
  private barHeight: number;

  constructor(name: string, width: number, height = 32) {
    super();
    this.barWidth = width;
    this.barHeight = height;

    this.nameLabel = new Text({
      text: name,
      style: {
        fontFamily: 'monospace',
        fontSize: height * 0.7,
        fill: 0xeeeeee,
        fontWeight: 'bold',
      },
    });
    this.addChild(this.nameLabel);

    const barX = 160;
    const actualBarWidth = width - barX - 60;

    this.bg = new Graphics();
    this.bg.roundRect(barX, 2, actualBarWidth, height - 4, 4);
    this.bg.fill({ color: 0x1a1a2e });
    this.bg.roundRect(barX, 2, actualBarWidth, height - 4, 4);
    this.bg.stroke({ color: 0x555577, alpha: 0.4, width: 1 });
    this.addChild(this.bg);

    this.fill = new Graphics();
    this.fill.x = barX;
    this.fill.y = 2;
    this.addChild(this.fill);

    this.valueLabel = new Text({
      text: '100%',
      style: {
        fontFamily: 'monospace',
        fontSize: height * 0.6,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.valueLabel.x = width - 55;
    this.valueLabel.y = 4;
    this.addChild(this.valueLabel);
  }

  updateValue(value: number): void {
    const pct = Math.max(0, Math.min(100, value)) / 100;
    const barX = 160;
    const actualBarWidth = this.barWidth - barX - 60;
    const fillWidth = actualBarWidth * pct;

    // Color interpolation
    let color: number;
    if (pct > 0.6) {
      color = COLOR_GREEN;
    } else if (pct > 0.2) {
      const t = (pct - 0.2) / 0.4;
      color = lerpColor(COLOR_RED, COLOR_YELLOW, t);
    } else {
      color = COLOR_RED;
    }

    this.fill.clear();
    if (fillWidth > 0) {
      this.fill.roundRect(0, 0, fillWidth, this.barHeight - 4, 4);
      this.fill.fill({ color });
    }

    this.valueLabel.text = `${Math.floor(value)}%`;

    // Pulse warning when critical
    if (pct < 0.2) {
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.05;
      this.scale.set(pulse, 1);
    } else {
      this.scale.set(1, 1);
    }
  }
}
