import Dexie, { Table } from 'dexie';
import { Article, Reservation, ReservationItem } from './models';

class AzzouzDB extends Dexie {
  articles!: Table<Article, string>;
  reservations!: Table<Reservation, string>;
  reservationItems!: Table<ReservationItem, string>;

  constructor() {
    super('azzouz_db');
    this.version(1).stores({
      articles: 'id, nom, actif',
      reservations: 'id, dateDebut, dateFin, statut',
      reservationItems: 'id, reservationId, articleId',
    });
  }
}

export const db = new AzzouzDB();

export const ArticleRepo = {
  async list() { return db.articles.toArray(); },
  async get(id: string) { return db.articles.get(id); },
  async create(a: Article) { await db.articles.add(a); return a; },
  async update(id: string, patch: Partial<Article>) {
    await db.articles.update(id, patch);
    return db.articles.get(id);
  },
  async remove(id: string) { return db.articles.delete(id); },
};

export const ReservationRepo = {
  async list() { return db.reservations.toArray(); },
  async byStatus(statuses: Reservation['statut'][]) { return db.reservations.where('statut').anyOf(statuses).toArray(); },
  async get(id: string) { return db.reservations.get(id); },
  async create(r: Reservation) { await db.reservations.add(r); return r; },
  async update(id: string, patch: Partial<Reservation>) {
    patch.updatedAt = new Date().toISOString();
    await db.reservations.update(id, patch);
    return db.reservations.get(id);
  },
  async remove(id: string) { return db.reservations.delete(id); },
};

export const ReservationItemRepo = {
  async list() { return db.reservationItems.toArray(); },
  async byReservation(reservationId: string) { return db.reservationItems.where('reservationId').equals(reservationId).toArray(); },
  async create(item: ReservationItem) { await db.reservationItems.add(item); return item; },
  async update(id: string, patch: Partial<ReservationItem>) { await db.reservationItems.update(id, patch); return db.reservationItems.get(id); },
  async remove(id: string) { return db.reservationItems.delete(id); },
};
