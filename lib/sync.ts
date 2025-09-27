import { db, articleHelpers, reservationHelpers, reservationItemHelpers } from './db';

const LAST_SYNC_KEY = 'azzouz_last_sync_at';
const SYNC_PIN_OK = 'azzouz_sync_unlocked';

export async function unlockSync(pin: string) {
  localStorage.setItem(SYNC_PIN_OK, pin);
}

export function isSyncUnlocked() {
  return !!localStorage.getItem(SYNC_PIN_OK);
}

export async function runSync() {
  if (!isSyncUnlocked()) return { ok: false, reason: 'locked' };
  const pin = localStorage.getItem(SYNC_PIN_OK)!;

  const [articles, reservations, reservationItems] = await Promise.all([
    articleHelpers.list(), reservationHelpers.list(), reservationItemHelpers.list()
  ]);

  let resp;
  try {
    resp = await fetch('/.netlify/functions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pin': pin },
      body: JSON.stringify({ push: { articles, reservations, reservationItems } }),
    });
  } catch (e:any) {
    return { ok: false, network: true, message: e?.message || 'Network error' };
  }

  let payload: any = null;
  if (!resp.ok) {
    try { payload = await resp.json(); } catch { try { payload = { raw: await resp.text() }; } catch {} }
    return { ok: false, status: resp.status, body: payload };
  }

  try { payload = await resp.json(); } catch { payload = {}; }

  await db.transaction('rw', db.articles, db.reservations, db.reservationItems, async ()=>{
    await db.articles.clear();
    await db.reservations.clear();
    await db.reservationItems.clear();
    if (payload.articles?.length) await db.articles.bulkAdd(payload.articles);
    if (payload.reservations?.length) await db.reservations.bulkAdd(payload.reservations);
    if (payload.reservationItems?.length) await db.reservationItems.bulkAdd(payload.reservationItems);
  });
  localStorage.setItem(LAST_SYNC_KEY, payload.serverTime || new Date().toISOString());
  return { ok: true, errors: payload.errors || [] };
}
