import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const REPO = 'scottwleonard/karma-cycle';
const VOTES_TO_MERGE = 3;
const VOTES_TO_REJECT = 3;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

function getInstance(event: Parameters<Handler>[0]): string {
  return event.headers?.host || 'unknown';
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

/** Attempt to merge a PR. No-ops if already merged/closed. */
async function tryMerge(token: string, prNumber: number, voters: string[]): Promise<boolean> {
  const h = ghHeaders(token);

  const prRes = await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}`, { headers: h });
  if (!prRes.ok) return false;
  const pr = (await prRes.json()) as { state: string };
  if (pr.state !== 'open') return false;

  await fetch(`https://api.github.com/repos/${REPO}/issues/${prNumber}/comments`, {
    method: 'POST', headers: h,
    body: JSON.stringify({
      body: `🗳️ This PR received ${voters.length} community votes and has been auto-approved!\n\nVoters: ${voters.join(', ')}`,
    }),
  });

  const mergeRes = await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}/merge`, {
    method: 'PUT', headers: h,
    body: JSON.stringify({
      merge_method: 'squash',
      commit_title: `Community: merge PR #${prNumber} (${voters.length} votes)`,
    }),
  });

  if (!mergeRes.ok) {
    console.error(`Failed to merge PR #${prNumber}: ${mergeRes.status} ${await mergeRes.text()}`);
    return false;
  }
  return true;
}

/** Close a PR, delete its branch, and close the linked issue with wontfix. */
async function tryReject(token: string, prNumber: number, downvoters: string[]): Promise<boolean> {
  const h = ghHeaders(token);

  // Get PR details (state + branch + linked issue)
  const prRes = await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}`, { headers: h });
  if (!prRes.ok) return false;
  const pr = (await prRes.json()) as { state: string; head: { ref: string }; body: string };
  if (pr.state !== 'open') return false;

  // Comment on PR
  await fetch(`https://api.github.com/repos/${REPO}/issues/${prNumber}/comments`, {
    method: 'POST', headers: h,
    body: JSON.stringify({
      body: `👎 This PR received ${downvoters.length} downvotes and has been rejected by the community.\n\nDownvoters: ${downvoters.join(', ')}`,
    }),
  });

  // Close the PR
  await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}`, {
    method: 'PATCH', headers: h,
    body: JSON.stringify({ state: 'closed' }),
  });

  // Delete the branch
  await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/${pr.head.ref}`, {
    method: 'DELETE', headers: h,
  });

  // Find linked issue number from PR body or branch name
  const issueMatch = pr.head.ref.match(/(?:issue-)?(\d+)/) || pr.body?.match(/#(\d+)/);
  if (issueMatch) {
    const issueNumber = parseInt(issueMatch[1]);

    // Add wontfix label
    await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}/labels`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ labels: ['wontfix'] }),
    });

    // Comment and close the issue
    await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}/comments`, {
      method: 'POST', headers: h,
      body: JSON.stringify({
        body: `👎 This suggestion was rejected by community vote (${downvoters.length} downvotes on PR #${prNumber}).\n\nDownvoters: ${downvoters.join(', ')}`,
      }),
    });

    await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  return true;
}

interface VoteInfo {
  up: number;
  down: number;
  upVoters: string[];
  downVoters: string[];
}

function groupVotes(rows: { pr_number: number; player_name: string; direction: string }[]): Record<number, VoteInfo> {
  const result: Record<number, VoteInfo> = {};
  for (const row of rows) {
    if (!result[row.pr_number]) {
      result[row.pr_number] = { up: 0, down: 0, upVoters: [], downVoters: [] };
    }
    const info = result[row.pr_number];
    if (row.direction === 'down') {
      info.down++;
      info.downVoters.push(row.player_name);
    } else {
      info.up++;
      info.upVoters.push(row.player_name);
    }
  }
  return result;
}

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  const instance = getInstance(event);
  const supabase = getSupabase();

  // GET — fetch vote counts
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('pr_number, player_name, direction')
        .eq('instance', instance);

      if (error) throw error;

      const counts = groupVotes(data ?? []);

      // Safety net: retry merge/reject for any PR at threshold
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        for (const [prNum, info] of Object.entries(counts)) {
          const n = parseInt(prNum);
          if (info.up >= VOTES_TO_MERGE) {
            tryMerge(token, n, info.upVoters).catch(() => {});
          }
          if (info.down >= VOTES_TO_REJECT) {
            tryReject(token, n, info.downVoters).catch(() => {});
          }
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify(counts) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  // POST — cast a vote
  if (event.httpMethod === 'POST') {
    let body: { pr_number?: number; player_name?: string; direction?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const prNumber = body.pr_number;
    const playerName = (body.player_name || '').trim();
    const direction = body.direction === 'down' ? 'down' : 'up';

    if (!prNumber || !playerName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing pr_number or player_name' }) };
    }

    try {
      // Insert vote (unique constraint on instance+pr_number+player_name prevents duplicates)
      const { error: insertError } = await supabase
        .from('votes')
        .insert({ instance, pr_number: prNumber, player_name: playerName, direction });

      if (insertError) {
        if (insertError.code === '23505') {
          return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Already voted' }) };
        }
        throw insertError;
      }

      // Get current vote state
      const { data: allRows } = await supabase
        .from('votes')
        .select('pr_number, player_name, direction')
        .eq('instance', instance)
        .eq('pr_number', prNumber);

      const info = groupVotes(allRows ?? [])[prNumber] ?? { up: 0, down: 0, upVoters: [], downVoters: [] };
      let merged = false;
      let rejected = false;

      const token = process.env.GITHUB_TOKEN;
      if (token) {
        if (info.up >= VOTES_TO_MERGE) {
          merged = await tryMerge(token, prNumber, info.upVoters);
        }
        if (info.down >= VOTES_TO_REJECT) {
          rejected = await tryReject(token, prNumber, info.downVoters);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, up: info.up, down: info.down, merged, rejected }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
