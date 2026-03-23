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

interface OpenPR {
  number: number;
  title: string;
  previewUrl: string;
  issueUrl: string;
}

interface VoteCounts {
  [prNumber: number]: { count: number; voters: string[] };
}

const VOTES_TO_MERGE = 3;

export class ActivityLog {
  private container: HTMLDivElement;
  private entriesList: HTMLDivElement;
  private communityPanel: HTMLDivElement;
  private readonly onResize: () => void;
  private playerName = '';

  setPlayerName(name: string): void {
    this.playerName = name;
  }

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      bottom: 0;
      background: rgba(14, 14, 56, 0.95);
      border-left: 1px solid rgba(255, 215, 0, 0.3);
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
      border-bottom: 1px solid rgba(255, 215, 0, 0.2);
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
      color: ${active ? 'rgba(255, 215, 0, 0.95)' : 'rgba(255, 215, 0, 0.45)'};
      border-bottom: 2px solid ${active ? 'rgba(255, 215, 0, 0.8)' : 'transparent'};
      transition: color 0.15s;
    `;
    tab.textContent = label;
    return tab;
  }

  private async loadCommunityUpdates(): Promise<void> {
    this.communityPanel.innerHTML = '';
    const loading = document.createElement('div');
    loading.style.cssText = 'padding: 12px 8px; font-size: 11px; color: rgba(255,215,0,0.4); text-align: center;';
    loading.textContent = 'Loading...';
    this.communityPanel.appendChild(loading);

    try {
      const [prsRes, votesRes] = await Promise.all([
        fetch('/.netlify/functions/closed-issues'),
        fetch('/.netlify/functions/vote'),
      ]);

      if (!prsRes.ok) throw new Error('fetch failed');
      const prs = (await prsRes.json()) as OpenPR[];
      const votes: VoteCounts = votesRes.ok ? await votesRes.json() : {};

      this.communityPanel.innerHTML = '';

      if (prs.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px 8px; font-size: 11px; color: rgba(255,215,0,0.4); text-align: center;';
        empty.textContent = 'No proposed changes right now.';
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
      header.textContent = `Proposed changes — ${VOTES_TO_MERGE} votes to ship!`;
      this.communityPanel.appendChild(header);

      for (const pr of prs) {
        const prVotes = votes[pr.number] ?? { count: 0, voters: [] };
        this.communityPanel.appendChild(this.makeCommunityEntry(pr, prVotes));
      }

    } catch {
      this.communityPanel.innerHTML = '';
      const err = document.createElement('div');
      err.style.cssText = 'padding: 12px 8px; font-size: 11px; color: #cc6666; text-align: center;';
      err.textContent = 'Failed to load. Try again later.';
      this.communityPanel.appendChild(err);
    }
  }

  private makeCommunityEntry(issue: OpenPR, votes: { count: number; voters: string[] }): HTMLDivElement {
    const entry = document.createElement('div');
    entry.style.cssText = `
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 11px;
      line-height: 1.5;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color: #dddddd; word-break: break-word; margin-bottom: 4px;';
    titleEl.textContent = `#${issue.number} ${issue.title}`;
    entry.appendChild(titleEl);

    // Vote progress bar
    const progressWrap = document.createElement('div');
    progressWrap.style.cssText = `
      background: rgba(255, 255, 255, 0.06); border-radius: 4px;
      height: 14px; margin-bottom: 6px; position: relative; overflow: hidden;
    `;
    const progressFill = document.createElement('div');
    const pct = Math.min(100, (votes.count / VOTES_TO_MERGE) * 100);
    progressFill.style.cssText = `
      background: rgba(255, 215, 0, 0.4); height: 100%; border-radius: 4px;
      width: ${pct}%; transition: width 0.3s;
    `;
    const progressText = document.createElement('span');
    progressText.style.cssText = `
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 9px; color: #ffd700;
    `;
    progressText.textContent = `${votes.count}/${VOTES_TO_MERGE} votes`;
    progressWrap.appendChild(progressFill);
    progressWrap.appendChild(progressText);
    entry.appendChild(progressWrap);

    const links = document.createElement('div');
    links.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; align-items: center;';

    const preview = this.makeLink('▶ Preview', issue.previewUrl, '#88ccff');
    links.appendChild(preview);

    const hasVoted = votes.voters.some(
      (v) => v.toLowerCase() === this.playerName.toLowerCase(),
    );

    const voteBtn = document.createElement('button');
    voteBtn.style.cssText = `
      background: ${hasVoted ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.08)'};
      border: 1px solid rgba(255, 215, 0, ${hasVoted ? '0.5' : '0.3'});
      border-radius: 4px; padding: 2px 8px; cursor: ${hasVoted ? 'default' : 'pointer'};
      color: #ffd700; font-family: monospace; font-size: 10px;
      opacity: ${hasVoted ? '0.6' : '1'};
    `;
    voteBtn.textContent = hasVoted ? '✓ Voted' : '👍 Vote';

    if (!hasVoted) {
      voteBtn.addEventListener('click', async () => {
        voteBtn.disabled = true;
        voteBtn.textContent = '...';
        try {
          const res = await fetch('/.netlify/functions/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pr_number: issue.number, player_name: this.playerName }),
          });
          const result = (await res.json()) as { success: boolean; totalVotes?: number; merged?: boolean };
          if (result.success) {
            voteBtn.textContent = result.merged ? '🎉 Merged!' : '✓ Voted';
            voteBtn.style.opacity = '0.6';
            voteBtn.style.cursor = 'default';
            // Update progress bar
            const newCount = result.totalVotes ?? votes.count + 1;
            const newPct = Math.min(100, (newCount / VOTES_TO_MERGE) * 100);
            progressFill.style.width = `${newPct}%`;
            progressText.textContent = result.merged
              ? 'Approved!'
              : `${newCount}/${VOTES_TO_MERGE} votes`;
          } else {
            voteBtn.textContent = '✓ Voted';
            voteBtn.style.opacity = '0.6';
          }
        } catch {
          voteBtn.textContent = '👍 Vote';
          voteBtn.disabled = false;
        }
      });
    }

    links.appendChild(voteBtn);
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
