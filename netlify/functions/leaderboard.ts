import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const MAX_ENTRIES = 50;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

function getInstance(event: Parameters<Handler>[0]): string {
  // Use the Host header to identify the instance (prod vs preview deploys)
  return event.headers?.host || 'unknown';
}

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  const instance = getInstance(event);

  // GET — fetch leaderboard for this instance
  if (event.httpMethod === 'GET') {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('leaderboard')
        .select('name, karma, lives, tier, updated_at')
        .eq('instance', instance)
        .order('karma', { ascending: false })
        .limit(MAX_ENTRIES);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data ?? []) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  // POST — submit/update score for this instance
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

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('leaderboard')
        .upsert(
          { instance, name, karma, lives, tier, updated_at: new Date().toISOString() },
          { onConflict: 'instance,name' },
        );

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
