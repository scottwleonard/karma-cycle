const TIER_NAMES = ['', '☀', '🌳', '🕉'];
const POLL_INTERVAL = 10_000;

interface LeaderboardEntry {
  name: string;
  karma: number;
  lives: number;
  tier: number;
}

export class LeaderboardPanel {
  private container: HTMLDivElement;
  private list: HTMLDivElement;
  private highScoresSection: HTMLDivElement;
  private timer: ReturnType<typeof setInterval> | null = null;
  private playerName: string;

  constructor(playerName: string) {
    this.playerName = playerName;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 16px; left: 16px; bottom: 16px;
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

  /** Update layout based on available space */
  updateLayout(gameOffsetX: number): void {
    if (gameOffsetX < 280) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'flex';
    this.container.style.width = `${Math.min(gameOffsetX - 32, 300)}px`;
  }

  /** Submit player score and refresh the display */
  async submitScore(karma: number, lives: number, tier: number): Promise<void> {
    try {
      await fetch('/.netlify/functions/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.playerName, karma, lives, tier }),
      });
      this.fetch();
    } catch {
      // Silent fail
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
      font-size: 13px; min-width: 24px; text-align: right;
    `;

    const tierIcon = document.createElement('span');
    tierIcon.textContent = TIER_NAMES[entry.tier] || '';
    tierIcon.style.cssText = `font-size: 14px; min-width: 16px;`;

    const info = document.createElement('div');
    info.style.cssText = `flex: 1; min-width: 0;`;

    const name = document.createElement('div');
    name.textContent = entry.name;
    name.style.cssText = `
      font-size: 13px; font-weight: ${isPlayer ? 'bold' : 'normal'};
      color: ${isPlayer ? '#ffd700' : '#ccc'};
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    `;

    const karma = document.createElement('div');
    karma.textContent = `${formatKarma(entry.karma)} karma · ${entry.lives} lives`;
    karma.style.cssText = `font-size: 11px; color: #888; margin-top: 2px;`;

    info.appendChild(name);
    info.appendChild(karma);
    row.appendChild(rank);
    row.appendChild(tierIcon);
    row.appendChild(info);
    return row;
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

function formatKarma(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}
