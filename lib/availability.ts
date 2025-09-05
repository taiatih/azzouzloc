import type { Article } from './models';

export function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return !(new Date(aEnd) < new Date(bStart) || new Date(aStart) > new Date(bEnd));
}

export async function qteReservee(_articleId: string, _from: string, _to: string) {
  return 0;
}

export async function qteDisponible(article: Article, _from: string, _to: string) {
  return Math.max(0, (article.qteTotale || 0) - (article.qteCasse || 0));
}
