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

  // Gather local data (push)
  const [articles, reservations, reservationItems] = await Promise.all([
    articleHelpers.list(), reservationHelpers.list(), reservationItemHelpers.list()
  ]);

  const resp = await fetch('/.netlify/functions/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-pin': pin },
    body: JSON.stringify({ push: { articles, reservations, reservationItems } }),
  });
  if (!resp.ok) return { ok: false, status: resp.status };
  const data = await resp.json();

  // Merge (v1 simple: replace)
  await db.transaction('rw', db.articles, db.reservations, db.reservationItems, async ()=>{
    await db.articles.clear();
    await db.reservations.clear();
    await db.reservationItems.clear();
    if (data.articles?.length) await db.articles.bulkAdd(data.articles);
    if (data.reservations?.length) await db.reservations.bulkAdd(data.reservations);
    if (data.reservationItems?.length) await db.reservationItems.bulkAdd(data.reservationItems);
  });
  localStorage.setItem(LAST_SYNC_KEY, data.serverTime || new Date().toISOString());
  return { ok: true };
}
