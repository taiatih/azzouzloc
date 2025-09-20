"use client";
import { useMemo, useState } from 'react';
import type { Article } from '@/lib/models';

export interface SelectableArticle extends Article { qteDisponible?: number }

export default function MultiArticleSelect({
  articles,
  value,
  onChange,
}: {
  articles: SelectableArticle[];
  value: { id: string; qte: number }[];
  onChange: (next: { id: string; qte: number }[]) => void;
}){
  const [query, setQuery] = useState('');
  const selectedMap = useMemo(() => new Map(value.map(v => [v.id, v.qte])), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a => a.nom.toLowerCase().includes(q) || (a.categorie||'').toLowerCase().includes(q));
  }, [articles, query]);

  const setQty = (id: string, qte: number) => {
    if (qte <= 0) {
      onChange(value.filter(v => v.id !== id));
    } else if (value.find(v => v.id === id)) {
      onChange(value.map(v => v.id === id ? { ...v, qte } : v));
    } else {
      onChange([...value, { id, qte }]);
    }
  };

  const inc = (id: string, max?: number) => {
    const cur = selectedMap.get(id) || 0;
    const next = Math.min((max ?? Infinity), cur + 1);
    setQty(id, next);
  };
  const dec = (id: string) => {
    const cur = selectedMap.get(id) || 0;
    setQty(id, Math.max(0, cur - 1));
  };
  const setMax = (id: string, max?: number) => setQty(id, Math.max(0, max ?? 0));

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Rechercher un article..."
        value={query}
        onChange={(e)=>setQuery(e.target.value)}
        className="input-field"
      />

      <div className="space-y-2 max-h-72 overflow-auto">
        {filtered.map((a) => {
          const sel = selectedMap.get(a.id) || 0;
          const max = a.qteDisponible ?? (a.qteTotale - a.qteCasse);
          const disabled = max <= 0;
          return (
            <div key={a.id} className={`border border-gray-200 rounded-lg p-3 ${disabled?'opacity-50':''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{a.nom}</div>
                  <div className="text-xs text-gray-600">
                    {a.categorie || '—'} · {a.prixJour} DA/j · Dispo: <span className={max>0?'text-green-600':'text-red-600'}>{max}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary px-2 py-1" onClick={()=>dec(a.id)} disabled={disabled && sel===0}>−</button>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" className="w-16 input-field text-center" value={sel}
                    onChange={(e)=>setQty(a.id, Math.max(0, parseInt(e.target.value||'0')))} disabled={disabled}
                  />
                  <button type="button" className="btn-secondary px-2 py-1" onClick={()=>inc(a.id, max)} disabled={disabled}>＋</button>
                  <button type="button" className="px-2 py-1 text-xs text-blue-600" onClick={()=>setMax(a.id, max)} disabled={disabled}>max</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0 && (
          <div className="text-center py-6 text-gray-500">Aucun article</div>
        )}
      </div>
    </div>
  );
}
