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

interface ClosedIssue {
  number: number;
  title: string;
  previewUrl?: string;
  issueUrl: string;
}

export class ActivityLog {
  private container: HTMLDivElement;
  private entriesList: HTMLDivElement;
  private communityPanel: HTMLDivElement;
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

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.style.cssText = `
      display: flex;
      border-bottom: 1px solid rgba(255, 215, 0, 0.12);
      flex-shrink: 0;
    `;

    const logTab = this.makeTab('Log', true);
    const communityTab = this.makeTab('Community', false);

    logTab.addEventListener('click', () => {
      logTab.style.color = 'rgba(255, 215, 0, 0.85)';
      logTab.style.borderBottom = '2px solid rgba(255, 215, 0, 0.65)';
      communityTab.style.color = 'rgba(255, 215, 0, 0.35)';
      communityTab.style.borderBottom = '2px solid transparent';
      this.entriesList.style.display = 'flex';
      this.communityPanel.style.display = 'none';
    });

    communityTab.addEventListener('click', () => {
      communityTab.style.color = 'rgba(255, 215, 0, 0.85)';
      communityTab.style.borderBottom = '2px solid rgba(255, 215, 0, 0.65)';
      logTab.style.color = 'rgba(255, 215, 0, 0.35)';
      logTab.style.borderBottom = '2px solid transparent';
      this.entriesList.style.display = 'none';
      this.communityPanel.style.display = 'flex';
      this.loadCommunityUpdates();
    });

    tabBar.appendChild(logTab);
    tabBar.appendChild(communityTab);
    this.container.appendChild(tabBar);

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

    this.communityPanel = document.createElement('div');
    this.communityPanel.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 4px 0;
      display: none;
      flex-direction: column;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 215, 0, 0.25) transparent;
    `;
    this.container.appendChild(this.communityPanel);

    document.body.appendChild(this.container);

    this.onResize = () => this.updatePosition();
    window.addEventListener('resize', this.onResize);
    this.updatePosition();
  }

  private makeTab(label: string, active: boolean): HTMLDivElement {
    const tab = document.createElement('div');
    tab.style.cssText = `
      flex: 1;
      padding: 8px 4px 6px;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      color: ${active ? 'rgba(255, 215, 0, 0.85)' : 'rgba(255, 215, 0, 0.35)'};
      border-bottom: 2px solid ${active ? 'rgba(255, 215, 0, 0.65)' : 'transparent'};
      transition: color 0.15s;
    `;
    tab.textContent = label;
    return tab;
  }

  private communityLoaded = false;

  private async loadCommunityUpdates(): Promise<void> {
    if (this.communityLoaded) return;

    this.communityPanel.innerHTML = '';
    const loading = document.createElement('div');
    loading.style.cssText = 'padding: 12px 8px; font-size: 11px; color: rgba(255,215,0,0.4); text-align: center;';
    loading.textContent = 'Loading...';
    this.communityPanel.appendChild(loading);

    try {
      const res = await fetch('/.netlify/functions/closed-issues');
      if (!res.ok) throw new Error('fetch failed');
      const issues = (await res.json()) as ClosedIssue[];

      this.communityPanel.innerHTML = '';

      if (issues.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px 8px; font-size: 11px; color: rgba(255,215,0,0.4); text-align: center;';
        empty.textContent = 'No community updates yet.';
        this.communityPanel.appendChild(empty);
        return;
      }

      const header = document.createElement('div');
      header.style.cssText = `
        padding: 6px 8px 4px;
        font-size: 10px;
        color: rgba(255, 215, 0, 0.4);
        border-bottom: 1px solid rgba(255, 215, 0, 0.08);
        flex-shrink: 0;
      `;
      header.textContent = 'Shipped features — try & vote!';
      this.communityPanel.appendChild(header);

      for (const issue of issues) {
        this.communityPanel.appendChild(this.makeCommunityEntry(issue));
      }

      this.communityLoaded = true;
    } catch {
      this.communityPanel.innerHTML = '';
      const err = document.createElement('div');
      err.style.cssText = 'padding: 12px 8px; font-size: 11px; color: #cc6666; text-align: center;';
      err.textContent = 'Failed to load. Try again later.';
      this.communityPanel.appendChild(err);
    }
  }

  private makeCommunityEntry(issue: ClosedIssue): HTMLDivElement {
    const entry = document.createElement('div');
    entry.style.cssText = `
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 11px;
      line-height: 1.5;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color: #cccccc; word-break: break-word; margin-bottom: 4px;';
    titleEl.textContent = `#${issue.number} ${issue.title}`;
    entry.appendChild(titleEl);

    const links = document.createElement('div');
    links.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';

    if (issue.previewUrl) {
      const preview = this.makeLink('▶ Preview', issue.previewUrl, '#88ccff');
      links.appendChild(preview);
    }

    const vote = this.makeLink('👍 Vote', `${issue.issueUrl}#issue-comment-box`, '#ffd700');
    links.appendChild(vote);

    entry.appendChild(links);
    return entry;
  }

  private makeLink(text: string, url: string, color: string): HTMLAnchorElement {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    a.style.cssText = `
      color: ${color};
      font-size: 10px;
      text-decoration: none;
      opacity: 0.8;
    `;
    a.addEventListener('mouseenter', () => { a.style.opacity = '1'; });
    a.addEventListener('mouseleave', () => { a.style.opacity = '0.8'; });
    return a;
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
