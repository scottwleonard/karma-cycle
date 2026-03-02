import { Container, Text } from 'pixi.js';
import { formatNumber } from '../../utils/format';

interface PopEntry {
  text: Text;
  life: number;
  maxLife: number;
  vy: number;
  vx: number;
  startScale: number;
}

export class NumberPopManager extends Container {
  private pops: PopEntry[] = [];

  spawn(value: number, color = 0xffd700): void {
    const prefix = value >= 0 ? '+' : '';
    const absVal = Math.abs(value);
    // Larger font for bigger numbers
    const fontSize = Math.min(28 + Math.log2(1 + absVal) * 4, 52);

    const text = new Text({
      text: prefix + formatNumber(value),
      style: {
        fontFamily: 'monospace',
        fontSize,
        fill: color,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    text.anchor.set(0.5);
    text.x = (Math.random() - 0.5) * 160;
    text.y = 0;

    const maxLife = 2.0;
    const entry: PopEntry = {
      text,
      life: maxLife,
      maxLife,
      vy: -(60 + Math.random() * 50),
      vx: (Math.random() - 0.5) * 40,
      startScale: 1.4,
    };

    this.addChild(text);
    this.pops.push(entry);
  }

  animate(dt: number): void {
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.removeChild(p.text);
        p.text.destroy();
        this.pops.splice(i, 1);
        continue;
      }

      p.text.y += p.vy * dt;
      p.text.x += p.vx * dt;
      // Slow down over time
      p.vy *= Math.pow(0.4, dt);
      p.vx *= Math.pow(0.3, dt);

      const ratio = p.life / p.maxLife;
      // Scale: pop in then settle
      const age = 1 - ratio;
      const scaleEase = age < 0.1 ? p.startScale * (1 - age / 0.1) + age / 0.1 : 1;
      p.text.scale.set(scaleEase);

      // Fade: stay opaque then quick fade in last 30%
      p.text.alpha = ratio < 0.3 ? ratio / 0.3 : 1;
    }
  }
}
