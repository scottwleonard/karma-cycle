import { Container, Graphics } from 'pixi.js';

const ENLIGHTENMENT_RING_CONFIGS = [
  { color: 0x88ccff, radiusMult: 1.55, alpha: 0.06 },
  { color: 0xcc88ff, radiusMult: 1.8, alpha: 0.05 },
  { color: 0xffffff, radiusMult: 2.0, alpha: 0.04 },
];

export class Mandala extends Container {
  private rings: Graphics[] = [];
  private rotationSpeed = 0.01;
  private glowRing!: Graphics;
  private mandalaRadius: number;
  private pulseScale = 0;
  private glowAlpha = 0.08;
  private targetGlowAlpha = 0.08;
  private breathPhase = 0;
  private enlightenmentRings: Graphics[] = [];
  private themeColor = 0xffd700;

  constructor(radius: number) {
    super();
    this.mandalaRadius = radius;
    this.buildMandala(radius);
  }

  /** Rebuild the mandala with a new primary color */
  setThemeColor(color: number): void {
    this.themeColor = color;
    // Remove existing mandala children (keep enlightenment rings)
    for (const ring of this.rings) {
      this.removeChild(ring);
      ring.destroy();
    }
    this.rings = [];
    this.removeChild(this.glowRing);
    this.glowRing.destroy();
    this.buildMandala(this.mandalaRadius);
    // Re-add enlightenment rings on top
    for (const r of this.enlightenmentRings) {
      this.addChildAt(r, 0);
    }
  }

  private buildMandala(radius: number): void {
    const color = this.themeColor;
    // Outer glow ring — bigger, softer
    this.glowRing = new Graphics();
    this.glowRing.circle(0, 0, radius * 1.3);
    this.glowRing.fill({ color, alpha: 0.08 });
    this.addChild(this.glowRing);

    // Multiple concentric decorative rings
    const ringCount = 5;
    for (let i = ringCount; i >= 1; i--) {
      const r = (radius * i) / ringCount;
      const ring = new Graphics();

      // Ring circle
      ring.circle(0, 0, r);
      ring.stroke({ color, alpha: 0.3 + (1 - i / ringCount) * 0.5, width: 2 });

      // Spokes on alternating rings
      if (i % 2 === 0) {
        const spokeCount = i * 4;
        for (let s = 0; s < spokeCount; s++) {
          const angle = (s / spokeCount) * Math.PI * 2;
          const innerR = r * 0.6;
          ring.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
          ring.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          ring.stroke({ color, alpha: 0.2, width: 1 });
        }
      }

      // Dots on odd rings
      if (i % 2 === 1) {
        const dotCount = i * 3;
        for (let d = 0; d < dotCount; d++) {
          const angle = (d / dotCount) * Math.PI * 2;
          ring.circle(Math.cos(angle) * r * 0.8, Math.sin(angle) * r * 0.8, 3);
          ring.fill({ color, alpha: 0.4 });
        }
      }

      this.addChild(ring);
      this.rings.push(ring);
    }

    // Center symbol (dharma wheel)
    const center = new Graphics();
    center.circle(0, 0, radius * 0.12);
    center.fill({ color, alpha: 0.8 });

    // Eight spokes of the dharma wheel
    for (let s = 0; s < 8; s++) {
      const angle = (s / 8) * Math.PI * 2;
      center.moveTo(0, 0);
      center.lineTo(
        Math.cos(angle) * radius * 0.2,
        Math.sin(angle) * radius * 0.2,
      );
      center.stroke({ color, alpha: 0.9, width: 2 });
    }
    this.addChild(center);
    this.rings.push(center);
  }

  setSpeed(karmaPerSecond: number): void {
    this.rotationSpeed = 0.005 + karmaPerSecond * 0.02;
    // Glow brightens with karma rate
    this.targetGlowAlpha = Math.min(0.05 + karmaPerSecond * 0.04, 0.35);
  }

  /** Trigger a visual pulse (e.g., on purchase or event) */
  pulse(intensity = 1): void {
    this.pulseScale = 0.15 * intensity;
  }

  /** Set enlightenment tier (0-3), adding colored glow rings */
  setEnlightenmentTier(tier: number): void {
    for (const ring of this.enlightenmentRings) {
      this.removeChild(ring);
      ring.destroy();
    }
    this.enlightenmentRings = [];

    for (let i = 0; i < Math.min(tier, ENLIGHTENMENT_RING_CONFIGS.length); i++) {
      const cfg = ENLIGHTENMENT_RING_CONFIGS[i];
      const ring = new Graphics();
      ring.circle(0, 0, this.mandalaRadius * cfg.radiusMult);
      ring.fill({ color: cfg.color, alpha: cfg.alpha });
      this.addChildAt(ring, 0);
      this.enlightenmentRings.push(ring);
    }
  }

  animate(dt: number): void {
    // Breathing glow effect
    this.breathPhase += dt * 1.5;
    const breathMod = 1 + Math.sin(this.breathPhase) * 0.15;

    // Smooth glow alpha toward target
    this.glowAlpha += (this.targetGlowAlpha - this.glowAlpha) * dt * 3;
    this.glowRing.alpha = this.glowAlpha * breathMod;

    // Enlightenment rings breathe with offset phases
    for (let i = 0; i < this.enlightenmentRings.length; i++) {
      const phase = this.breathPhase + i * 1.2;
      const cfg = ENLIGHTENMENT_RING_CONFIGS[i];
      this.enlightenmentRings[i].alpha = cfg.alpha * (1 + Math.sin(phase) * 0.3);
    }

    // Pulse decay
    if (this.pulseScale > 0.001) {
      this.pulseScale *= Math.pow(0.03, dt); // fast decay
    } else {
      this.pulseScale = 0;
    }

    // Apply scale with pulse + breath
    const baseScale = 1 + Math.sin(this.breathPhase * 0.7) * 0.01;
    const totalScale = baseScale + this.pulseScale;
    this.scale.set(totalScale);

    // Rotate alternating rings in opposite directions
    for (let i = 0; i < this.rings.length; i++) {
      const direction = i % 2 === 0 ? 1 : -1;
      const speed = this.rotationSpeed * (1 + i * 0.15);
      this.rings[i].rotation += speed * direction * dt;
    }
  }
}
