import type { Handler } from '@netlify/functions';

const REPO = 'scottwleonard/karma-cycle';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Server misconfigured' }) };
  }

  let body: { suggestion?: string; t?: number; email?: string; force?: boolean };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON' }) };
  }

  // Honeypot — bots fill hidden fields
  if (body.email) {
    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Thank you!' }) };
  }

  const suggestion = (body.suggestion || '').trim();
  if (suggestion.length < 10) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Suggestion too short (min 10 characters)' }) };
  }
  if (suggestion.length > 500) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Suggestion too long (max 500 characters)' }) };
  }

  // Bot timing check — reject if submitted < 2s after page load
  if (body.t && Date.now() - body.t < 2000) {
    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Thank you!' }) };
  }

  // Extract keywords (3+ char words) for search query
  const keywords = suggestion
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);

  // Search existing open issues for duplicates (skip if force flag set)
  if (keywords.length > 0 && !body.force) {
    const searchQuery = `repo:${REPO} is:issue state:open label:community-request ${keywords.join(' ')}`;
    const searchRes = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=3`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        total_count: number;
        items: { number: number; title: string; html_url: string }[];
      };

      if (searchData.total_count > 0) {
        const matches = searchData.items.map((i) => ({
          number: i.number,
          title: i.title.replace(/^Community:\s*/i, ''),
          url: i.html_url,
        }));
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            duplicate: true,
            matches,
            message: 'Similar suggestions already exist! Check if one of these matches your idea.',
          }),
        };
      }
    }
  }

  // No duplicates found — create the issue
  const title = `Community: ${suggestion.slice(0, 80)}${suggestion.length > 80 ? '...' : ''}`;
  const issueBody = `## Player Suggestion\n\n${suggestion}\n\n---\n*Submitted from the in-game Suggest button.*`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body: issueBody,
      labels: ['community-request', 'approved'],
    }),
  });

  if (!res.ok) {
    return { statusCode: 502, body: JSON.stringify({ success: false, message: 'Failed to create suggestion' }) };
  }

  const issue = (await res.json()) as { number: number };
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, issueNumber: issue.number, message: 'Thank you! Your suggestion has been submitted.' }),
  };
};

export { handler };
