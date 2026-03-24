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

  // GET — fetch leaderboard, or check name availability with ?check=name
  if (event.httpMethod === 'GET') {
    try {
      const supabase = getSupabase();

      // Name availability check
      const checkName = event.queryStringParameters?.check;
      if (checkName) {
        const { data } = await supabase
          .from('leaderboard')
          .select('name')
          .eq('instance', instance)
          .ilike('name', checkName)
          .limit(1);
        const taken = (data ?? []).length > 0;
        return { statusCode: 200, headers, body: JSON.stringify({ available: !taken }) };
      }
      const [activeRes, allTimeRes] = await Promise.all([
        supabase
          .from('leaderboard')
          .select('name, karma, lives, tier, updated_at')
          .eq('instance', instance)
          .order('karma', { ascending: false })
          .limit(MAX_ENTRIES),
        supabase
          .from('leaderboard')
          .select('name, peak_karma, tier')
          .eq('instance', instance)
          .order('peak_karma', { ascending: false })
          .limit(3),
      ]);

      if (activeRes.error) throw activeRes.error;
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          active: activeRes.data ?? [],
          allTime: (allTimeRes.data ?? []).map((r) => ({ name: r.name, karma: r.peak_karma, tier: r.tier })),
        }),
      };
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

      // Fetch existing peak to preserve it
      const { data: existing } = await supabase
        .from('leaderboard')
        .select('peak_karma')
        .eq('instance', instance)
        .eq('name', name)
        .single();

      const peakKarma = Math.max(karma, existing?.peak_karma ?? 0);

      const { error } = await supabase
        .from('leaderboard')
        .upsert(
          { instance, name, karma, lives, tier, peak_karma: peakKarma, updated_at: new Date().toISOString() },
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
