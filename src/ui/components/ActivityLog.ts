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

interface VoteInfo {
  up: number;
  down: number;
  upVoters: string[];
  downVoters: string[];
}

interface VoteCounts {
  [prNumber: number]: VoteInfo;
}

const VOTES_TO_MERGE = 1;
const VOTES_TO_REJECT = 1;

function isPreviewDeploy(): boolean {
  return window.location.hostname.startsWith('deploy-preview-');
}

export class ActivityLog {
  private container: HTMLDivElement;
  private entriesList: HTMLDivElement;
  private communityPanel: HTMLDivElement;
  private readonly onResize: () => void;
  private playerName = '';
  private versionBar: HTMLDivElement;

  setPlayerName(name: string): void {
    this.playerName = name;
  }

  constructor(buildHash?: string) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 16px;
      bottom: 16px;
      background: rgba(14, 14, 56, 0.95);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 12px;
      display: none;
      flex-direction: column;
      font-family: monospace;
      z-index: 100;
      overflow: hidden;
    `;

    // Version bar
    this.versionBar = document.createElement('div');
    this.versionBar.style.cssText = `
      color: #ffd700; font-size: 18px; font-weight: bold;
      text-align: center; padding: 16px 12px 12px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      flex-shrink: 0;
    `;
    this.versionBar.textContent = buildHash ? `Version: ${buildHash}` : '';
    this.container.appendChild(this.versionBar);

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
      padding: 8px 0;
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
      padding: 8px 0;
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
      padding: 12px 8px;
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
    loading.style.cssText = 'padding: 16px 12px; font-size: 11px; color: rgba(255,215,0,0.4); text-align: center;';
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
        empty.style.cssText = 'padding: 16px 12px; font-size: 11px; color: rgba(255,215,0,0.4); text-align: center;';
        empty.textContent = 'No proposed changes right now.';
        this.communityPanel.appendChild(empty);
        return;
      }

      const header = document.createElement('div');
      header.style.cssText = `
        padding: 12px 12px 8px;
        font-size: 10px;
        color: rgba(255, 215, 0, 0.4);
        border-bottom: 1px solid rgba(255, 215, 0, 0.08);
        flex-shrink: 0;
      `;
      header.textContent = `${VOTES_TO_MERGE} 👍 to ship · ${VOTES_TO_REJECT} 👎 to reject`;
      this.communityPanel.appendChild(header);

      for (const pr of prs) {
        const prVotes = votes[pr.number] ?? { up: 0, down: 0, upVoters: [], downVoters: [] };
        this.communityPanel.appendChild(this.makeCommunityEntry(pr, prVotes));
      }

    } catch {
      this.communityPanel.innerHTML = '';
      const err = document.createElement('div');
      err.style.cssText = 'padding: 16px 12px; font-size: 11px; color: #cc6666; text-align: center;';
      err.textContent = 'Failed to load. Try again later.';
      this.communityPanel.appendChild(err);
    }
  }

  private makeCommunityEntry(issue: OpenPR, votes: VoteInfo): HTMLDivElement {
    const entry = document.createElement('div');
    entry.style.cssText = `
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 11px;
      line-height: 1.5;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color: #dddddd; word-break: break-word; margin-bottom: 8px;';
    titleEl.textContent = `#${issue.number} ${issue.title}`;
    entry.appendChild(titleEl);

    // Dual progress bar (up on left in gold, down on right in red)
    const progressWrap = document.createElement('div');
    progressWrap.style.cssText = `
      background: rgba(255, 255, 255, 0.06); border-radius: 4px;
      height: 14px; margin-bottom: 8px; position: relative; overflow: hidden;
      display: flex;
    `;
    const upFill = document.createElement('div');
    const upPct = Math.min(50, (votes.up / VOTES_TO_MERGE) * 50);
    upFill.style.cssText = `
      background: rgba(255, 215, 0, 0.4); height: 100%;
      width: ${upPct}%; transition: width 0.3s;
    `;
    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex: 1;';
    const downFill = document.createElement('div');
    const downPct = Math.min(50, (votes.down / VOTES_TO_REJECT) * 50);
    downFill.style.cssText = `
      background: rgba(204, 102, 102, 0.4); height: 100%;
      width: ${downPct}%; transition: width 0.3s;
    `;
    const progressText = document.createElement('span');
    progressText.style.cssText = `
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 9px; color: #ccc;
    `;
    progressText.textContent = `👍 ${votes.up}/${VOTES_TO_MERGE}  ·  👎 ${votes.down}/${VOTES_TO_REJECT}`;
    progressWrap.appendChild(upFill);
    progressWrap.appendChild(spacer);
    progressWrap.appendChild(downFill);
    progressWrap.appendChild(progressText);
    entry.appendChild(progressWrap);

