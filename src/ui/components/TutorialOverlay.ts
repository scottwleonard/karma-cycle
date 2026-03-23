import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../../config';

const STORAGE_KEY = 'kc_tutorial_done';

interface TutorialStep {
  title: string;
  body: string;
  // Highlight box in reference coords (null = no highlight)
  highlight: { x: number; y: number; w: number; h: number } | null;
  // Arrow origin offset from highlight center (null = no arrow / centered text)
  textY: number;
}

const GW = CONFIG.display.referenceWidth;   // 1080
const GH = CONFIG.display.referenceHeight;  // 1920

// tabContainer base y = mandalaY(250) + 240 = 490
// feedButton: x=30, y=490+175=665, btnW=(1080-100)/3≈326.7, h=80
// repairButton: x≈40+327=367, y=665
// upgradeSection: y≈490+175+125=790
const TAB_Y = 490;
const BTN_Y = TAB_Y + 175;
const BTN_W = (GW - 100) / 3;
const BTN_H = 80;
const UPGRADE_Y = TAB_Y + 300;

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Karma Cycle',
    body:
      'You are a soul living many lives.\n\n' +
      'Karma  builds passively — your spiritual\n' +
      'currency carried across rebirths.\n\n' +
      'Wealth  is earned each second and spent\n' +
      'to keep your needs satisfied.\n\n' +
      'Tap anywhere to continue.',
    highlight: null,
    textY: GH / 2 - 200,
  },
  {
    title: '▲ Feed your character',
    body:
      'Press Feed to restore Hunger.\n' +
      'Low hunger drains karma and health.\n' +
      'It costs Wealth to feed — watch\n' +
      'your balance!',
    highlight: { x: 30, y: BTN_Y, w: BTN_W, h: BTN_H },
    textY: BTN_Y + BTN_H + 60,
  },
  {
    title: '▲ Repair your shelter',
    body:
      'Press Repair to restore Shelter.\n' +
      'Poor shelter also cuts your karma rate.\n' +
      'Keep both bars above 20 to stay healthy.',
    highlight: { x: 40 + BTN_W, y: BTN_Y, w: BTN_W, h: BTN_H },
    textY: BTN_Y + BTN_H + 60,
  },
  {
    title: '▼ Upgrades',
    body:
      'Scroll down to find the Upgrade shop.\n' +
      'Spend Wealth on upgrades to boost\n' +
      'karma gain, reduce costs, and unlock\n' +
      'new abilities.\n\n' +
      'Good luck on your journey!',
    highlight: { x: 30, y: UPGRADE_Y, w: GW - 60, h: 120 },
    textY: UPGRADE_Y - 260,
  },
];

export class TutorialOverlay extends Container {
  private step = 0;
  private bg: Graphics;
  private highlight: Graphics;
  private titleText: Text;
  private bodyText: Text;
  private hintText: Text;
  private panel: Graphics;

  constructor() {
    super();
    this.visible = false;
    this.eventMode = 'static';

    // Full-screen semi-transparent backdrop
    this.bg = new Graphics();
    this.addChild(this.bg);

    // Highlight border box
    this.highlight = new Graphics();
    this.addChild(this.highlight);

    // Text panel background
    this.panel = new Graphics();
    this.addChild(this.panel);

    // Title
    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 38,
        fill: 0xffd700,
        fontWeight: 'bold',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: GW - 120,
      },
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.x = GW / 2;
    this.addChild(this.titleText);

    // Body
    this.bodyText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 30,
        fill: 0xdddddd,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: GW - 120,
        lineHeight: 42,
      },
    });
    this.bodyText.anchor.set(0.5, 0);
    this.bodyText.x = GW / 2;
    this.addChild(this.bodyText);

    // Tap hint
    this.hintText = new Text({
      text: 'Tap anywhere to continue',
      style: {
        fontFamily: 'monospace',
        fontSize: 24,
        fill: 0x888888,
        align: 'center',
      },
    });
    this.hintText.anchor.set(0.5, 1);
    this.hintText.x = GW / 2;
    this.hintText.y = GH - 60;
    this.addChild(this.hintText);

    this.on('pointerdown', () => this.advance());
  }

  /** Show the tutorial if it hasn't been seen before. */
  showIfNeeded(): void {
    if (localStorage.getItem(STORAGE_KEY)) return;
    this.step = 0;
    this.visible = true;
    this.render();
  }

  /** Force-show the tutorial (e.g. from a help button). */
  showForced(): void {
    this.step = 0;
    this.visible = true;
    this.render();
  }

  private advance(): void {
    this.step++;
    if (this.step >= STEPS.length) {
      localStorage.setItem(STORAGE_KEY, '1');
      this.visible = false;
      return;
    }
    this.render();
  }

  private render(): void {
    const s = STEPS[this.step];

    // Backdrop
    this.bg.clear();
    this.bg.rect(0, 0, GW, GH);
    this.bg.fill({ color: 0x000000, alpha: 0.75 });

    // Highlight box
    this.highlight.clear();
    if (s.highlight) {
      const { x, y, w, h } = s.highlight;
      const pad = 10;
      // Bright border to make the element stand out
      this.highlight.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 14);
      this.highlight.stroke({ color: 0xffd700, alpha: 1, width: 4 });
      // Subtle golden fill
      this.highlight.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 14);
      this.highlight.fill({ color: 0xffd700, alpha: 0.08 });
    }

    // Position text block
    const panelPad = 30;
    const panelW = GW - 80;
    const panelX = 40;

    this.titleText.text = s.title;
    this.bodyText.text = s.body;

    // Lay out panel
    const titleH = this.titleText.height;
    const gap = 16;
    const bodyH = this.bodyText.height;
    const totalH = titleH + gap + bodyH + panelPad * 2;

    const panelY = s.textY;

    // Draw panel bg
    this.panel.clear();
    this.panel.roundRect(panelX, panelY, panelW, totalH, 16);
    this.panel.fill({ color: 0x1a1a4e, alpha: 0.95 });
    this.panel.roundRect(panelX, panelY, panelW, totalH, 16);
    this.panel.stroke({ color: 0xffd700, alpha: 0.5, width: 2 });

    this.titleText.y = panelY + panelPad;
    this.bodyText.y = panelY + panelPad + titleH + gap;

    // Step indicator in hint text
    const isLast = this.step === STEPS.length - 1;
    this.hintText.text = isLast
      ? 'Tap to start playing!'
      : `Tap anywhere to continue  (${this.step + 1}/${STEPS.length})`;
  }
}
