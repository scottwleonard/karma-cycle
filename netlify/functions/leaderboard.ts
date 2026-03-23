import type { Handler } from '@netlify/functions';

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
const GIST_FILENAME = 'karma-cycle-leaderboard.json';

async function getGistId(token: string): Promise<string | null> {
  // Search user's gists for the leaderboard file
  const res = await fetch('https://api.github.com/gists?per_page=100', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const gists = (await res.json()) as { id: string; files: Record<string, unknown> }[];
  const gist = gists.find((g) => GIST_FILENAME in g.files);
  return gist?.id ?? null;
}

async function getLeaderboard(token: string): Promise<{ gistId: string | null; lb: Leaderboard }> {
  const gistId = await getGistId(token);
  if (!gistId) return { gistId: null, lb: { entries: [] } };

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return { gistId, lb: { entries: [] } };

  const gist = (await res.json()) as { files: Record<string, { content: string }> };
  try {
    const content = gist.files[GIST_FILENAME]?.content;
    return { gistId, lb: content ? JSON.parse(content) : { entries: [] } };
  } catch {
    return { gistId, lb: { entries: [] } };
  }
}

async function saveLeaderboard(token: string, gistId: string | null, lb: Leaderboard): Promise<void> {
  const content = JSON.stringify(lb, null, 2);

  if (gistId) {
    // Update existing gist
    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: { [GIST_FILENAME]: { content } } }),
    });
  } else {
    // Create new gist
    await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Karma Cycle Leaderboard',
        public: false,
        files: { [GIST_FILENAME]: { content } },
      }),
    });
  }
}

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  // GET — fetch leaderboard
  if (event.httpMethod === 'GET') {
    const { lb } = await getLeaderboard(token);
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

    const { gistId, lb } = await getLeaderboard(token);

    // Update existing entry or add new one
    const existing = lb.entries.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      existing.karma = karma;
      existing.lives = lives;
      existing.tier = tier;
      existing.updatedAt = Date.now();
    } else {
      lb.entries.push({ name, karma, lives, tier, updatedAt: Date.now() });
    }

    // Sort by karma descending, keep top N
    lb.entries.sort((a, b) => b.karma - a.karma);
    lb.entries = lb.entries.slice(0, MAX_ENTRIES);

    await saveLeaderboard(token, gistId, lb);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
