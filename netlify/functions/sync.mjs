import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
const APP_PIN = process.env.APP_PIN;

const supabase = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

const headers = { 'Content-Type': 'application/json' };

export default async (event, context) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const pin = event.headers['x-pin'] || event.headers['X-Pin'];
    if (!pin || String(pin) !== String(APP_PIN)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const { push = { articles: [], reservations: [], reservationItems: [] } } = body;

    // Upsert order: articles -> reservations (with anti-overbooking) -> items
    const errors = [];

    if (Array.isArray(push.articles) && push.articles.length) {
      const rows = push.articles.map(a => ({ ...a, updated_at: a.updated_at || new Date().toISOString() }));
      const { error } = await supabase.from('articles').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    const reservations = Array.isArray(push.reservations) ? push.reservations : [];
    const items = Array.isArray(push.reservationItems) ? push.reservationItems : [];

    const allowedReservationIds = new Set();
    if (reservations.length) {
      for (const r of reservations) {
        // Always validate when statut en_cours
        if (r.statut === 'en_cours') {
          // Fetch existing to know previous statut (optional)
          const existing = await supabase.from('reservations').select('statut').eq('id', r.id).maybeSingle();
          const prevStatut = existing.data?.statut || 'brouillon';

          // Determine candidate items
          const candItems = items.filter(it => it.reservationId === r.id);
          let cand = candItems;
          if (cand.length === 0) {
            const dbItems = await supabase.from('reservation_items').select('*').eq('reservationId', r.id);
            if (dbItems.error) { errors.push({ reservationId: r.id, reason: 'items_fetch_failed' }); continue; }
            cand = dbItems.data || [];
          }

          // For each item, compute availability
          let violation = null;
          for (const it of cand) {
            // Fetch overlapping en_cours reservations excluding current
            const overRes = await supabase
              .from('reservations')
              .select('id')
              .eq('statut', 'en_cours')
              .lte('dateDebut', r.dateFin)
              .gte('dateFin', r.dateDebut);
            if (overRes.error) { violation = { articleId: it.articleId, reason: 'overlap_fetch_failed' }; break; }
            const ids = (overRes.data || []).map(x => x.id).filter(x => x !== r.id);

            let reserved = 0;
            if (ids.length) {
              const itemsRes = await supabase
                .from('reservation_items')
                .select('qte, articleId, reservationId')
                .in('reservationId', ids)
                .eq('articleId', it.articleId);
              if (itemsRes.error) { violation = { articleId: it.articleId, reason: 'items_overlap_fetch_failed' }; break; }
              reserved = (itemsRes.data || []).reduce((s, row) => s + (row.qte||0), 0);
            }

            const artRes = await supabase.from('articles').select('qteTotale, qteCasse').eq('id', it.articleId).maybeSingle();
            if (artRes.error || !artRes.data) { violation = { articleId: it.articleId, reason: 'article_missing' }; break; }
            const available = Math.max(0, (artRes.data.qteTotale||0) - (artRes.data.qteCasse||0) - reserved);
            if ((it.qte||0) > available) {
              violation = { articleId: it.articleId, requested: it.qte, available };
              break;
            }
          }

          if (violation) {
            errors.push({ reservationId: r.id, reason: 'overbook', ...violation });
            continue; // skip upsert for this reservation
          }
        }
        allowedReservationIds.add(r.id);
      }

      // Upsert only allowed reservations
      const rows = reservations.filter(r => allowedReservationIds.has(r.id)).map(r => ({ ...r, updatedAt: r.updatedAt || new Date().toISOString() }));
      if (rows.length) {
        const { error } = await supabase.from('reservations').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
    }

    if (items.length) {
      // Upsert only items for allowed reservations
      const rows = items.filter(i => allowedReservationIds.has(i.reservationId)).map(i => ({ ...i, updated_at: i.updated_at || new Date().toISOString() }));
      if (rows.length) {
        const { error } = await supabase.from('reservation_items').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
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

    return { statusCode: 200, headers, body: JSON.stringify({
      articles: aRes.data || [],
      reservations: rRes.data || [],
      reservationItems: iRes.data || [],
      serverTime: new Date().toISOString(),
      errors,
    }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Sync failed' }) };
  }
}
