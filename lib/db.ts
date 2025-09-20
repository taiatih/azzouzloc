import Dexie, { Table } from 'dexie';
import { Article, Reservation, ReservationItem, Statut } from './models';

class AzzouzDB extends Dexie {
  articles!: Table<Article, string>;
  reservations!: Table<Reservation, string>;
  reservationItems!: Table<ReservationItem, string>;

  constructor() {
    super('azzouz_db');
    this.version(1).stores({
      articles: 'id, nom, actif',
      reservations: 'id, dateDebut, dateFin, statut',
      reservationItems: 'id, reservationId, articleId'
    });
  }
}

export const db = new AzzouzDB();

// Helpers CRUD pour Articles
export const articleHelpers = {
  async create(article: Article): Promise<string> {
    return await db.articles.add(article);
  },
  async update(id: string, changes: Partial<Article>): Promise<number> {
    return await db.articles.update(id, changes);
  },
  async delete(id: string): Promise<void> {
    return await db.articles.delete(id);
  },
  async get(id: string): Promise<Article | undefined> {
    return await db.articles.get(id);
  },
  async list(): Promise<Article[]> {
    return await db.articles.toArray();
  },
  async listActifs(): Promise<Article[]> {
    return await db.articles.where('actif').equals(1).toArray();
  }
};

// Helpers CRUD pour Reservations
export const reservationHelpers = {
  async create(reservation: Reservation): Promise<string> {
    return await db.reservations.add(reservation);
  },
  async update(id: string, changes: Partial<Reservation>): Promise<number> {
    return await db.reservations.update(id, changes);
  },
  async delete(id: string): Promise<void> {
    return await db.reservations.delete(id);
  },
  async get(id: string): Promise<Reservation | undefined> {
    return await db.reservations.get(id);
  },
  async list(): Promise<Reservation[]> {
    return await db.reservations.toArray();
  },
  async listByStatus(status: Statut[]): Promise<Reservation[]> {
    return await db.reservations.where('statut').anyOf(status).toArray();
  }
};

// Helpers CRUD pour ReservationItems
export const reservationItemHelpers = {
  async create(item: ReservationItem): Promise<string> {
    return await db.reservationItems.add(item);
  },
  async update(id: string, changes: Partial<ReservationItem>): Promise<number> {
    return await db.reservationItems.update(id, changes);
  },
  async delete(id: string): Promise<void> {
    return await db.reservationItems.delete(id);
  },
  async get(id: string): Promise<ReservationItem | undefined> {
    return await db.reservationItems.get(id);
  },
  async list(): Promise<ReservationItem[]> {
    return await db.reservationItems.toArray();
  },
  async listByReservation(reservationId: string): Promise<ReservationItem[]> {
    return await db.reservationItems.where('reservationId').equals(reservationId).toArray();
  }
};

