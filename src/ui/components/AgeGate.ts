import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../../config';

const STORAGE_KEY = 'kc_age_verified';
const GW = CONFIG.display.referenceWidth;   // 1080
const GH = CONFIG.display.referenceHeight;  // 1920

/**
 * Shows a one-time age verification screen.
 * Returns a Promise that resolves when the user confirms they are 18+.
 * If already verified (stored in localStorage), resolves immediately.
 */
export function showAgeGate(stage: Container): Promise<void> {
  if (localStorage.getItem(STORAGE_KEY)) return Promise.resolve();

  return new Promise((resolve) => {
    const overlay = new Container();
    overlay.eventMode = 'static';
    stage.addChild(overlay);

    // Dark backdrop
    const bg = new Graphics();
    bg.rect(0, 0, GW, GH);
    bg.fill({ color: 0x000000, alpha: 0.97 });
    overlay.addChild(bg);

    // Panel
    const panelW = GW - 120;
    const panelX = 60;
    const panelY = GH / 2 - 320;
    const panelH = 640;
    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 20);
    panel.fill({ color: 0x0a0a2e, alpha: 1 });
    panel.roundRect(panelX, panelY, panelW, panelH, 20);
    panel.stroke({ color: 0xffd700, alpha: 0.8, width: 3 });
    overlay.addChild(panel);

    // Title
    const title = new Text({
      text: 'Age Verification',
      style: {
        fontFamily: 'monospace',
        fontSize: 48,
        fill: 0xffd700,
        fontWeight: 'bold',
        align: 'center',
      },
    });
    title.anchor.set(0.5, 0);
    title.x = GW / 2;
    title.y = panelY + 50;
    overlay.addChild(title);

    // Body text
    const body = new Text({
      text:
        'Karma Cycle contains themes of\n' +
        'life, death, and mature content.\n\n' +
        'You must be 18 or older to play.',
      style: {
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0xdddddd,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: panelW - 80,
        lineHeight: 48,
      },
    });
    body.anchor.set(0.5, 0);
    body.x = GW / 2;
    body.y = panelY + 140;
    overlay.addChild(body);

    // "I am 18+" confirm button
    const btnW = panelW - 80;
    const btnH = 100;
    const btnX = panelX + 40;
    const confirmBtnY = panelY + panelH - 260;

    const confirmBtn = new Graphics();
    confirmBtn.roundRect(btnX, confirmBtnY, btnW, btnH, 14);
    confirmBtn.fill({ color: 0xffd700, alpha: 1 });
    confirmBtn.eventMode = 'static';
    confirmBtn.cursor = 'pointer';
    overlay.addChild(confirmBtn);

    const confirmLabel = new Text({
      text: 'I am 18 or older — Enter',
      style: {
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0x0a0a2e,
        fontWeight: 'bold',
        align: 'center',
      },
    });
    confirmLabel.anchor.set(0.5, 0.5);
    confirmLabel.x = btnX + btnW / 2;
    confirmLabel.y = confirmBtnY + btnH / 2;
    overlay.addChild(confirmLabel);

    // "I am under 18" exit button
    const exitBtnY = confirmBtnY + btnH + 30;

    const exitBtn = new Graphics();
    exitBtn.roundRect(btnX, exitBtnY, btnW, btnH, 14);
    exitBtn.fill({ color: 0x1a1a4e, alpha: 1 });
    exitBtn.stroke({ color: 0xffd700, alpha: 0.4, width: 2 });
    exitBtn.eventMode = 'static';
    exitBtn.cursor = 'pointer';
    overlay.addChild(exitBtn);

    const exitLabel = new Text({
      text: 'I am under 18 — Exit',
      style: {
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0x888888,
        align: 'center',
      },
    });
    exitLabel.anchor.set(0.5, 0.5);
    exitLabel.x = btnX + btnW / 2;
    exitLabel.y = exitBtnY + btnH / 2;
    overlay.addChild(exitLabel);

    // Confirm handler
    confirmBtn.on('pointerdown', () => {
      localStorage.setItem(STORAGE_KEY, '1');
      stage.removeChild(overlay);
      resolve();
    });

    // Exit handler — redirect away
    exitBtn.on('pointerdown', () => {
      window.location.replace('https://www.google.com');
    });
  });
}
