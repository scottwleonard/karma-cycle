import type { Handler } from '@netlify/functions';

const REPO = 'scottwleonard/karma-cycle';

type Stage = 'submitted' | 'building' | 'preview';

interface StatusResponse {
  stage: Stage;
  previewUrl?: string;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const issue = event.queryStringParameters?.issue;
  if (!issue || !/^\d+$/.test(issue)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid issue number' }) };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };

  // Fetch issue comments
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues/${issue}/comments?per_page=20`,
    { headers },
  );

  if (!res.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch issue status' }) };
  }

  const comments = (await res.json()) as { body: string }[];

  let stage: Stage = 'submitted';
  let previewUrl: string | undefined;

  for (const comment of comments) {
    const body = comment.body;

    if (body.includes('Starting implementation')) {
      stage = 'building';
    }

    if (body.includes('Implementation complete')) {
      // Extract PR number from the comment (format: "PR: https://...pull/28")
      const prMatch = body.match(/\/pull\/(\d+)/);
      if (prMatch) {
        previewUrl = `https://deploy-preview-${prMatch[1]}--karma-cycle.netlify.app`;
        stage = 'preview';
      }
    }
  }

  const result: StatusResponse = { stage, ...(previewUrl && { previewUrl }) };

  return {
    statusCode: 200,
    headers: { 'Cache-Control': 'no-cache' },
    body: JSON.stringify(result),
  };
};

export { handler };
