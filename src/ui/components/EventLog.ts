import { Container, Graphics, Text } from 'pixi.js';
import type { EventSeverity } from '../../systems/lifeEventsSystem';

interface LogEntry {
  text: Text;
  age: number;
}

const SEVERITY_COLORS: Record<EventSeverity, number> = {
  positive: 0x99dd99,
  neutral: 0xaaaaaa,
  negative: 0xdd7777,
};

const MAX_VISIBLE = 6;
const ENTRY_HEIGHT = 38;
const FADE_START = 8; // seconds before entry starts fading
const FADE_DURATION = 4; // seconds to fully fade out

export class EventLog extends Container {
  private entries: LogEntry[] = [];
  private logContainer: Container;
  private bg: Graphics;
  private logWidth: number;
  private clipMask: Graphics;

  constructor(width: number, height: number) {
    super();
    this.logWidth = width;

    // Background panel
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, width, height, 8);
    this.bg.fill({ color: 0x111138, alpha: 0.75 });
    this.bg.roundRect(0, 0, width, height, 8);
    this.bg.stroke({ color: 0x5555aa, alpha: 0.5, width: 1 });
    this.addChild(this.bg);

    // Scrollable container for entries
    this.logContainer = new Container();
    this.logContainer.x = 10;
    this.logContainer.y = 8;
    this.addChild(this.logContainer);

    // Mask to clip entries within the panel
    this.clipMask = new Graphics();
    this.clipMask.rect(0, 8, width, height - 8);
    this.clipMask.fill({ color: 0xffffff });
    this.addChild(this.clipMask);
    this.logContainer.mask = this.clipMask;
  }

  addEntry(message: string, severity: EventSeverity, color?: number): void {
    const resolvedColor = color ?? SEVERITY_COLORS[severity];

    const text = new Text({
      text: message,
      style: {
        fontFamily: 'monospace',
        fontSize: 24,
        fill: resolvedColor,
        wordWrap: true,
        wordWrapWidth: this.logWidth - 20,
      },
    });

    const entry: LogEntry = { text, age: 0 };

    // Add to top (newest first)
    this.entries.unshift(entry);
    this.logContainer.addChild(text);

    // Remove oldest entries if we have too many
    while (this.entries.length > MAX_VISIBLE * 2) {
      const old = this.entries.pop()!;
      this.logContainer.removeChild(old.text);
      old.text.destroy();
    }

    this.layoutEntries();
  }

  private layoutEntries(): void {
    let y = 0;
    for (const entry of this.entries) {
      entry.text.y = y;
      // Each entry can be multi-line — measure actual height
      const h = Math.max(ENTRY_HEIGHT, entry.text.height + 4);
      y += h;
    }
  }

  animate(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.age += dt;

      // Fade out old entries
      if (entry.age > FADE_START) {
        const fadeProgress = (entry.age - FADE_START) / FADE_DURATION;
        entry.text.alpha = Math.max(0, 1 - fadeProgress);

        if (fadeProgress >= 1) {
          this.logContainer.removeChild(entry.text);
          entry.text.destroy();
          this.entries.splice(i, 1);
          this.layoutEntries();
        }
      }
    }
  }

  clear(): void {
    for (const entry of this.entries) {
      this.logContainer.removeChild(entry.text);
      entry.text.destroy();
    }
    this.entries = [];
  }
}
