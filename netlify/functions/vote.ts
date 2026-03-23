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

      // Count total votes for this PR on this instance
      const { count, error: countError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('instance', instance)
        .eq('pr_number', prNumber);

      if (countError) throw countError;

      const totalVotes = count ?? 0;

      // Auto-merge if threshold reached
      if (totalVotes >= VOTES_TO_MERGE) {
        const token = process.env.GITHUB_TOKEN;
        if (token) {
          const ghHeaders = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          };

          // Comment on PR before merging
          await fetch(`https://api.github.com/repos/${REPO}/issues/${prNumber}/comments`, {
            method: 'POST',
            headers: ghHeaders,
            body: JSON.stringify({
              body: `🗳️ This PR received ${totalVotes} community votes and has been auto-approved!\n\nVoters: ${(await getVoterNames(supabase, instance, prNumber)).join(', ')}`,
            }),
          });

          // Merge the PR
          await fetch(`https://api.github.com/repos/${REPO}/pulls/${prNumber}/merge`, {
            method: 'PUT',
            headers: ghHeaders,
            body: JSON.stringify({
              merge_method: 'squash',
              commit_title: `Community: merge PR #${prNumber} (${totalVotes} votes)`,
            }),
          });
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, totalVotes, merged: totalVotes >= VOTES_TO_MERGE }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

async function getVoterNames(
  supabase: ReturnType<typeof createClient>,
  instance: string,
  prNumber: number,
): Promise<string[]> {
  const { data } = await supabase
    .from('votes')
    .select('player_name')
    .eq('instance', instance)
    .eq('pr_number', prNumber);
  return (data ?? []).map((r) => r.player_name);
}

export { handler };
