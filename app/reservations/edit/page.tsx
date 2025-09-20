"use client";
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { articleHelpers, reservationHelpers, reservationItemHelpers } from '@/lib/db';
import type { Article, Reservation, ReservationItem } from '@/lib/models';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import MultiArticleSelect from '@/components/MultiArticleSelect';

function Editor(){
  const search = useSearchParams();
  const router = useRouter();
  const id = search.get('id') || '';
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<{id:string; qte:number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      if (!id) { router.push('/reservations'); return; }
      const r = await reservationHelpers.get(id);
      const items = await reservationItemHelpers.listByReservation(id);
      const arts = await articleHelpers.list();
      setReservation(r||null);
      setArticles(arts);
      setSelected(items.map(i=>({ id: i.articleId, qte: i.qte })));
      setLoading(false);
    })();
  },[id]);

  if (loading || !reservation) return <div className="p-4">Chargement…</div>;

  const save = async () => {
    const now = new Date().toISOString();
    await reservationHelpers.update(id, { dateDebut: reservation.dateDebut, dateFin: reservation.dateFin, clientNom: reservation.clientNom, clientTel: reservation.clientTel, note: reservation.note, updatedAt: now });
    const existing = await reservationItemHelpers.listByReservation(id);
    for (const it of existing) await reservationItemHelpers.delete(it.id);
    for (const sel of selected) {
      const art = articles.find(a=>a.id===sel.id)!;
      const item: ReservationItem = { id: `${id}_${sel.id}`, reservationId: id, articleId: sel.id, qte: sel.qte, prixJourSnapshot: art.prixJour };
      await reservationItemHelpers.create(item);
    }
    alert('Réservation mise à jour');
    router.push('/reservations');
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Modifier la réservation</h1>

      <div className="card space-y-4">
        <div>
          <label className="text-sm">Période</label>
          <DatePicker selectsRange startDate={new Date(reservation.dateDebut)} endDate={new Date(reservation.dateFin)} onChange={(rng:any)=>{
            const [s,e]=rng; setReservation(r=>r?{...r, dateDebut: s? new Date(s).toISOString().split('T')[0]: r.dateDebut, dateFin: e? new Date(e).toISOString().split('T')[0]: r.dateFin }:r);
          }} className="input-field" dateFormat="dd/MM/yyyy" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Client</label>
            <input className="input-field" value={reservation.clientNom||''} onChange={(e)=>setReservation(r=>r?{...r, clientNom:e.target.value}:r)} />
          </div>
          <div>
            <label className="text-sm">Téléphone</label>
            <input className="input-field" value={reservation.clientTel||''} onChange={(e)=>setReservation(r=>r?{...r, clientTel:e.target.value}:r)} />
          </div>
        </div>
        <div>
          <label className="text-sm">Note</label>
          <textarea className="input-field" value={reservation.note||''} onChange={(e)=>setReservation(r=>r?{...r, note:e.target.value}:r)} />
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Articles et quantités</h2>
        <MultiArticleSelect
          articles={articles.map(a=>({ ...a }))}
          value={selected}
          onChange={setSelected}
        />
      </div>

      <div className="flex gap-2">
        <button className="btn-primary" onClick={save}>Enregistrer</button>
        <button className="btn-secondary" onClick={()=>router.push('/reservations')}>Annuler</button>
      </div>
    </div>
  );
}

export default function Page(){
  return (
    <Suspense fallback={<div className="p-4">Chargement…</div>}>
      <Editor />
    </Suspense>
  );
}
