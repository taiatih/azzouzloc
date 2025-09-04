"use client";
import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, format, isSameMonth, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArticleRepo, ReservationItemRepo, ReservationRepo } from '@/lib/db';
import type { Article, Reservation, ReservationItem } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function daysGrid(current: Date) {
  const start = startOfMonth(current);
  const end = endOfMonth(current);
  const startDay = new Date(start);
  startDay.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday start
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(startDay, i));
  return days;
}

function dateInInterval(d: Date, a: string, b: string) {
  const dd = new Date(format(d, 'yyyy-MM-dd'));
  return !(new Date(a) > dd || new Date(b) < dd);
}

export default function CalendrierPage() {
  const [month, setMonth] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [showConf, setShowConf] = useState(true);
  const [showEnCours, setShowEnCours] = useState(true);

  useEffect(() => {
    (async () => {
      const [rs, its, arts] = await Promise.all([
        ReservationRepo.byStatus(['confirmee', 'en_cours']),
        ReservationItemRepo.list(),
        ArticleRepo.list(),
      ]);
      setReservations(rs);
      setItems(its);
      setArticles(arts);
    })();
  }, []);

  const grid = daysGrid(month);
  const itemsByRes = useMemo(() => {
    const m = new Map<string, ReservationItem[]>();
    for (const it of items) {
      const arr = m.get(it.reservationId) || [];
      arr.push(it);
      m.set(it.reservationId, arr);
    }
    return m;
  }, [items]);

  const filteredReservations = useMemo(() => {
    const t = filterClient.trim().toLowerCase();
    return reservations
      .filter(r => (r.statut === 'confirmee' ? showConf : r.statut === 'en_cours' ? showEnCours : false))
      .filter(r => !t || (r.clientNom || '').toLowerCase().includes(t) || (r.clientTel || '').includes(t));
  }, [reservations, showConf, showEnCours, filterClient]);

  const dayReservations = (d: Date) => filteredReservations.filter(r => dateInInterval(d, r.dateDebut, r.dateFin));

  const statusColor = (s: Reservation['statut']) => s === 'en_cours' ? 'bg-green-600' : 'bg-blue-600';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendrier</h1>
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => setMonth(addMonths(month, -1))}>Mois précédent</Button>
          <Button variant="secondary" onClick={() => setMonth(new Date())}>Aujourd&apos;hui</Button>
          <Button variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>Mois suivant</Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">{format(month, 'MMMM yyyy', { locale: fr })}</div>
        <div className="flex items-center gap-3">
          <input id="conf" type="checkbox" checked={showConf} onChange={(e) => setShowConf(e.target.checked)} />
          <label htmlFor="conf" className="text-sm">Confirmées</label>
          <input id="encours" type="checkbox" checked={showEnCours} onChange={(e) => setShowEnCours(e.target.checked)} />
          <label htmlFor="encours" className="text-sm">En cours</label>
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Filtrer client/téléphone"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d) => (
          <div key={d} className="text-sm text-muted-foreground px-2">{d}</div>
        ))}
        {grid.map((d) => {
          const inMonth = isSameMonth(d, month);
          const dayRs = dayReservations(d);
          return (
            <div key={d.toISOString()} className={`border rounded p-1 min-h-[110px] ${inMonth ? '' : 'opacity-50'}`}>
              <div className={`flex items-center justify-between text-xs ${isToday(d) ? 'font-semibold' : ''}`}>
                <span>{format(d, 'd')}</span>
                {dayRs.length > 0 && <span className="text-xs text-muted-foreground">{dayRs.length}</span>}
              </div>
              <div className="space-y-1 pt-1">
                {dayRs.slice(0,3).map((r) => (
                  <div
                    key={r.id}
                    title={`${r.clientNom || ''} (${r.dateDebut} → ${r.dateFin})`}
                    className={`h-2 rounded ${statusColor(r.statut)}`}
                    onClick={() => { setSelectedDay(d); setOpen(true); }}
                  />
                ))}
                {dayRs.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayRs.length - 3} autres</div>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du {selectedDay ? format(selectedDay, 'PPP', { locale: fr }) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {selectedDay && dayReservations(selectedDay).map((r) => {
              const its = itemsByRes.get(r.id) || [];
              return (
                <div key={r.id} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.clientNom || 'Sans nom'}</div>
                      <div className="text-xs text-muted-foreground">{r.dateDebut} → {r.dateFin}</div>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded text-white ${statusColor(r.statut)}`}>{r.statut}</div>
                  </div>
                  <div className="text-sm pt-2 space-y-1">
                    {its.map((it) => {
                      const art = articles.find(a => a.id === it.articleId);
                      return (
                        <div key={it.id} className="flex items-center justify-between">
                          <div>{art?.nom || it.articleId} × {it.qte}</div>
                          <div className="text-muted-foreground">{it.prixJourSnapshot} DA/j</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {selectedDay && dayReservations(selectedDay).length === 0 && (
              <div className="text-sm text-muted-foreground">Aucune réservation ce jour.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
