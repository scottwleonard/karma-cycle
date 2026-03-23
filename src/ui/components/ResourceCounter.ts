import { Container, Text } from 'pixi.js';
import { formatNumber, formatRate } from '../../utils/format';

export class ResourceCounter extends Container {
  private labelText: Text;
  private valueText: Text;
  private rateText: Text;

  constructor(label: string, color: number, fontSize = 48) {
    super();

    this.labelText = new Text({
      text: label,
      style: {
        fontFamily: 'monospace',
        fontSize: fontSize * 0.6,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.addChild(this.labelText);

    this.valueText = new Text({
      text: '0',
      style: {
        fontFamily: 'monospace',
        fontSize: fontSize,
        fill: color,
        fontWeight: 'bold',
      },
    });
    this.valueText.y = fontSize * 0.6 + 4;
    this.addChild(this.valueText);

    this.rateText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: fontSize * 0.4,
        fill: 0xaaaaaa,
      },
    });
    this.rateText.y = fontSize * 0.6 + fontSize + 8;
    this.addChild(this.rateText);
  }

  updateValue(value: number, rate?: number): void {
    this.valueText.text = formatNumber(value);
    if (rate !== undefined) {
      if (rate < 0) {
        this.rateText.text = '-' + formatRate(Math.abs(rate));
        this.rateText.style.fill = 0xff4466;
      } else {
        this.rateText.text = formatRate(rate);
        this.rateText.style.fill = 0xbbdd99;
      }
    }
  }
}
