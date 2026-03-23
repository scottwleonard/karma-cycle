import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

interface LeaderboardEntry {
  name: string;
  karma: number;
  lives: number;
  tier: number;
  updatedAt: number;
}

interface Leaderboard {
  entries: LeaderboardEntry[];
}

const MAX_ENTRIES = 50;

async function getLeaderboard(): Promise<Leaderboard> {
  const store = getStore('leaderboard');
  const raw = await store.get('rankings', { type: 'json' }) as Leaderboard | null;
  return raw ?? { entries: [] };
}

async function saveLeaderboard(lb: Leaderboard): Promise<void> {
  const store = getStore('leaderboard');
  await store.setJSON('rankings', lb);
}

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  // GET — fetch leaderboard
  if (event.httpMethod === 'GET') {
    const lb = await getLeaderboard();
    return { statusCode: 200, headers, body: JSON.stringify(lb.entries) };
  }

  // POST — submit/update score
  if (event.httpMethod === 'POST') {
    let body: { name?: string; karma?: number; lives?: number; tier?: number };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const name = (body.name || '').trim();
    if (!name || name.length > 20) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid name' }) };
    }

    const karma = Math.floor(body.karma ?? 0);
    const lives = Math.floor(body.lives ?? 0);
    const tier = Math.floor(body.tier ?? 0);

    if (karma < 0 || lives < 0 || tier < 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid values' }) };
    }

    const lb = await getLeaderboard();

    // Update existing entry or add new one
    const existing = lb.entries.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      // Only update if karma is higher
      if (karma > existing.karma) {
        existing.karma = karma;
        existing.lives = lives;
        existing.tier = tier;
        existing.updatedAt = Date.now();
      }
    } else {
      lb.entries.push({ name, karma, lives, tier, updatedAt: Date.now() });
    }

    // Sort by karma descending, keep top N
    lb.entries.sort((a, b) => b.karma - a.karma);
    lb.entries = lb.entries.slice(0, MAX_ENTRIES);

    await saveLeaderboard(lb);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
