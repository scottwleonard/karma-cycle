const TIER_NAMES = ['', '☀', '🌳', '🕉'];
const POLL_INTERVAL = 10_000;

interface LeaderboardEntry {
  name: string;
  karma: number;
  wealth: number;
  lives: number;
  tier: number;
  avatar?: string | null;
  updated_at?: string;
}

function isActive(entry: LeaderboardEntry): boolean {
  if (!entry.updated_at) return false;
  const age = (Date.now() - new Date(entry.updated_at).getTime()) / 1000;
  return age < 60;
}

export type BlessCallback = (toName: string, type: 'nourish' | 'inspire' | 'protect') => void;

export class LeaderboardPanel {
  private container: HTMLDivElement;
  private list: HTMLDivElement;
  private highScoresSection: HTMLDivElement;
  private timer: ReturnType<typeof setInterval> | null = null;
  private playerName: string;
  onBless: BlessCallback | null = null;

  constructor(playerName: string) {
    this.playerName = playerName;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 32px; left: 16px; bottom: 32px;
      width: 260px;
      background: rgba(20, 20, 68, 0.95);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 12px;
      font-family: monospace;
      color: #dddddd;
      z-index: 100;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    const title = document.createElement('div');
    title.textContent = 'Leaderboard';
    title.style.cssText = `
      color: #ffd700; font-size: 18px; font-weight: bold;
      text-align: center; padding: 16px 12px 12px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      flex-shrink: 0;
    `;
    this.container.appendChild(title);

    this.list = document.createElement('div');
    this.list.style.cssText = `padding: 8px 12px; overflow-y: auto; flex: 1;`;
    this.container.appendChild(this.list);

    this.highScoresSection = document.createElement('div');
    this.highScoresSection.style.cssText = `
      flex-shrink: 0;
      border-top: 1px solid rgba(255, 215, 0, 0.3);
      background: rgba(20, 20, 68, 0.98);
    `;
    this.container.appendChild(this.highScoresSection);

    document.body.appendChild(this.container);
  }

  /** Show the panel and start polling */
  start(): void {
    this.container.style.display = 'flex';
    this.fetch();
    this.timer = setInterval(() => this.fetch(), POLL_INTERVAL);
  }

  /** Update layout from calculated position */
  updateLayout(panel: { x: number; width: number } | null): void {
    if (!panel) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'flex';
    this.container.style.left = `${panel.x}px`;
    this.container.style.width = `${panel.width}px`;
  }

  setPlayerName(name: string): void {
    this.playerName = name;
  }

