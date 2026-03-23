import type { Handler } from '@netlify/functions';

const REPO = 'scottwleonard/karma-cycle';

interface OpenPR {
  number: number;
  title: string;
  previewUrl: string;
  issueUrl: string;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };

  // Fetch open PRs from community branches
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/pulls?state=open&per_page=20&sort=created&direction=desc`,
    { headers },
  );

  if (!res.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch PRs' }) };
  }

  const pulls = (await res.json()) as {
    number: number;
    title: string;
    html_url: string;
    head: { ref: string };
  }[];

  // Only include PRs from community/ branches
  const communityPRs: OpenPR[] = pulls
    .filter((pr) => pr.head.ref.startsWith('community/'))
    .map((pr) => ({
      number: pr.number,
      title: pr.title.replace(/^Community:\s*/i, ''),
      previewUrl: `https://deploy-preview-${pr.number}--karma-cycle.netlify.app`,
      issueUrl: pr.html_url,
    }));

  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'max-age=60',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(communityPRs),
  };
};

export { handler };
