import { db } from "./db";
import { Article } from "./models";

export function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return !(new Date(aEnd) < new Date(bStart) || new Date(aStart) > new Date(bEnd));
}

export async function qteReservee(articleId: string, from: string, to: string): Promise<number> {
  const items = await db.reservationItems.toArray();
  const reservations = await db.reservations.where("statut").anyOf(["confirmee", "en_cours"]).toArray();
  let sum = 0;
  for (const r of reservations) {
    if (intervalsOverlap(r.dateDebut, r.dateFin, from, to)) {
      const lines = items.filter(i => i.reservationId === r.id && i.articleId === articleId);
      for (const l of lines) sum += l.qte;
    }
  }
  return sum;
}

export async function qteDisponible(article: Article, from: string, to: string): Promise<number> {
  const reserved = await qteReservee(article.id, from, to);
  return Math.max(0, article.qteTotale - article.qteCasse - reserved);
}

