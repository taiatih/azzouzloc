'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { reservationHelpers, reservationItemHelpers, articleHelpers } from '@/lib/db';
import { Reservation, ReservationItem, Article, Statut } from '@/lib/models';

interface ReservationWithDetails extends Reservation {
  items: (ReservationItem & { article: Article })[];
  total: number;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all'|'past'|'current'|'upcoming'|'drafts'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const reservationsData = await reservationHelpers.list();
      const itemsData = await reservationItemHelpers.list();
      const articlesData = await articleHelpers.list();

      const reservationsWithDetails: ReservationWithDetails[] = await Promise.all(
        reservationsData.map(async (reservation) => {
          const items = itemsData
            .filter(item => item.reservationId === reservation.id)
            .map(item => {
              const article = articlesData.find(a => a.id === item.articleId);
              return {
                ...item,
                article: article || {
                  id: item.articleId,
                  nom: 'Article supprimé',
                  prixJour: item.prixJourSnapshot,
                  qteTotale: 0,
                  qteCasse: 0,
                  actif: false,
                },
              };
            });

          const jours = Math.ceil(
            (new Date(reservation.dateFin).getTime() - new Date(reservation.dateDebut).getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

          const total = items.reduce((sum, item) => {
            return sum + (item.qte * item.prixJourSnapshot * jours);
          }, 0);

          return {
            ...reservation,
            items,
            total,
          };
        })
      );

      // Trier par date de création (plus récent en premier)
      reservationsWithDetails.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReservations(reservationsWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reservationId: string, newStatus: Statut) => {
    try {
      await reservationHelpers.update(reservationId, { 
        statut: newStatus,
        updatedAt: new Date().toISOString()
      });
      loadReservations();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (reservationId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
      try {
        // Supprimer les items de réservation
        const items = await reservationItemHelpers.listByReservation(reservationId);
        for (const item of items) {
          await reservationItemHelpers.delete(item.id);
        }
        
        // Supprimer la réservation
        await reservationHelpers.delete(reservationId);
        loadReservations();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const getStatusColor = (status: Statut) => {
    switch (status) {
      case 'brouillon': return 'bg-gray-100 text-gray-800';
      case 'confirmee': return 'bg-blue-100 text-blue-800';
      case 'en_cours': return 'bg-green-100 text-green-800';
      case 'cloturee': return 'bg-purple-100 text-purple-800';
      case 'annulee': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Statut) => {
    switch (status) {
      case 'brouillon': return 'Brouillon';
      case 'confirmee': return 'Confirmée';
      case 'en_cours': return 'En cours';
      case 'cloturee': return 'Clôturée';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredReservations = reservations.filter((r) => {
    if (search) {
      const s = search.toLowerCase();
      const match = (r.clientNom||'').toLowerCase().includes(s) || (r.clientTel||'').toLowerCase().includes(s);
      if (!match) return false;
    }
    if (tab === 'drafts') return r.statut === 'brouillon';
    if (tab === 'current') return r.dateDebut <= todayStr && r.dateFin >= todayStr && r.statut === 'en_cours';
    if (tab === 'upcoming') return r.dateDebut > todayStr && (r.statut === 'en_cours' || r.statut === 'brouillon');
    if (tab === 'past') return r.dateFin < todayStr && (r.statut === 'cloturee' || r.statut === 'annulee');
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-600">Gérez vos réservations clients</p>
        </div>
        <Link href="/reservations/nouvelle" className="btn-primary text-sm">
          Nouvelle Réservation
        </Link>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-wrap gap-2 items-center">
          {([
            {k:'all', label:'Toutes'},
            {k:'current', label:'En cours'},
            {k:'upcoming', label:'À venir'},
            {k:'past', label:'Passées'},
            {k:'drafts', label:'Brouillons'},
          ] as {k: typeof tab, label: string}[]).map(t => (
            <button key={t.k}
              onClick={()=>setTab(t.k)}
              className={`px-3 py-1 rounded-full text-sm ${tab===t.k?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >{t.label}</button>
          ))}
          <input placeholder="Recherche client/téléphone" value={search} onChange={(e)=>setSearch(e.target.value)} className="input-field ml-auto w-full sm:w-64" />
        </div>
      </div>

      {/* Liste des réservations */}
      <div className="space-y-4">
        {filteredReservations.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucune réservation trouvée</p>
          </div>
        ) : (
          filteredReservations.map((reservation) => (
            <div key={reservation.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Réservation #{reservation.id.slice(-6)}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(reservation.statut)}`}>
                      {getStatusLabel(reservation.statut)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Période:</span> {reservation.dateDebut} au {reservation.dateFin}
                    </div>
                    {reservation.clientNom && (
                      <div>
                        <span className="font-medium">Client:</span> {reservation.clientNom}
                        {reservation.clientTel && ` - ${reservation.clientTel}`}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Total:</span> {reservation.total} DA
                    </div>
                    {reservation.acompte && (
                      <div>
                        <span className="font-medium">Acompte:</span> {reservation.acompte} DA
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <select
                    value={reservation.statut}
                    onChange={(e) => handleStatusChange(reservation.id, e.target.value as Statut)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="en_cours">En cours</option>
                    <option value="cloturee">Clôturée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                  <div className="flex gap-2">
                    {reservation.statut==='brouillon' && (
                      <button onClick={()=>handleStatusChange(reservation.id,'en_cours')} className="text-xs text-green-600">Démarrer</button>
                    )}
                    {reservation.statut==='en_cours' && (
                      <button onClick={()=>handleStatusChange(reservation.id,'cloturee')} className="text-xs text-purple-600">Clôturer</button>
                    )}
                    <Link href={`/reservations/edit?id=${reservation.id}`} className="text-xs text-blue-600">Modifier</Link>
                    <button onClick={() => handleDelete(reservation.id)} className="text-xs text-red-600 hover:text-red-800">Supprimer</button>
                  </div>
                </div>
              </div>

              {/* Articles de la réservation */}
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Articles:</h4>
                <div className="space-y-1">
                  {reservation.items.map((item) => {
                    const jours = Math.ceil(
                      (new Date(reservation.dateFin).getTime() - new Date(reservation.dateDebut).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    const sousTotal = item.qte * item.prixJourSnapshot * jours;
                    
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.article.nom} x{item.qte} ({jours} jours à {item.prixJourSnapshot} DA/jour)
                        </span>
                        <span className="font-medium">{sousTotal} DA</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {reservation.note && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Note:</h4>
                  <p className="text-sm text-gray-600">{reservation.note}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

