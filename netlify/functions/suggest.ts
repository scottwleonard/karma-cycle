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

  let body: { suggestion?: string; t?: number; email?: string };
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
      labels: ['community-request'],
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
