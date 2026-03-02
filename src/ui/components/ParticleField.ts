import { Container, Graphics } from 'pixi.js';

interface Particle {
  graphic: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const KARMA_COLORS = [0xffd700, 0xffcc00, 0xffe066, 0xffaa00, 0xfff5cc];
const BURST_COLORS = [0xffffff, 0xffd700, 0xffee88, 0x88eeff, 0xbb88ff];

export class ParticleField extends Container {
  private particles: Particle[] = [];
  private spawnRate = 2;
  private spawnAccum = 0;
  private fieldWidth: number;

  constructor(width: number, _height: number) {
    super();
    this.fieldWidth = width;
  }

  setSpawnRate(karmaPerSecond: number): void {
    this.spawnRate = Math.min(3 + karmaPerSecond * 5, 50);
  }

  /** Spawn a burst of particles (e.g., on upgrade purchase) */
  burst(count: number, color?: number): void {
    for (let i = 0; i < count; i++) {
      const c = color || BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
      this.spawnParticle(c, true);
    }
  }

  animate(dt: number): void {
    // Spawn new particles
    this.spawnAccum += this.spawnRate * dt;
    while (this.spawnAccum >= 1) {
      this.spawnParticle();
      this.spawnAccum -= 1;
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.removeChild(p.graphic);
        p.graphic.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      p.graphic.x += p.vx * dt;
      p.graphic.y += p.vy * dt;
      // Fade out in last 40% of life
      const ratio = p.life / p.maxLife;
      p.graphic.alpha = ratio < 0.4 ? (ratio / 0.4) * 0.7 : 0.7;
    }
  }

  private spawnParticle(color?: number, isBurst = false): void {
    const g = new Graphics();
    const size = isBurst ? (3 + Math.random() * 6) : (2 + Math.random() * 5);
    const c = color || KARMA_COLORS[Math.floor(Math.random() * KARMA_COLORS.length)];
    g.circle(0, 0, size);
    g.fill({ color: c, alpha: 0.7 });

    g.x = (Math.random() - 0.5) * this.fieldWidth * 0.6;
    g.y = 0;

    const maxLife = isBurst ? (1 + Math.random() * 1.5) : (1.5 + Math.random() * 2.5);
    const speed = isBurst ? 1.8 : 1;
    const particle: Particle = {
      graphic: g,
      vx: (Math.random() - 0.5) * 60 * speed,
      vy: -(40 + Math.random() * 80) * speed,
      life: maxLife,
      maxLife,
    };

    this.addChild(g);
    this.particles.push(particle);
  }

  clear(): void {
    for (const p of this.particles) {
      this.removeChild(p.graphic);
      p.graphic.destroy();
    }
    this.particles = [];
  }
}
