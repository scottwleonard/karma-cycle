import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const BLESS_COSTS: Record<string, number> = {
  nourish: 50,
  inspire: 100,
  protect: 75,
};

const SENDER_KARMA_REWARD: Record<string, number> = {
  nourish: 5,
  inspire: 10,
  protect: 8,
};

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
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' };
  const instance = getInstance(event);
  const supabase = getSupabase();

  // GET — poll for pending blessings for a player
  if (event.httpMethod === 'GET') {
    const playerName = event.queryStringParameters?.player;
    if (!playerName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing player' }) };
    }

    try {
      const { data, error } = await supabase
        .from('blessings')
        .select('id, from_name, type, created_at')
        .eq('instance', instance)
        .eq('to_name', playerName)
        .eq('claimed', false)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      // Mark them as claimed
      if (data && data.length > 0) {
        const ids = data.map((r) => r.id);
        await supabase
          .from('blessings')
          .update({ claimed: true })
          .in('id', ids);
      }

      return { statusCode: 200, headers, body: JSON.stringify(data ?? []) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  // POST — send a blessing
  if (event.httpMethod === 'POST') {
    let body: { from?: string; to?: string; type?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const from = (body.from || '').trim();
    const to = (body.to || '').trim();
    const type = body.type || '';

    if (!from || !to || !BLESS_COSTS[type]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid blessing' }) };
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cannot bless yourself' }) };
    }

    const cost = BLESS_COSTS[type];
    const karmaReward = SENDER_KARMA_REWARD[type];

    try {
      // Insert the blessing
      const { error } = await supabase
        .from('blessings')
        .insert({ instance, from_name: from, to_name: to, type });

      if (error) throw error;

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, cost, karmaReward }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
