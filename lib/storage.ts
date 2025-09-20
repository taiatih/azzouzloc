import { db, articleHelpers, reservationHelpers, reservationItemHelpers } from "./db";
import { Article, Reservation, ReservationItem } from "./models";

export async function exportToJson(): Promise<string> {
  const articles = await articleHelpers.list();
  const reservations = await reservationHelpers.list();
  const reservationItems = await reservationItemHelpers.list();
  return JSON.stringify({ articles, reservations, reservationItems }, null, 2);
}

export async function importFromJson(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const { articles, reservations, reservationItems } = data;

  await db.transaction("rw", db.articles, db.reservations, db.reservationItems, async () => {
    // Clear existing data
    await Promise.all([
      db.articles.clear(),
      db.reservations.clear(),
      db.reservationItems.clear()
    ]);

    // Add new data
    await Promise.all([
      db.articles.bulkAdd(articles),
      db.reservations.bulkAdd(reservations),
      db.reservationItems.bulkAdd(reservationItems)
    ]);
  });
}

export function exportArticlesToCsv(articles: Article[]): string {
  const headers = ["id", "nom", "categorie", "description", "prixJour", "qteTotale", "qteCasse", "seuilAlerte", "cautionUnit", "actif"];
  const rows = articles.map(article => 
    `${article.id};${article.nom};${article.categorie || ""};${article.description || ""};${article.prixJour};${article.qteTotale};${article.qteCasse};${article.seuilAlerte || ""};${article.cautionUnit || ""};${article.actif ? 1 : 0}`
  );
  return [headers.join(";"), ...rows].join("\n");
}

export function exportReservationsToCsv(reservations: Reservation[]): string {
  const headers = ["id", "dateDebut", "dateFin", "clientNom", "clientTel", "note", "statut", "acompte", "createdAt", "updatedAt"];
  const rows = reservations.map(res => 
    `${res.id};${res.dateDebut};${res.dateFin};${res.clientNom || ""};${res.clientTel || ""};${res.note || ""};${res.statut};${res.acompte || ""};${res.createdAt};${res.updatedAt}`
  );
  return [headers.join(";"), ...rows].join("\n");
}

export function exportReservationItemsToCsv(items: ReservationItem[]): string {
  const headers = ["id", "reservationId", "articleId", "qte", "prixJourSnapshot"];
  const rows = items.map(item => 
    `${item.id};${item.reservationId};${item.articleId};${item.qte};${item.prixJourSnapshot}`
  );
  return [headers.join(";"), ...rows].join("\n");
}

export async function importArticlesFromCsv(csvString: string): Promise<void> {
  const lines = csvString.split("\n");
  const headers = lines[0].split(";");
  const articles: Article[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    if (values.length === headers.length) {
      const article: Article = {
        id: values[0],
        nom: values[1],
        categorie: values[2] || undefined,
        description: values[3] || undefined,
        prixJour: parseFloat(values[4]),
        qteTotale: parseInt(values[5]),
        qteCasse: parseInt(values[6]),
        seuilAlerte: values[7] ? parseInt(values[7]) : undefined,
        cautionUnit: values[8] ? parseFloat(values[8]) : undefined,
        actif: values[9] === "1"
      };
      articles.push(article);
    }
  }

  await db.transaction("rw", db.articles, async () => {
    for (const article of articles) {
      const existing = await db.articles.get(article.id);
      if (existing) {
        await db.articles.update(article.id, article);
      } else {
        await db.articles.add(article);
      }
    }
  });
}

// Implement importReservationsFromCsv and importReservationItemsFromCsv similarly if needed