  /** Submit player score and refresh the display */
  async submitScore(karma: number, wealth: number, lives: number, tier: number, avatar?: string | null): Promise<void> {
    try {
      const res = await fetch('/.netlify/functions/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.playerName, karma, wealth, lives, tier, ...(avatar && { avatar }) }),
      });
      if (!res.ok) {
        console.error('Leaderboard submit failed:', res.status, await res.text());
      }
      this.fetch();
    } catch (e) {
      console.error('Leaderboard submit error:', e);
    }
  }

  private async fetch(): Promise<void> {
    try {
      const res = await fetch('/.netlify/functions/leaderboard');
      if (!res.ok) return;
      const data = (await res.json()) as { active: LeaderboardEntry[]; allTime: LeaderboardEntry[] };
      this.render(data.active, data.allTime);
    } catch {
      // Silent fail
    }
  }

  private render(entries: LeaderboardEntry[], allTime: LeaderboardEntry[]): void {
    this.list.innerHTML = '';
    this.highScoresSection.innerHTML = '';

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No scores yet. Be the first!';
      empty.style.cssText = `color: #888; font-size: 13px; text-align: center; padding: 24px 0;`;
      this.list.appendChild(empty);
      return;
    }

    entries.forEach((entry, i) => {
      this.list.appendChild(this.makeRow(entry, i, `${i + 1}.`));
    });

    this.renderAllTimeHighScores(allTime);
  }

  private makeRow(entry: LeaderboardEntry, i: number, rankText: string): HTMLDivElement {
    const isPlayer = entry.name.toLowerCase() === this.playerName.toLowerCase();
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      padding: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      ${isPlayer ? 'background: rgba(255, 215, 0, 0.1); border-radius: 4px;' : ''}
    `;

    const rank = document.createElement('span');
    rank.textContent = rankText;
    rank.style.cssText = `
      color: ${i < 3 ? '#ffd700' : '#666'};
      font-size: 12px; min-width: 20px; text-align: right;
    `;

    // Avatar circle
    const avatarEl = document.createElement('div');
    avatarEl.style.cssText = `
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: #0a0a2e; border: 1px solid rgba(255, 215, 0, 0.3);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; font-size: 12px; color: #ffd700; font-weight: bold;
    `;
    if (entry.avatar) {
      const img = document.createElement('img');
      img.src = entry.avatar;
      img.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = (entry.name[0] ?? '?').toUpperCase();
    }

    const info = document.createElement('div');
    info.style.cssText = `flex: 1; min-width: 0;`;

    const nameRow = document.createElement('div');
    nameRow.style.cssText = `display: flex; align-items: center; gap: 4px;`;

    const name = document.createElement('span');
    name.textContent = entry.name;
    name.style.cssText = `
      font-size: 13px; font-weight: ${isPlayer ? 'bold' : 'normal'};
      color: ${isPlayer ? '#ffd700' : '#ccc'};
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    `;

    const tierIcon = document.createElement('span');
    tierIcon.textContent = TIER_NAMES[entry.tier] || '';
    tierIcon.style.cssText = `font-size: 12px;`;

    nameRow.appendChild(name);
    if (TIER_NAMES[entry.tier]) nameRow.appendChild(tierIcon);

    const karma = document.createElement('div');
    karma.textContent = `${formatNum(entry.karma)} karma · ${formatNum(entry.wealth ?? 0)} wealth · ${entry.lives} lives`;
    karma.style.cssText = `font-size: 11px; color: #888; margin-top: 2px;`;

    info.appendChild(nameRow);
    info.appendChild(karma);
    row.appendChild(rank);
    row.appendChild(avatarEl);
    row.appendChild(info);

    // Active indicator (green dot)
    if (isActive(entry) && !isPlayer) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        background: #22dd77; box-shadow: 0 0 4px #22dd77;
      `;
      dot.title = 'Online';
      row.appendChild(dot);
    }

    // Bless button (only for other active players)
    if (!isPlayer && isActive(entry) && this.onBless) {
      const blessBtn = document.createElement('div');
      blessBtn.textContent = '🙏';
      blessBtn.title = `Bless ${entry.name}`;
      blessBtn.style.cssText = `
        cursor: pointer; font-size: 14px; flex-shrink: 0;
        padding: 4px; border-radius: 4px; opacity: 0.5;
        transition: opacity 0.15s;
      `;
      blessBtn.addEventListener('mouseenter', () => { blessBtn.style.opacity = '1'; });
      blessBtn.addEventListener('mouseleave', () => {
        if (!blessBtn.dataset.open) blessBtn.style.opacity = '0.5';
      });
      blessBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showBlessMenu(blessBtn, entry.name);
      });
      row.appendChild(blessBtn);
    }

    return row;
  }

  private showBlessMenu(anchor: HTMLElement, targetName: string): void {
    document.querySelectorAll('.bless-menu').forEach((el) => el.remove());

    const menu = document.createElement('div');
    menu.className = 'bless-menu';
    menu.style.cssText = `
      position: fixed; background: rgba(10, 10, 46, 0.98);
      border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 8px;
      padding: 8px; z-index: 9999; font-family: monospace;
      min-width: 180px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);
    `;

    const title = document.createElement('div');
    title.textContent = `Bless ${targetName}`;
    title.style.cssText = `
      color: #ffd700; font-size: 11px; font-weight: bold;
      padding: 4px 8px 8px; border-bottom: 1px solid rgba(255,215,0,0.1);
      margin-bottom: 4px;
    `;
    menu.appendChild(title);

    const options: { type: 'nourish' | 'inspire' | 'protect'; label: string; cost: number }[] = [
      { type: 'nourish', label: '🍚 Nourish — pause drain', cost: 50 },
      { type: 'inspire', label: '✨ Inspire — 2x karma', cost: 100 },
      { type: 'protect', label: '🛡 Protect — health floor', cost: 75 },
    ];

    for (const opt of options) {
      const item = document.createElement('div');
      item.innerHTML = `${opt.label} <span style="color:#22dd77;font-size:10px">${opt.cost}w</span>`;
      item.style.cssText = `
        padding: 8px; cursor: pointer; border-radius: 4px;
        color: #ccc; font-size: 12px; transition: background 0.1s;
      `;
      item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,215,0,0.1)'; });
      item.addEventListener('mouseleave', () => { item.style.background = ''; });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.remove();
        anchor.dataset.open = '';
        this.onBless?.(targetName, opt.type);
      });
      menu.appendChild(item);
    }

    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    document.body.appendChild(menu);
    anchor.dataset.open = '1';

    const close = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        anchor.dataset.open = '';
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  private renderAllTimeHighScores(allTime: LeaderboardEntry[]): void {
    if (allTime.length === 0) return;

    const sectionTitle = document.createElement('div');
    sectionTitle.textContent = '★ All Time High Scores';
    sectionTitle.style.cssText = `
      color: #ffd700; font-size: 13px; font-weight: bold;
      text-align: center; padding: 12px 12px 8px;
      letter-spacing: 0.5px;
    `;
    this.highScoresSection.appendChild(sectionTitle);

    const MEDALS = ['🥇', '🥈', '🥉'];

    allTime.forEach((entry, i) => {
      const row = this.makeRow(entry, i, MEDALS[i]);
      row.style.borderBottom = 'none';
      row.style.borderTop = '1px solid rgba(255, 255, 255, 0.06)';
      this.highScoresSection.appendChild(row);
    });
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.container.remove();
  }
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}
