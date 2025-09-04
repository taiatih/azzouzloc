"use client";
import { useEffect, useMemo, useState } from 'react';
import { ArticleRepo, ReservationItemRepo, ReservationRepo } from '@/lib/db';
import type { Article, Reservation, ReservationItem } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { qteDisponible } from '@/lib/availability';

const toISO = (d: Date) => d.toISOString().slice(0,10);

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const [rs, its, arts] = await Promise.all([
      ReservationRepo.list(),
      ReservationItemRepo.list(),
      ArticleRepo.list(),
    ]);
    setReservations(rs.sort((a,b) => a.dateDebut.localeCompare(b.dateDebut)));
    setItems(its);
    setArticles(arts);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const itemsByRes = useMemo(() => {
    const m = new Map<string, ReservationItem[]>();
    for (const it of items) {
      const arr = m.get(it.reservationId) || [];
      arr.push(it);
      m.set(it.reservationId, arr);
    }
    return m;
  }, [items]);

  const updateTodayStatuses = async () => {
    const today = toISO(new Date());
    for (const r of reservations) {
      if (r.statut === 'confirmee' && r.dateDebut === today) {
        await ReservationRepo.update(r.id, { statut: 'en_cours' });
      }
      if (r.statut === 'en_cours' && r.dateFin === today) {
        await ReservationRepo.update(r.id, { statut: 'cloturee' });
      }
    }
    await load();
    setMsg('Statuts mis à jour pour le jour en cours.');
  };

  const confirmReservation = async (r: Reservation) => {
    // verify availability per line
    const lines = itemsByRes.get(r.id) || [];
    for (const it of lines) {
      const art = articles.find(a => a.id === it.articleId);
      if (!art) continue;
      const dispo = await qteDisponible(art, r.dateDebut, r.dateFin);
      if (it.qte > dispo) { alert(`Indisponible: ${art.nom} (${it.qte} > ${dispo})`); return; }
    }
    await ReservationRepo.update(r.id, { statut: 'confirmee' });
    await load();
  };

  const setStatus = async (r: Reservation, statut: Reservation['statut']) => {
    await ReservationRepo.update(r.id, { statut });
    await load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Réservations</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={updateTodayStatuses}>Mettre à jour statuts (jour)</Button>
          <Link href="/reservations/nouvelle" className="px-3 py-2 border rounded text-sm">Nouvelle réservation</Link>
        </div>
      </div>
      {msg && <div className="text-sm text-muted-foreground">{msg}</div>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Détails</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => {
            const its = itemsByRes.get(r.id) || [];
            return (
              <TableRow key={r.id}>
                <TableCell>{r.clientNom || '-'}</TableCell>
                <TableCell>{r.dateDebut} → {r.dateFin}</TableCell>
                <TableCell>{r.statut}</TableCell>
                <TableCell>
                  <ul className="text-sm list-disc pl-5">
                    {its.map(it => {
                      const a = articles.find(x => x.id === it.articleId);
                      return <li key={it.id}>{a?.nom || it.articleId} × {it.qte}</li>;
                    })}
                  </ul>
                </TableCell>
                <TableCell className="space-x-2">
                  {r.statut === 'brouillon' && <Button onClick={() => confirmReservation(r)}>Confirmer</Button>}
                  {r.statut !== 'annulee' && <Button variant="secondary" onClick={() => setStatus(r,'annulee')}>Annuler</Button>}
                  {r.statut === 'confirmee' && <Button variant="secondary" onClick={() => setStatus(r,'en_cours')}>Démarrer</Button>}
                  {r.statut === 'en_cours' && <Button variant="secondary" onClick={() => setStatus(r,'cloturee')}>Clôturer</Button>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
