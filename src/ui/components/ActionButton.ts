import { Container, Graphics, Text } from 'pixi.js';

export type ButtonState = 'available' | 'disabled' | 'purchased';

export class ActionButton extends Container {
  private bg: Graphics;
  private labelText: Text;
  private costText: Text;
  private checkmark: Text;
  private _state: ButtonState = 'available';
  private _urgent = false;
  private urgentGlow: Graphics;
  private btnWidth: number;
  private btnHeight: number;
  private baseColor: number;

  constructor(
    label: string,
    width: number,
    height: number,
    color: number,
    onClick: () => void,
  ) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.btnWidth = width;
    this.btnHeight = height;
    this.baseColor = color;

    this.urgentGlow = new Graphics();
    this.urgentGlow.visible = false;
    this.addChild(this.urgentGlow);

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.labelText = new Text({
      text: label,
      style: {
        fontFamily: 'monospace',
        fontSize: Math.min(height * 0.38, 30),
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.labelText.anchor.set(0.5);
    this.labelText.x = width / 2;
    this.labelText.y = height * 0.35;
    this.addChild(this.labelText);

    this.costText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: Math.min(height * 0.28, 22),
        fill: 0xdddddd,
      },
    });
    this.costText.anchor.set(0.5);
    this.costText.x = width / 2;
    this.costText.y = height * 0.68;
    this.addChild(this.costText);

    // Checkmark for purchased state
    this.checkmark = new Text({
      text: '✓',
      style: {
        fontFamily: 'monospace',
        fontSize: Math.min(height * 0.5, 32),
        fill: 0x66ff66,
        fontWeight: 'bold',
      },
    });
    this.checkmark.anchor.set(0.5);
    this.checkmark.x = width - 30;
    this.checkmark.y = height * 0.4;
    this.checkmark.visible = false;
    this.addChild(this.checkmark);

    this.drawCurrentState();

    this.on('pointerdown', () => {
      if (this._state === 'available') {
        this.scale.set(0.95);
        onClick();
      }
    });
    this.on('pointerup', () => {
      this.scale.set(1);
    });
    this.on('pointerupoutside', () => {
      this.scale.set(1);
    });
  }

  private drawCurrentState(): void {
    const w = this.btnWidth;
    const h = this.btnHeight;

    this.bg.clear();

    switch (this._state) {
      case 'available':
        // Bright, saturated fill with a lighter top highlight
        this.bg.roundRect(0, 0, w, h, 12);
        this.bg.fill({ color: this.baseColor });
        // Top highlight strip
        this.bg.roundRect(0, 0, w, h * 0.45, 12);
        this.bg.fill({ color: 0xffffff, alpha: 0.12 });
        // Strong border
        this.bg.roundRect(0, 0, w, h, 12);
        this.bg.stroke({ color: 0xffffff, alpha: 0.35, width: 2 });
        this.alpha = 1;
        this.cursor = 'pointer';
        this.labelText.style.fill = 0xffffff;
        this.costText.style.fill = 0xeeeedd;
        this.checkmark.visible = false;
        break;

      case 'disabled':
        this.bg.roundRect(0, 0, w, h, 12);
        this.bg.fill({ color: 0x1e1e3c });
        this.bg.roundRect(0, 0, w, h, 12);
        this.bg.stroke({ color: 0x666688, alpha: 0.35, width: 1 });
        this.alpha = 0.7;
        this.cursor = 'default';
        this.labelText.style.fill = 0x8888aa;
        this.costText.style.fill = 0x777799;
        this.checkmark.visible = false;
        break;

      case 'purchased':
        this.bg.roundRect(0, 0, w, h, 12);
        this.bg.fill({ color: 0x1a2e1a });
        this.bg.roundRect(0, 0, w, h, 12);
        this.bg.stroke({ color: 0x44cc44, alpha: 0.5, width: 2 });
        this.alpha = 0.75;
        this.cursor = 'default';
        this.labelText.style.fill = 0x77cc77;
        this.costText.style.fill = 0x66aa66;
        this.checkmark.visible = true;
        break;
    }
  }

  setLabel(text: string): void {
    this.labelText.text = text;
  }

  setCost(text: string): void {
    this.costText.text = text;
  }

  setButtonState(state: ButtonState): void {
    if (this._state === state) return;
    this._state = state;
    this.drawCurrentState();
  }

  /** Backwards-compatible shorthand */
  setEnabled(enabled: boolean): void {
    this.setButtonState(enabled ? 'available' : 'disabled');
  }

  /** Toggle urgent pulsing highlight to draw attention */
  setUrgent(urgent: boolean): void {
    if (this._urgent === urgent) return;
    this._urgent = urgent;
    this.urgentGlow.visible = urgent;
  }

  /** Call each frame to animate the urgent glow */
  updateUrgentGlow(): void {
    if (!this._urgent || this._state !== 'available') {
      this.urgentGlow.visible = false;
      return;
    }
    const w = this.btnWidth;
    const h = this.btnHeight;
    const t = Date.now() * 0.005;
    const pulse = (Math.sin(t) + 1) / 2; // 0..1 smooth
    const blink = Math.sin(t * 1.8) > 0.1 ? 1 : 0.3; // sharp on/off blink
    const intensity = pulse * blink;
    const spread = 6 + pulse * 10;

    this.urgentGlow.visible = true;
    this.urgentGlow.clear();
    // Outer soft glow
    this.urgentGlow.roundRect(-spread, -spread, w + spread * 2, h + spread * 2, 16);
    this.urgentGlow.fill({ color: 0xffaa00, alpha: intensity * 0.25 });
    // Inner bright fill over the button
    this.urgentGlow.roundRect(0, 0, w, h, 12);
    this.urgentGlow.fill({ color: 0xffcc00, alpha: intensity * 0.3 });
    // Bright border
    this.urgentGlow.roundRect(-2, -2, w + 4, h + 4, 13);
    this.urgentGlow.stroke({ color: 0xffdd44, alpha: 0.5 + intensity * 0.5, width: 2 + pulse * 2 });
  }
}
