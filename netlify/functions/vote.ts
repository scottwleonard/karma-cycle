import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const REPO = 'scottwleonard/karma-cycle';
const VOTES_TO_MERGE = 3;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

function getInstance(event: Parameters<Handler>[0]): string {
  return event.headers?.host || 'unknown';
}

/** Attempt to merge a PR. No-ops if already merged. */
async function tryMerge(token: string, prNumber: number, voters: string[]): Promise<boolean> {
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Check if PR is still open
  const prRes = await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}`, {
    headers: ghHeaders,
  });
  if (!prRes.ok) return false;
  const pr = (await prRes.json()) as { state: string };
  if (pr.state !== 'open') return false;

  // Comment on PR
  await fetch(`https://api.github.com/repos/${REPO}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: ghHeaders,
    body: JSON.stringify({
      body: `🗳️ This PR received ${voters.length} community votes and has been auto-approved!\n\nVoters: ${voters.join(', ')}`,
    }),
  });

  // Merge the PR
  const mergeRes = await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers: ghHeaders,
    body: JSON.stringify({
      merge_method: 'squash',
      commit_title: `Community: merge PR #${prNumber} (${voters.length} votes)`,
    }),
  });

  if (!mergeRes.ok) {
    const mergeErr = await mergeRes.text();
    console.error(`Failed to merge PR #${prNumber}: ${mergeRes.status} ${mergeErr}`);
    return false;
  }

  return true;
}

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  const instance = getInstance(event);
  const supabase = getSupabase();

  // GET — fetch vote counts for open PRs
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('pr_number, player_name')
        .eq('instance', instance);

      if (error) throw error;

      // Group by pr_number
      const counts: Record<number, { count: number; voters: string[] }> = {};
      for (const row of data ?? []) {
        if (!counts[row.pr_number]) {
          counts[row.pr_number] = { count: 0, voters: [] };
        }
        counts[row.pr_number].count++;
        counts[row.pr_number].voters.push(row.player_name);
      }

      // Safety net: retry merging any PR that has enough votes but may still be open
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        for (const [prNum, info] of Object.entries(counts)) {
          if (info.count >= VOTES_TO_MERGE) {
            tryMerge(token, parseInt(prNum), info.voters).catch(() => {});
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
    let body: { pr_number?: number; player_name?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const prNumber = body.pr_number;
    const playerName = (body.player_name || '').trim();

    if (!prNumber || !playerName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing pr_number or player_name' }) };
    }

    try {
      // Insert vote (unique constraint prevents duplicates)
      const { error: insertError } = await supabase
        .from('votes')
        .insert({ instance, pr_number: prNumber, player_name: playerName });

      if (insertError) {
        if (insertError.code === '23505') {
          return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Already voted' }) };
        }
        throw insertError;
      }

      // Get all voters for this PR
      const { data: voterRows } = await supabase
        .from('votes')
        .select('player_name')
        .eq('instance', instance)
        .eq('pr_number', prNumber);

      const voters = (voterRows ?? []).map((r) => r.player_name);
      const totalVotes = voters.length;
      let merged = false;

      // Auto-merge if threshold reached
      if (totalVotes >= VOTES_TO_MERGE) {
        const token = process.env.GITHUB_TOKEN;
        if (token) {
          merged = await tryMerge(token, prNumber, voters);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, totalVotes, merged }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
