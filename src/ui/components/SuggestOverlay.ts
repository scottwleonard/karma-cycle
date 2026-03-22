import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../../config';
import { ActionButton } from './ActionButton';
import type { LayoutInfo } from '../layout';

const MAX_CHARS = 500;

export class SuggestOverlay extends Container {
  private textarea: HTMLTextAreaElement | null = null;
  private charCount: Text;
  private statusText: Text;
  private submitButton: ActionButton;
  private cancelButton: ActionButton;
  private submitted = false;
  private onSubmit: (text: string) => void;

  constructor(gameWidth: number, onSubmit: (text: string) => void) {
    super();
    this.visible = false;
    this.eventMode = 'static';
    this.onSubmit = onSubmit;

    const gh = CONFIG.display.referenceHeight;

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, gameWidth, gh);
    bg.fill({ color: 0x000000, alpha: 0.9 });
    bg.eventMode = 'static'; // block clicks through
    this.addChild(bg);

    // Title
    const title = new Text({
      text: 'Suggest a Feature',
      style: { fontFamily: 'monospace', fontSize: 48, fill: 0xffd700, fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = gameWidth / 2;
    title.y = 200;
    this.addChild(title);

    // Subtitle
    const subtitle = new Text({
      text: 'What would you like to see in Karma Cycle?',
      style: { fontFamily: 'monospace', fontSize: 24, fill: 0xcccccc },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.x = gameWidth / 2;
    subtitle.y = 270;
    this.addChild(subtitle);

    // Character count
    this.charCount = new Text({
      text: `0/${MAX_CHARS}`,
      style: { fontFamily: 'monospace', fontSize: 20, fill: 0x888888 },
    });
    this.charCount.anchor.set(1, 0);
    this.charCount.x = gameWidth / 2 + 400;
    this.charCount.y = 830;
    this.addChild(this.charCount);

    // Status text (for thank you / errors)
    this.statusText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 24, fill: 0x88ff88 },
    });
    this.statusText.anchor.set(0.5, 0);
    this.statusText.x = gameWidth / 2;
    this.statusText.y = 950;
    this.addChild(this.statusText);

    // Submit button
    this.submitButton = new ActionButton('Submit', 300, 70, 0x886622, () => {
      this.handleSubmit();
    });
    this.submitButton.x = gameWidth / 2 - 320;
    this.submitButton.y = 880;
    this.addChild(this.submitButton);

    // Cancel button
    this.cancelButton = new ActionButton('Cancel', 200, 70, 0x3a3a6e, () => {
      this.hide();
    });
    this.cancelButton.x = gameWidth / 2 + 40;
    this.cancelButton.y = 880;
    this.addChild(this.cancelButton);
  }

  show(layout: LayoutInfo): void {
    if (this.submitted) {
      this.statusText.text = 'You already submitted a suggestion this session.';
      this.statusText.style.fill = 0xffaa44;
      this.visible = true;
      this.submitButton.setEnabled(false);
      this.createTextarea(layout);
      return;
    }
    this.statusText.text = '';
    this.visible = true;
    this.submitButton.setEnabled(true);
    this.createTextarea(layout);
  }

  hide(): void {
    this.visible = false;
    this.removeTextarea();
  }

  private createTextarea(layout: LayoutInfo): void {
    if (this.textarea) return;

    const ta = document.createElement('textarea');
    ta.maxLength = MAX_CHARS;
    ta.placeholder = 'Describe your idea...';
    ta.style.cssText = `
      position: fixed;
      z-index: 1000;
      font-family: monospace;
      font-size: 16px;
      color: #ffffff;
      background: #1a1a4e;
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 12px;
      resize: none;
      outline: none;
      box-sizing: border-box;
    `;

    // Position the textarea over the canvas area where the overlay shows
    // Reference coords: centered, y=340 to y=820, width=800
    const refX = (CONFIG.display.referenceWidth - 800) / 2;
    const refY = 340;
    const refW = 800;
    const refH = 480;

    ta.style.left = `${layout.offsetX + refX * layout.scale}px`;
    ta.style.top = `${layout.offsetY + refY * layout.scale}px`;
    ta.style.width = `${refW * layout.scale}px`;
    ta.style.height = `${refH * layout.scale}px`;

    ta.addEventListener('input', () => {
      this.charCount.text = `${ta.value.length}/${MAX_CHARS}`;
    });

    document.body.appendChild(ta);
    this.textarea = ta;
    ta.focus();
  }

  private removeTextarea(): void {
    if (this.textarea) {
      this.textarea.remove();
      this.textarea = null;
    }
  }

  private async handleSubmit(): Promise<void> {
    if (!this.textarea || this.submitted) return;

    const text = this.textarea.value.trim();
    if (text.length < 10) {
      this.statusText.text = 'Please write at least 10 characters.';
      this.statusText.style.fill = 0xff6644;
      return;
    }

    this.submitButton.setEnabled(false);
    this.statusText.text = 'Submitting...';
    this.statusText.style.fill = 0xcccccc;

    this.onSubmit(text);
    this.submitted = true;
    this.statusText.text = 'Thank you! Your suggestion has been submitted.';
    this.statusText.style.fill = 0x88ff88;

    setTimeout(() => this.hide(), 2000);
  }

  override destroy(): void {
    this.removeTextarea();
    super.destroy();
  }
}
