"use client";
import { useEffect, useMemo, useState } from 'react';
import { ArticleRepo } from '@/lib/db';
import type { Article } from '@/lib/models';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { exportDump, importDump } from '@/lib/storage';

const isoToday = () => new Date().toISOString().slice(0,10);

export default function InventairePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const items = await ArticleRepo.list();
    setArticles(items);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = isoToday();

  const exportJSON = async () => {
    const dump = await exportDump();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dump.json'; a.click(); URL.revokeObjectURL(url);
  };

  const importJSON = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    const { collisions } = await importDump(data);
    setMsg(`Import terminé. Collisions: ${collisions.length}`);
    await load();
  };

  const clearAll = async () => {
    if (!confirm('Effacer toutes les données locales ?')) return;
    const { db } = await import('@/lib/db');
    await db.transaction('rw', db.articles, async () => {
      await db.articles.clear();
    });
    await load();
    setMsg('Base vidée.');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventaire</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportJSON}>Exporter JSON</Button>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && importJSON(e.target.files[0])} />
            <span className="px-3 py-2 border rounded text-sm">Importer JSON</span>
          </label>
          <Button variant="destructive" onClick={clearAll}>Vider la base</Button>
        </div>
      </div>
      {msg && <div className="text-sm text-muted-foreground">{msg}</div>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Casse</TableHead>
            <TableHead>Dispo (aujourd&apos;hui)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.nom}</TableCell>
              <TableCell>{a.categorie || '-'}</TableCell>
              <TableCell>{a.qteTotale}</TableCell>
              <TableCell>{a.qteCasse}</TableCell>
              <TableCell>
                <DispoCell article={a} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DispoCell({ article }: { article: Article }) {
  const v = Math.max(0, (article.qteTotale || 0) - (article.qteCasse || 0));
  return <span>{v}</span>;
}
