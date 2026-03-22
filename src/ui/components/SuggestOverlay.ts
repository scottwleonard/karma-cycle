import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../../config';
import { ActionButton } from './ActionButton';
import { submitSuggestion } from '../submitSuggestion';
import type { SuggestionMatch } from '../submitSuggestion';
import type { LayoutInfo } from '../layout';

const MAX_CHARS = 500;

export class SuggestOverlay extends Container {
  private textarea: HTMLTextAreaElement | null = null;
  private charCount: Text;
  private statusText: Text;
  private submitButton: ActionButton;
  private cancelButton: ActionButton;
  private submitAnywayButton: ActionButton;
  private duplicateText: Text;
  private submitted = false;
  private loadTime: number;
  private gameWidth: number;
  private pendingSuggestion = '';

  constructor(gameWidth: number, loadTime: number) {
    super();
    this.visible = false;
    this.eventMode = 'static';
    this.loadTime = loadTime;
    this.gameWidth = gameWidth;

    const gh = CONFIG.display.referenceHeight;

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, gameWidth, gh);
    bg.fill({ color: 0x000000, alpha: 0.9 });
    bg.eventMode = 'static';
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

    // Duplicate matches text (hidden initially)
    this.duplicateText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 22, fill: 0xffaa44, align: 'center', wordWrap: true, wordWrapWidth: 800, lineHeight: 32 },
    });
    this.duplicateText.anchor.set(0.5, 0);
    this.duplicateText.x = gameWidth / 2;
    this.duplicateText.y = 870;
    this.duplicateText.visible = false;
    this.addChild(this.duplicateText);

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
    this.submitButton = new ActionButton('Submit', 300, 70, 0x228b22, () => {
      this.handleSubmit();
    });
    this.submitButton.x = gameWidth / 2 - 320;
    this.submitButton.y = 880;
    this.addChild(this.submitButton);

    // Cancel button
    this.cancelButton = new ActionButton('Cancel', 200, 70, 0x228b22, () => {
      this.hide();
    });
    this.cancelButton.x = gameWidth / 2 + 40;
    this.cancelButton.y = 880;
    this.addChild(this.cancelButton);

    // Submit Anyway button (hidden initially, shown on duplicate)
    this.submitAnywayButton = new ActionButton('Submit Anyway', 300, 70, 0x228b22, () => {
      this.forceSubmit();
    });
    this.submitAnywayButton.x = gameWidth / 2 - 320;
    this.submitAnywayButton.y = 880;
    this.submitAnywayButton.visible = false;
    this.addChild(this.submitAnywayButton);
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
    this.duplicateText.visible = false;
    this.submitAnywayButton.visible = false;
    this.submitButton.visible = true;
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
    this.statusText.text = 'Checking for similar suggestions...';
    this.statusText.style.fill = 0xcccccc;

    const result = await submitSuggestion(text, this.loadTime);

    if (result.duplicate && result.matches && result.matches.length > 0) {
      this.showDuplicates(result.matches, text);
      return;
    }

    if (result.success) {
      this.submitted = true;
      this.statusText.text = result.message;
      this.statusText.style.fill = 0x88ff88;
      setTimeout(() => this.hide(), 2000);
    } else {
      this.statusText.text = result.message;
      this.statusText.style.fill = 0xff6644;
      this.submitButton.setEnabled(true);
    }
  }

  private showDuplicates(matches: SuggestionMatch[], text: string): void {
    this.pendingSuggestion = text;

    const lines = ['Similar suggestions already exist:\n'];
    for (const m of matches) {
      lines.push(`  #${m.number}: ${m.title}`);
    }
    lines.push('\nIf yours is different, submit anyway.');

    this.duplicateText.text = lines.join('\n');
    this.duplicateText.visible = true;
    this.statusText.text = '';

    // Hide normal submit, show "Submit Anyway"
    this.submitButton.visible = false;
    this.submitAnywayButton.visible = true;
    this.submitAnywayButton.setEnabled(true);

    // Move cancel and submit anyway below the duplicate text
    const belowDuplicates = 870 + this.duplicateText.height + 20;
    this.submitAnywayButton.y = belowDuplicates;
    this.cancelButton.y = belowDuplicates;
    this.cancelButton.x = this.gameWidth / 2 + 40;
  }

  private async forceSubmit(): Promise<void> {
    if (this.submitted || !this.pendingSuggestion) return;

    this.submitAnywayButton.setEnabled(false);
    this.statusText.text = 'Submitting...';
    this.statusText.style.fill = 0xcccccc;
    this.statusText.y = this.submitAnywayButton.y + 90;

    // Post directly — skip duplicate check by adding a force flag
    try {
      const res = await fetch('/.netlify/functions/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion: this.pendingSuggestion, t: this.loadTime, force: true }),
      });
      const result = (await res.json()) as { success: boolean; message: string };
      this.submitted = true;
      this.statusText.text = result.success ? result.message : result.message;
      this.statusText.style.fill = result.success ? 0x88ff88 : 0xff6644;
      setTimeout(() => this.hide(), 2000);
    } catch {
      this.statusText.text = 'Network error — try again later.';
      this.statusText.style.fill = 0xff6644;
      this.submitAnywayButton.setEnabled(true);
    }
  }

  override destroy(): void {
    this.removeTextarea();
    super.destroy();
  }
}
