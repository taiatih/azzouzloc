"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { ArticleRepo, ReservationItemRepo, ReservationRepo } from '@/lib/db';
import type { Article, Reservation, ReservationItem } from '@/lib/models';
import { qteDisponible } from '@/lib/availability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DateRangePicker from '@/components/DateRangePicker';
import { useSettingsStore } from '@/lib/store';

const toISO = (d: Date) => d.toISOString().slice(0,10);

export default function NouvelleReservationPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const [from, setFrom] = useState<Date>(new Date(settings.dateFrom));
  const [to, setTo] = useState<Date>(new Date(settings.dateTo));

  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [avail, setAvail] = useState<Record<string, number>>({});
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clientNom, setClientNom] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => { ArticleRepo.list().then(setArticles); }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingAvail(true);
      const map: Record<string, number> = {};
      await Promise.all(articles.map(async (a) => {
        const n = await qteDisponible(a, toISO(from), toISO(to));
        map[a.id] = n;
      }));
      if (mounted) setAvail(map);
      setLoadingAvail(false);
    })();
    return () => { mounted = false; };
  }, [articles, from, to]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a => a.nom.toLowerCase().includes(q) || (a.categorie || '').toLowerCase().includes(q));
  }, [articles, filter]);

  const selectedLines = useMemo(() => Object.entries(qty)
    .filter(([, v]) => (v || 0) > 0)
    .map(([id, v]) => ({ id, qte: v || 0 })), [qty]);

  const days = useMemo(() => Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000*60*60*24)) + 1), [from, to]);
  const anyOver = selectedLines.some(({ id, qte }) => qte > (avail[id] ?? 0));
  const canConfirm = selectedLines.length > 0 && !anyOver && !saving && !loadingAvail;
  const total = useMemo(() => selectedLines.reduce((sum, l) => {
    const a = articles.find(x => x.id === l.id);
    return sum + (a ? a.prixJour * l.qte * days : 0);
  }, 0), [selectedLines, articles, days]);

  const onSave = async (statut: Reservation['statut']) => {
    if (saving) return;
    setSaving(true);
    try {
      const id = nanoid();
      const now = new Date().toISOString();
      const reservation: Reservation = {
        id,
        dateDebut: toISO(from),
        dateFin: toISO(to),
        clientNom: clientNom || undefined,
        clientTel: clientTel || undefined,
        note: note || undefined,
        statut,
        acompte: undefined,
        createdAt: now,
        updatedAt: now,
      };
      await ReservationRepo.create(reservation);
      for (const line of selectedLines) {
        const art = articles.find(a => a.id === line.id)!;
        const item: ReservationItem = {
          id: nanoid(),
          reservationId: id,
          articleId: line.id,
          qte: line.qte,
          prixJourSnapshot: art.prixJour,
        };
        await ReservationItemRepo.create(item);
      }
      router.push('/reservations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle réservation</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Période</label>
          <DateRangePicker value={{ from, to }} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Client</label>
          <Input placeholder="Nom du client" value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
          <Input placeholder="Téléphone" value={clientTel} onChange={(e) => setClientTel(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Note</label>
          <Textarea placeholder="Notes..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Rechercher un article..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onSave('brouillon')} disabled={saving}>Enregistrer brouillon</Button>
          <Button onClick={() => onSave('confirmee')} disabled={!canConfirm}>Confirmer</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Prix/jour</TableHead>
            <TableHead>Dispo</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((a) => {
            const dispon = avail[a.id] ?? 0;
            const q = qty[a.id] ?? 0;
            const over = q > dispon;
            return (
              <TableRow key={a.id}>
                <TableCell>{a.nom}</TableCell>
                <TableCell>{a.categorie || '-'}</TableCell>
                <TableCell>{a.prixJour}</TableCell>
                <TableCell className={over ? 'text-red-600' : ''}>{loadingAvail ? '...' : dispon}</TableCell>
                <TableCell>
                  <Input type="number" min={0} value={q} onChange={(e) => setQty((s) => ({ ...s, [a.id]: Number(e.target.value) }))} />
                  {over && <div className="text-xs text-red-600">Indisponible</div>}
                </TableCell>
                <TableCell>{(q || 0) * a.prixJour * days}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="border rounded p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Récapitulatif</div>
            <div className="text-xs text-muted-foreground">{days} jour(s)</div>
          </div>
          <div className="text-2xl font-semibold">{total} DA</div>
        </div>
        <div className="text-sm">
          {selectedLines.map(l => {
            const a = articles.find(x => x.id === l.id)!;
            const lineTotal = a.prixJour * l.qte * days;
            const over = l.qte > (avail[l.id] ?? 0);
            return (
              <div key={l.id} className="flex items-center justify-between">
                <div>{a.nom} × {l.qte} @ {a.prixJour} DA/j</div>
                <div className={over ? 'text-red-600' : ''}>{lineTotal} DA</div>
              </div>
            );
          })}
          {anyOver && <div className="text-red-600 text-sm">Certaines lignes sont indisponibles. Ajustez les quantités.</div>}
        </div>
      </div>
    </div>
  );
}
