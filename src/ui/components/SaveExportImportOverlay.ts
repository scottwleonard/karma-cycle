import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../../config';
import { ActionButton } from './ActionButton';
import { serialize, deserialize, CURRENT_VERSION } from '../../saves/serializer';
import { saveToLocal } from '../../saves/localStorage';
import type { GameState } from '../../state/GameState';

export class SaveExportImportOverlay extends Container {
  private statusText: Text;
  private fileInput: HTMLInputElement | null = null;

  constructor(gameWidth: number) {
    super();
    this.visible = false;
    this.eventMode = 'static';

    const gh = CONFIG.display.referenceHeight;

    // Dark backdrop
    const bg = new Graphics();
    bg.rect(0, 0, gameWidth, gh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = 'static';
    this.addChild(bg);

    // Panel
    const panelW = 700;
    const panelH = 600;
    const panelX = (gameWidth - panelW) / 2;
    const panelY = (gh - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 18);
    panel.fill({ color: 0x1a1a4e });
    panel.stroke({ color: 0xffd700, width: 3 });
    this.addChild(panel);

    // Title
    const title = new Text({
      text: 'Save / Load',
      style: { fontFamily: 'monospace', fontSize: 52, fill: 0xffd700, fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = gameWidth / 2;
    title.y = panelY + 40;
    this.addChild(title);

    // Export section
    const exportLabel = new Text({
      text: 'Export Save',
      style: { fontFamily: 'monospace', fontSize: 32, fill: 0xffd700 },
    });
    exportLabel.anchor.set(0.5, 0);
    exportLabel.x = gameWidth / 2;
    exportLabel.y = panelY + 140;
    this.addChild(exportLabel);

    const exportDesc = new Text({
      text: 'Download your save file to your computer.',
      style: { fontFamily: 'monospace', fontSize: 22, fill: 0xaaaacc },
    });
    exportDesc.anchor.set(0.5, 0);
    exportDesc.x = gameWidth / 2;
    exportDesc.y = panelY + 185;
    this.addChild(exportDesc);

    const exportBtn = new ActionButton('Download Save File', 380, 70, 0x2a6a2a, () => {
      this.doExport();
    });
    exportBtn.x = gameWidth / 2 - 190;
    exportBtn.y = panelY + 240;
    this.addChild(exportBtn);

    // Divider
    const divider = new Graphics();
    divider.rect(panelX + 40, panelY + 330, panelW - 80, 2);
    divider.fill({ color: 0x3a3a6e });
    this.addChild(divider);

    // Import section
    const importLabel = new Text({
      text: 'Import Save',
      style: { fontFamily: 'monospace', fontSize: 32, fill: 0xffd700 },
    });
    importLabel.anchor.set(0.5, 0);
    importLabel.x = gameWidth / 2;
    importLabel.y = panelY + 350;
    this.addChild(importLabel);

    const importDesc = new Text({
      text: 'Load a previously exported save file.\nThis will overwrite your current game.',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0xaaaacc,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: panelW - 60,
      },
    });
    importDesc.anchor.set(0.5, 0);
    importDesc.x = gameWidth / 2;
    importDesc.y = panelY + 395;
    this.addChild(importDesc);

    const importBtn = new ActionButton('Load Save File...', 380, 70, 0x2a6a2a, () => {
      this.doImport();
    });
    importBtn.x = gameWidth / 2 - 190;
    importBtn.y = panelY + 480;
    this.addChild(importBtn);

    // Status text
    this.statusText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 24, fill: 0x88ff88, align: 'center' },
    });
    this.statusText.anchor.set(0.5, 0);
    this.statusText.x = gameWidth / 2;
    this.statusText.y = panelY + 560;
    this.addChild(this.statusText);

    // Close button
    const closeBtn = new ActionButton('Close', 200, 60, 0x1a4a2a, () => {
      this.hide();
    });
    closeBtn.x = gameWidth / 2 - 100;
    closeBtn.y = panelY + panelH + 30;
    this.addChild(closeBtn);
  }

  show(): void {
    this.statusText.text = '';
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.cleanupFileInput();
  }

  setGetState(getState: () => GameState): void {
    this._getState = getState;
  }

  private _getState: (() => GameState) | null = null;

  private doExport(): void {
    if (!this._getState) return;
    const state = this._getState();
    const json = serialize(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `karma-cycle-save-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.setStatus('Save file downloaded!', 0x88ff88);
  }

  private doImport(): void {
    this.cleanupFileInput();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          this.setStatus('Failed to read file.', 0xff6644);
          return;
        }
        // Check version before loading
        let parsed: { version?: number };
        try {
          parsed = JSON.parse(text);
        } catch {
          this.setStatus('Invalid save file.', 0xff6644);
          return;
        }
        if (typeof parsed.version !== 'number') {
          this.setStatus('Invalid save file (no version).', 0xff6644);
          return;
        }
        if (parsed.version > CURRENT_VERSION) {
          this.setStatus(`Save is from a newer version (v${parsed.version} > v${CURRENT_VERSION}). Update the game first.`, 0xff6644);
          return;
        }
        const state = deserialize(text);
        if (!state) {
          this.setStatus('Invalid save file.', 0xff6644);
          return;
        }
        saveToLocal(text);
        // Prevent beforeunload from overwriting the imported save
        sessionStorage.setItem('karma_cycle_importing', '1');
        this.setStatus('Save loaded! Reloading...', 0x88ff88);
        setTimeout(() => window.location.reload(), 1200);
      };
      reader.onerror = () => {
        this.setStatus('Error reading file.', 0xff6644);
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    this.fileInput = input;
    input.click();
  }

  private cleanupFileInput(): void {
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
  }

  private setStatus(msg: string, color: number): void {
    this.statusText.text = msg;
    this.statusText.style.fill = color;
  }

  override destroy(): void {
    this.cleanupFileInput();
    super.destroy();
  }
}
