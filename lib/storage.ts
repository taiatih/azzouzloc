import { db } from './db';
import type { Article } from './models';

export async function exportDump() {
  const articles = await db.articles.toArray();
  return { articles } as { articles: Article[] };
}

export async function importDump(dump: { articles?: Article[]; [k:string]: unknown }) {
  const collisions: string[] = [];
  await db.transaction('rw', db.articles, async () => {
    for (const a of dump.articles || []) {
      const exists = await db.articles.get(a.id);
      if (exists) { collisions.push(`article:${a.id}`); continue; }
      await db.articles.add({ id: a.id, nom: a.nom, prixJour: a.prixJour, qteTotale: a.qteTotale, qteCasse: a.qteCasse ?? 0, actif: a.actif ?? true } as Article);
    }
  });
  return { collisions };
}

const SEP = ';';
function escapeCSV(v: unknown) {
  const s = v === undefined || v === null ? '' : String(v);
  if (s.includes('"') || s.includes(SEP) || s.includes('\n')) return '"' + s.replaceAll('"', '""') + '"';
  return s;
}
function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  return lines.map(line => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === SEP) { out.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  });
}

export async function exportArticlesCSV() {
  const headers = ['id','nom','categorie','prixJour','qteTotale','qteCasse','seuilAlerte','cautionUnit','actif'];
  const rows = await db.articles.toArray();
  const csv = [headers.join(SEP), ...rows.map(a => [a.id,a.nom,a.categorie ?? '',a.prixJour,a.qteTotale,a.qteCasse,a.seuilAlerte ?? '',a.cautionUnit ?? '',a.actif ? 1 : 0].map(escapeCSV).join(SEP))].join('\n');
  return csv;
}

export async function importArticlesCSV(csv: string) {
  const rows = parseCSV(csv);
  const header = rows[0]?.map(h => h.trim()) || [];
  const data = rows.slice(1);
  const idx = (name: string) => header.indexOf(name);
  const collisions: string[] = [];
  await db.transaction('rw', db.articles, async () => {
    for (const r of data) {
      const a: Article = {
        id: r[idx('id')],
        nom: r[idx('nom')],
        categorie: r[idx('categorie')] || undefined,
        description: undefined,
        prixJour: Number(r[idx('prixJour')]) || 0,
        qteTotale: Number(r[idx('qteTotale')]) || 0,
        qteCasse: Number(r[idx('qteCasse')]) || 0,
        seuilAlerte: r[idx('seuilAlerte')] ? Number(r[idx('seuilAlerte')]) : undefined,
        cautionUnit: r[idx('cautionUnit')] ? Number(r[idx('cautionUnit')]) : undefined,
        actif: r[idx('actif')] === '1' || r[idx('actif')]?.toLowerCase() === 'true',
      };
      const exists = await db.articles.get(a.id);
      if (exists) { collisions.push(a.id); continue; }
      await db.articles.add(a);
    }
  });
  return { collisions };
}

export async function exportReservationsCSV() {
  return 'id;dateDebut;dateFin;clientNom;clientTel;note;statut;acompte;createdAt;updatedAt\n';
}

export async function exportReservationItemsCSV() {
  return 'id;reservationId;articleId;qte;prixJourSnapshot\n';
}
