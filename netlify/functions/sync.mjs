import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
const APP_PIN = process.env.APP_PIN;

const supabase = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const pin = req.headers['x-pin'];
    if (!pin || String(pin) !== String(APP_PIN)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { push = { articles: [], reservations: [], reservationItems: [] } } = body;

    // Upsert order: articles -> reservations -> items
    if (Array.isArray(push.articles) && push.articles.length) {
      const rows = push.articles.map(a => ({ ...a, updated_at: a.updated_at || new Date().toISOString() }));
      const { error } = await supabase.from('articles').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    if (Array.isArray(push.reservations) && push.reservations.length) {
      const rows = push.reservations.map(r => ({ ...r, updatedAt: r.updatedAt || new Date().toISOString() }));
      const { error } = await supabase.from('reservations').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    if (Array.isArray(push.reservationItems) && push.reservationItems.length) {
      const rows = push.reservationItems.map(i => ({ ...i, updated_at: i.updated_at || new Date().toISOString() }));
      const { error } = await supabase.from('reservation_items').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    // Pull (return all for v1)
    const [aRes, rRes, iRes] = await Promise.all([
      supabase.from('articles').select('*'),
      supabase.from('reservations').select('*'),
      supabase.from('reservation_items').select('*'),
    ]);

    if (aRes.error) throw aRes.error;
    if (rRes.error) throw rRes.error;
    if (iRes.error) throw iRes.error;

    return res.status(200).json({
      articles: aRes.data || [],
      reservations: rRes.data || [],
      reservationItems: iRes.data || [],
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Sync failed' });
  }
}
