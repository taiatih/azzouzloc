"use client";
import { useEffect, useMemo, useState } from 'react';
import { ArticleRepo } from '@/lib/db';
import type { Article } from '@/lib/models';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CasseLog { id: string; articleId: string; qte: number; motif?: string; at: string; }
const LS_KEY = 'azzouz-casse-logs';

export default function CassePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string>('');
  const [qty, setQty] = useState<number>(0);
  const [motif, setMotif] = useState('');
  const [logs, setLogs] = useState<CasseLog[]>([]);
  const [msg, setMsg] = useState('');

  const load = async () => { setArticles(await ArticleRepo.list()); };
  useEffect(() => { load(); readLogs(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = articles;
    return t ? all.filter(a => a.nom.toLowerCase().includes(t) || (a.categorie || '').toLowerCase().includes(t)) : all;
  }, [articles, q]);

  const readLogs = () => {
    try { const raw = localStorage.getItem(LS_KEY); setLogs(raw ? JSON.parse(raw) : []); } catch { setLogs([]); }
  };
  const writeLogs = (arr: CasseLog[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0,200))); } catch {} };

  const submit = async () => {
    const a = articles.find(x => x.id === sel);
    if (!a) { setMsg('Sélectionnez un article'); return; }
    if (qty <= 0) { setMsg('Quantité invalide'); return; }
    const newCasse = a.qteCasse + qty;
    if (newCasse > a.qteTotale) { setMsg('Dépasse le total'); return; }
    await ArticleRepo.update(a.id, { qteCasse: newCasse });
    const log: CasseLog = { id: crypto.randomUUID(), articleId: a.id, qte: qty, motif: motif || undefined, at: new Date().toISOString() };
    const next = [log, ...logs]; setLogs(next); writeLogs(next);
    setQty(0); setMotif(''); setMsg('Casse enregistrée');
    await load();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Casse</h1>
      {msg && <div className="text-sm text-muted-foreground">{msg}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label>Recherche</label>
          <Input placeholder="Nom ou catégorie" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-48 overflow-auto border rounded">
            {filtered.map(a => (
              <div key={a.id} className={`px-2 py-1 cursor-pointer ${sel===a.id ? 'bg-accent' : ''}`} onClick={() => setSel(a.id)}>
                {a.nom} <span className="text-xs text-muted-foreground">({a.categorie || '-'})</span>
              </div>
            ))}
            {!filtered.length && <div className="px-2 py-1 text-sm text-muted-foreground">Aucun résultat</div>}
          </div>
        </div>
        <div className="space-y-2">
          <label>Quantité cassée</label>
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          <label>Motif</label>
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} />
          <Button onClick={submit}>Enregistrer</Button>
        </div>
        <div className="space-y-2">
          <label>Résumé</label>
          <div className="border rounded p-2 min-h-24 text-sm">
            {sel ? (() => { const a = articles.find(x => x.id === sel)!; return (
              <div>
                <div className="font-medium">{a.nom}</div>
                <div>Total: {a.qteTotale}</div>
                <div>Casse actuelle: {a.qteCasse}</div>
                <div>Après enregistrement: {a.qteCasse + (qty||0)}</div>
              </div>
            ); })() : <div className="text-muted-foreground">Sélectionnez un article</div>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-medium">Historique récent</h2>
        <div className="border rounded p-2 max-h-64 overflow-auto text-sm">
          {logs.map(l => {
            const a = articles.find(x => x.id === l.articleId);
            return (
              <div key={l.id} className="flex items-center justify-between border-b last:border-b-0 py-1">
                <div>{new Date(l.at).toLocaleString()} — {a?.nom || l.articleId}</div>
                <div>+{l.qte} {l.motif ? `(${l.motif})` : ''}</div>
              </div>
            );
          })}
          {!logs.length && <div className="text-muted-foreground">Aucun événement</div>}
        </div>
      </div>
    </div>
  );
}