    const links = document.createElement('div');
    links.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';

    const isPreview = isPreviewDeploy();

    // Show preview link only on prod (you're already on the preview in preview envs)
    if (!isPreview) {
      const preview = this.makeLink('▶ Preview', issue.previewUrl, '#88ccff');
      links.appendChild(preview);
    }

    const hasVotedUp = votes.upVoters.some(
      (v) => v.toLowerCase() === this.playerName.toLowerCase(),
    );
    const hasVotedDown = votes.downVoters.some(
      (v) => v.toLowerCase() === this.playerName.toLowerCase(),
    );

    // Track current vote state (mutable so buttons can update each other)
    let currentVoteUp = hasVotedUp;
    let currentVoteDown = hasVotedDown;

    const upBtn = document.createElement('button');
    const downBtn = document.createElement('button');

    const refreshBtn = (btn: HTMLButtonElement, direction: 'up' | 'down') => {
      const isUp = direction === 'up';
      const isThis = isUp ? currentVoteUp : currentVoteDown;
      const color = isUp ? '#ffd700' : '#cc6666';
      const label = isUp ? '👍' : '👎';
      btn.style.cssText = `
        background: ${isThis ? (isUp ? 'rgba(255,215,0,0.15)' : 'rgba(204,102,102,0.15)') : 'rgba(255,255,255,0.05)'};
        border: 1px solid ${isThis ? color : 'rgba(255,255,255,0.15)'};
        border-radius: 4px; padding: 4px 8px; cursor: pointer;
        color: ${color}; font-family: monospace; font-size: 10px;
        opacity: ${isThis ? '0.85' : '1'};
      `;
      btn.textContent = isThis ? `${label} ✓` : label;
    };

    const makeVoteBtn = (direction: 'up' | 'down') => {
      const isUp = direction === 'up';
      const btn = isUp ? upBtn : downBtn;
      const label = isUp ? '👍' : '👎';

      refreshBtn(btn, direction);

      btn.addEventListener('click', async () => {
        // Ignore click if already voted this direction
        const isThis = isUp ? currentVoteUp : currentVoteDown;
        if (isThis) return;

        btn.disabled = true;
        btn.textContent = '...';
        try {
          const res = await fetch('/.netlify/functions/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pr_number: issue.number, player_name: this.playerName, direction }),
          });
          const result = (await res.json()) as { success: boolean; up?: number; down?: number; merged?: boolean; rejected?: boolean };
          if (result.success) {
            const newUp = result.up ?? votes.up;
            const newDown = result.down ?? votes.down;
            // Update mutable vote state and refresh both buttons
            currentVoteUp = direction === 'up';
            currentVoteDown = direction === 'down';
            btn.disabled = false;
            refreshBtn(upBtn, 'up');
            refreshBtn(downBtn, 'down');
            if (result.merged) {
              upBtn.textContent = '🎉';
              downBtn.textContent = '🎉';
              upBtn.style.cursor = 'default';
              downBtn.style.cursor = 'default';
            } else if (result.rejected) {
              upBtn.textContent = '🚫';
              downBtn.textContent = '🚫';
              upBtn.style.cursor = 'default';
              downBtn.style.cursor = 'default';
            }
            // Update progress
            upFill.style.width = `${Math.min(50, (newUp / VOTES_TO_MERGE) * 50)}%`;
            downFill.style.width = `${Math.min(50, (newDown / VOTES_TO_REJECT) * 50)}%`;
            progressText.textContent = result.merged
              ? 'Approved!'
              : result.rejected
                ? 'Rejected'
                : `👍 ${newUp}/${VOTES_TO_MERGE}  ·  👎 ${newDown}/${VOTES_TO_REJECT}`;
          } else {
            btn.textContent = label;
            btn.disabled = false;
          }
        } catch {
          btn.textContent = label;
          btn.disabled = false;
        }
      });

      return btn;
    };

    // Voting only allowed from preview deploys
    if (isPreview) {
      links.appendChild(makeVoteBtn('up'));
      links.appendChild(makeVoteBtn('down'));
    } else {
      const votingNote = document.createElement('span');
      votingNote.style.cssText = 'font-size: 9px; color: #666; font-style: italic;';
      votingNote.textContent = 'Vote from preview';
      links.appendChild(votingNote);
    }
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

    const panelWidth = Math.min(available - 32, MAX_SIDEBAR_WIDTH);
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
      padding: 4px 12px;
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
