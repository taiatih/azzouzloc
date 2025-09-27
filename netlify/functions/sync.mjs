import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
const APP_PIN = process.env.APP_PIN;

const supabase = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

const headers = { 'Content-Type': 'application/json' };

export default async (request, context) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const pin = request.headers.get('x-pin') || request.headers.get('X-Pin');
    if (!pin || String(pin) !== String(APP_PIN)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });

    const body = await request.json().catch(()=>({}));
    const { push = { articles: [], reservations: [], reservationItems: [] } } = body || {};

    const errors = [];

    const num = (v, d=0) => (v===null||v===undefined||v==='') ? d : Number(v);
    const str = (v, d='') => (v===null||v===undefined) ? d : String(v);
    const bool = (v, d=true) => (v===null||v===undefined) ? d : Boolean(v);

    if (Array.isArray(push.articles) && push.articles.length) {
      try {
        const now = new Date().toISOString();
        const rows = push.articles.map(a => ({
          id: str(a.id),
          nom: str(a.nom),
          categorie: a.categorie ?? null,
          description: a.description ?? null,
          prixJour: num(a.prixJour, 0),
          qteTotale: num(a.qteTotale, 0),
          qteCasse: num(a.qteCasse, 0),
          seuilAlerte: (a.seuilAlerte===null||a.seuilAlerte===undefined||a.seuilAlerte==='') ? null : num(a.seuilAlerte),
          cautionUnit: (a.cautionUnit===null||a.cautionUnit===undefined||a.cautionUnit==='') ? null : num(a.cautionUnit),
          actif: bool(a.actif, true),
          updated_at: a.updated_at || now,
        }));
        const { error } = await supabase.from('articles').upsert(rows, { onConflict: 'id' });
        if (error) errors.push({ phase:'articles', message: error.message });
      } catch (e) {
        errors.push({ phase:'articles', message: e.message||String(e) });
      }
    }

    const reservations = Array.isArray(push.reservations) ? push.reservations : [];
    const items = Array.isArray(push.reservationItems) ? push.reservationItems : [];

    const allowedReservationIds = new Set();
    if (reservations.length) {
      for (const r0 of reservations) {
        const r = {
          id: str(r0.id),
          dateDebut: str(r0.dateDebut),
          dateFin: str(r0.dateFin),
          clientNom: r0.clientNom ?? null,
          clientTel: r0.clientTel ?? null,
          note: r0.note ?? null,
          statut: str(r0.statut||'brouillon'),
          acompte: (r0.acompte===null||r0.acompte===undefined||r0.acompte==='') ? null : num(r0.acompte),
          createdAt: str(r0.createdAt || new Date().toISOString()),
          updatedAt: str(r0.updatedAt || new Date().toISOString()),
        };

        if (r.statut === 'en_cours') {
          const candItems = items.filter(it => it.reservationId === r.id);
          let cand = candItems;
          if (cand.length === 0) {
            const dbItems = await supabase.from('reservation_items').select('*').eq('reservationId', r.id);
            if (dbItems.error) { errors.push({ reservationId: r.id, reason: 'items_fetch_failed' }); allowedReservationIds.add(r.id); continue; }
            cand = dbItems.data || [];
          }

          let violation = null;
          for (const it0 of cand) {
            const it = { articleId: str(it0.articleId), qte: num(it0.qte, 0) };
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
            if ((it.qte||0) > available) { violation = { articleId: it.articleId, requested: it.qte, available }; break; }
          }

          if (violation) { errors.push({ reservationId: r.id, reason: 'overbook', ...violation }); continue; }
        }
        allowedReservationIds.add(r.id);
      }

      const now = new Date().toISOString();
      const rows = reservations.filter(r => allowedReservationIds.has(r.id)).map(r0 => ({
        id: str(r0.id),
        dateDebut: str(r0.dateDebut),
        dateFin: str(r0.dateFin),
        clientNom: r0.clientNom ?? null,
        clientTel: r0.clientTel ?? null,
        note: r0.note ?? null,
        statut: str(r0.statut||'brouillon'),
        acompte: (r0.acompte===null||r0.acompte===undefined||r0.acompte==='') ? null : num(r0.acompte),
        createdAt: str(r0.createdAt || now),
        updatedAt: str(r0.updatedAt || now),
      }));
      if (rows.length) {
        const { error } = await supabase.from('reservations').upsert(rows, { onConflict: 'id' });
        if (error) errors.push({ phase:'reservations', message: error.message });
      }
    }

    if (items.length) {
      const now = new Date().toISOString();
      const rows = items
        .filter(i => allowedReservationIds.has(i.reservationId))
        .map(i => ({
          id: str(i.id), reservationId: str(i.reservationId), articleId: str(i.articleId), qte: num(i.qte,0), prixJourSnapshot: num(i.prixJourSnapshot, 0), updated_at: i.updated_at || now,
        }));
      if (rows.length) {
        const { error } = await supabase.from('reservation_items').upsert(rows, { onConflict: 'id' });
        if (error) errors.push({ phase:'reservation_items', message: error.message });
      }
    }

    let aRes = await supabase.from('articles').select('*');
    let rRes = await supabase.from('reservations').select('*');
    let iRes = await supabase.from('reservation_items').select('*');

    if (aRes.error) { errors.push({ phase:'pull_articles', message: aRes.error.message }); aRes = { data: [] }; }
    if (rRes.error) { errors.push({ phase:'pull_reservations', message: rRes.error.message }); rRes = { data: [] }; }
    if (iRes.error) { errors.push({ phase:'pull_reservation_items', message: iRes.error.message }); iRes = { data: [] }; }

    return new Response(JSON.stringify({
      articles: aRes.data || [],
      reservations: rRes.data || [],
      reservationItems: iRes.data || [],
      serverTime: new Date().toISOString(),
      errors,
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Sync failed' }), { status: 500, headers });
  }
}
