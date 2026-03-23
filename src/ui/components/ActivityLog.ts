import { calculateLayout } from '../layout';

type Severity = 'positive' | 'neutral' | 'negative';

const SEVERITY_COLORS: Record<Severity, string> = {
  positive: '#88cc88',
  neutral: '#aaaaaa',
  negative: '#cc6666',
};

const EVENT_COLORS: Record<string, string> = {
  rebirth: '#bb88ff',
  death: '#ff7777',
  upgrade_purchased: '#c0c0c0',
  soul_upgrade_purchased: '#ff88aa',
  enlightenment_reached: '#88ccff',
  nirvana_challenge_started: '#cc88ff',
  nirvana_achieved: '#ffffff',
};

const MIN_SIDEBAR_WIDTH = 130;
const MAX_SIDEBAR_WIDTH = 280;
const MAX_ENTRIES = 200;

export class ActivityLog {
  private container: HTMLDivElement;
  private entriesList: HTMLDivElement;
  private readonly onResize: () => void;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      bottom: 0;
      background: rgba(10, 10, 46, 0.92);
      border-left: 1px solid rgba(255, 215, 0, 0.2);
      display: none;
      flex-direction: column;
      font-family: monospace;
      z-index: 100;
      overflow: hidden;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      padding: 10px 8px 8px;
      font-size: 12px;
      font-weight: bold;
      color: rgba(255, 215, 0, 0.65);
      border-bottom: 1px solid rgba(255, 215, 0, 0.12);
      text-transform: uppercase;
      letter-spacing: 1px;
      flex-shrink: 0;
    `;
    title.textContent = 'Change Log';
    this.container.appendChild(title);

    this.entriesList = document.createElement('div');
    this.entriesList.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 4px 0;
      display: flex;
      flex-direction: column;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 215, 0, 0.25) transparent;
    `;
    this.container.appendChild(this.entriesList);

    document.body.appendChild(this.container);

    this.onResize = () => this.updatePosition();
    window.addEventListener('resize', this.onResize);
    this.updatePosition();
  }

  updatePosition(): void {
    const layout = calculateLayout(window.innerWidth, window.innerHeight);
    const gameRight = layout.offsetX + layout.gameWidth;
    const available = window.innerWidth - gameRight;

    if (available < MIN_SIDEBAR_WIDTH) {
      this.container.style.display = 'none';
      return;
    }

    const panelWidth = Math.min(available - 10, MAX_SIDEBAR_WIDTH);
    const panelLeft = gameRight + Math.floor((available - panelWidth) / 2);

    this.container.style.left = `${panelLeft}px`;
    this.container.style.width = `${panelWidth}px`;
    this.container.style.display = 'flex';
  }

  addEntry(message: string, color = '#aaaaaa'): void {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');

    const entry = document.createElement('div');
    entry.style.cssText = `
      padding: 3px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 11px;
      line-height: 1.4;
      color: ${color};
      word-break: break-word;
    `;

    const timeEl = document.createElement('span');
    timeEl.style.cssText = 'color: #3a3a5e; font-size: 10px; display: block;';
    timeEl.textContent = `${h}:${m}:${s}`;

    const msgEl = document.createElement('span');
    msgEl.textContent = message;

    entry.appendChild(timeEl);
    entry.appendChild(msgEl);

    this.entriesList.insertBefore(entry, this.entriesList.firstChild);

    while (this.entriesList.children.length > MAX_ENTRIES) {
      this.entriesList.removeChild(this.entriesList.lastChild!);
    }
  }

  addGameEvent(type: string, detail: string): void {
    this.addEntry(detail, EVENT_COLORS[type] ?? '#aaaaaa');
  }

  addLifeEvent(message: string, severity: Severity): void {
    this.addEntry(message, SEVERITY_COLORS[severity]);
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.container.remove();
  }
}
