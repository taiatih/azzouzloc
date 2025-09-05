import Dexie, { Table } from 'dexie';
import type { Article } from './models';

class AzzouzDB extends Dexie {
  articles!: Table<Article, string>;

  constructor() {
    super('azzouz_db');
    this.version(1).stores({
      articles: 'id, nom, actif',
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
