import type { Handler } from '@netlify/functions';

const REPO = 'scottwleonard/karma-cycle';

interface ClosedIssue {
  number: number;
  title: string;
  previewUrl?: string;
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

  // Fetch closed issues with community-request label (most recent first)
  const issuesRes = await fetch(
    `https://api.github.com/repos/${REPO}/issues?state=closed&labels=community-request&per_page=20&sort=updated&direction=desc`,
    { headers },
  );

  if (!issuesRes.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch issues' }) };
  }

  const issues = (await issuesRes.json()) as {
    number: number;
    title: string;
    html_url: string;
    pull_request?: object;
  }[];

  // Filter out pull requests (GitHub returns PRs in issues endpoint too)
  const communityIssues = issues.filter((i) => !i.pull_request);

  // For each issue, fetch comments to find the "Implementation complete" comment with PR link
  const results: ClosedIssue[] = await Promise.all(
    communityIssues.map(async (issue) => {
      let previewUrl: string | undefined;

      try {
        const commentsRes = await fetch(
          `https://api.github.com/repos/${REPO}/issues/${issue.number}/comments?per_page=20`,
          { headers },
        );

        if (commentsRes.ok) {
          const comments = (await commentsRes.json()) as { body: string }[];
          for (const comment of comments) {
            const prMatch = comment.body.match(/Implementation complete.*\/pull\/(\d+)/s);
            if (prMatch) {
              previewUrl = `https://deploy-preview-${prMatch[1]}--karma-cycle.netlify.app`;
              break;
            }
          }
        }
      } catch {
        // Skip comment fetch failure
      }

      const cleanTitle = issue.title.replace(/^Community:\s*/i, '');

      return {
        number: issue.number,
        title: cleanTitle,
        issueUrl: issue.html_url,
        ...(previewUrl && { previewUrl }),
      };
    }),
  );

  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'max-age=300', // Cache for 5 minutes
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(results),
  };
};

export { handler };
