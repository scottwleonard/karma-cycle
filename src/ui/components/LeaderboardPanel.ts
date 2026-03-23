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
      top: 0; left: 0;
      width: 260px; height: 100vh;
      background: rgba(20, 20, 68, 0.95);
      border-right: 2px solid #ffd700;
      font-family: monospace;
      color: #dddddd;
      z-index: 100;
      display: none;
      flex-direction: column;
    `;

    const title = document.createElement('div');
    title.textContent = 'Leaderboard';
    title.style.cssText = `
      color: #ffd700; font-size: 18px; font-weight: bold;
      text-align: center; padding: 16px 8px 8px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      flex-shrink: 0;
    `;
    this.container.appendChild(title);

    this.list = document.createElement('div');
    this.list.style.cssText = `padding: 8px; overflow-y: auto; flex: 1;`;
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
    // Only show if there's enough room to the left of the game
    if (gameOffsetX < 280) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'flex';
    this.container.style.width = `${Math.min(gameOffsetX - 20, 300)}px`;
  }

  /** Submit player score and refresh the display */
  async submitScore(karma: number, lives: number, tier: number): Promise<void> {
    try {
      await fetch('/.netlify/functions/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.playerName, karma, lives, tier }),
      });
      // Refresh display immediately after submitting
      this.fetch();
    } catch {
      // Silent fail — leaderboard is non-critical
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
      empty.style.cssText = `color: #888; font-size: 13px; text-align: center; padding: 20px 0;`;
      this.list.appendChild(empty);
      return;
    }

    entries.forEach((entry, i) => {
      const row = document.createElement('div');
      const isPlayer = entry.name.toLowerCase() === this.playerName.toLowerCase();
      row.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 6px 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        ${isPlayer ? 'background: rgba(255, 215, 0, 0.1); border-radius: 4px;' : ''}
      `;

      const rank = document.createElement('span');
      rank.textContent = `${i + 1}.`;
      rank.style.cssText = `
        color: ${i < 3 ? '#ffd700' : '#666'};
        font-size: 13px; min-width: 24px; text-align: right;
      `;

      const tierIcon = document.createElement('span');
      tierIcon.textContent = TIER_NAMES[entry.tier] || '';
      tierIcon.style.cssText = `font-size: 14px; min-width: 18px;`;

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
      karma.style.cssText = `font-size: 11px; color: #888;`;

      info.appendChild(name);
      info.appendChild(karma);

      row.appendChild(rank);
      row.appendChild(tierIcon);
      row.appendChild(info);
      this.list.appendChild(row);
    });

    this.renderAllTimeHighScores(allTime);
  }

  private renderAllTimeHighScores(allTime: LeaderboardEntry[]): void {
    if (allTime.length === 0) return;

    const sectionTitle = document.createElement('div');
    sectionTitle.textContent = '★ All Time High Scores';
    sectionTitle.style.cssText = `
      color: #ffd700; font-size: 13px; font-weight: bold;
      text-align: center; padding: 10px 8px 6px;
      letter-spacing: 0.5px;
    `;
    this.highScoresSection.appendChild(sectionTitle);

    const MEDALS = ['🥇', '🥈', '🥉'];

    allTime.forEach((entry, i) => {
      const row = document.createElement('div');
      const isPlayer = entry.name.toLowerCase() === this.playerName.toLowerCase();
      row.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 6px 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        ${isPlayer ? 'background: rgba(255, 215, 0, 0.1); border-radius: 4px;' : ''}
      `;

      const medal = document.createElement('span');
      medal.textContent = MEDALS[i];
      medal.style.cssText = `font-size: 16px; min-width: 24px; text-align: center;`;

      const tierIcon = document.createElement('span');
      tierIcon.textContent = TIER_NAMES[entry.tier] || '';
      tierIcon.style.cssText = `font-size: 14px; min-width: 18px;`;

      const info = document.createElement('div');
      info.style.cssText = `flex: 1; min-width: 0;`;

      const name = document.createElement('div');
      name.textContent = entry.name;
      name.style.cssText = `
        font-size: 13px; font-weight: ${isPlayer ? 'bold' : 'normal'};
        color: ${isPlayer ? '#ffd700' : '#ccc'};
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      `;

      const karmaEl = document.createElement('div');
      karmaEl.textContent = `${formatKarma(entry.karma)} karma`;
      karmaEl.style.cssText = `font-size: 11px; color: #aaa;`;

      info.appendChild(name);
      info.appendChild(karmaEl);

      row.appendChild(medal);
      row.appendChild(tierIcon);
      row.appendChild(info);
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
