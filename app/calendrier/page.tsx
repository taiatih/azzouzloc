'use client';

import { useEffect, useState } from 'react';
import { reservationHelpers, reservationItemHelpers, articleHelpers } from '@/lib/db';
import { Reservation, ReservationItem, Article } from '@/lib/models';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  reservations: (Reservation & { items: (ReservationItem & { article: Article })[] })[];
}

export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [reservations, setReservations] = useState<(Reservation & { items: (ReservationItem & { article: Article })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includeCanceled, setIncludeCanceled] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, reservations, includeDrafts, includeCanceled]);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, reservations]);

  const loadReservations = async () => {
    try {
      const reservationsData = await reservationHelpers.list();
      const itemsData = await reservationItemHelpers.list();
      const articlesData = await articleHelpers.list();

      const reservationsWithItems = reservationsData.map(reservation => {
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

        return {
          ...reservation,
          items,
        };
      });

      setReservations(reservationsWithItems);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendar = () => {
    const allowed: string[] = ['confirmee','en_cours'];
    if (includeDrafts) allowed.push('brouillon');
    if (includeCanceled) allowed.push('annulee');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    
    // Premier jour de la semaine (lundi = 1, dimanche = 0)
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    // Générer 42 jours (6 semaines)
    const calendarDays: CalendarDay[] = [];
    const currentDateForLoop = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDateForLoop.getMonth() === month;
      const dateStr = currentDateForLoop.toISOString().split('T')[0];
      
      // Trouver les réservations pour ce jour
      const dayReservations = reservations.filter(reservation => {
        return allowed.includes(reservation.statut) && dateStr >= reservation.dateDebut && dateStr <= reservation.dateFin;
      });
      
      calendarDays.push({
        date: new Date(currentDateForLoop),
        isCurrentMonth,
        reservations: dayReservations,
      });
      
      currentDateForLoop.setDate(currentDateForLoop.getDate() + 1);
    }
    
    setCalendar(calendarDays);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_cours': return 'bg-green-500';
      case 'brouillon': return 'bg-gray-400';
      case 'cloturee': return 'bg-purple-500';
      case 'annulee': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
          <p className="text-gray-600">Vue d'ensemble des réservations</p>
        </div>
        <button
          onClick={goToToday}
          className="btn-secondary text-sm"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Navigation du calendrier */}
      <div className="card">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeDrafts} onChange={(e)=>setIncludeDrafts(e.target.checked)} />
            Inclure brouillons
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeCanceled} onChange={(e)=>setIncludeCanceled(e.target.checked)} />
            Inclure annulées
          </label>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className="card">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Jours du calendrier */}
        <div className="grid grid-cols-7 gap-1">
          {calendar.map((day, index) => {
            const isToday = day.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                onClick={() => setSelectedDay(day)}
                className={`
                  min-h-[80px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50
                  ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${isToday ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div className={`inline-flex items-center justify-center size-6 text-sm font-medium rounded-full ${isToday ? 'bg-blue-100 text-blue-700' : ''} ${selectedDay && selectedDay.date.toDateString()===day.date.toDateString() ? 'bg-blue-600 text-white' : ''}`}>
                  {day.date.getDate()}
                </div>
                
                {/* Indicateurs de réservations */}
                <div className="space-y-1">
                  {day.reservations.slice(0, 2).map((reservation) => (
                    <div
                      key={reservation.id}
                      className={`text-xs px-1 py-0.5 rounded text-white truncate ${getStatusColor(reservation.statut)}`}
                    >
                      {reservation.clientNom || `Rés. #${reservation.id.slice(-4)}`}
                    </div>
                  ))}
                  {day.reservations.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{day.reservations.length - 2} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détails du jour sélectionné */}
      {selectedDay && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {formatDate(selectedDay.date)}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {selectedDay.reservations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Aucune réservation pour cette date
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDay.reservations.map((reservation) => (
                <div key={reservation.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {reservation.clientNom || `Réservation #${reservation.id.slice(-6)}`}
                      </h4>
                      <div className="text-sm text-gray-600">
                        Du {reservation.dateDebut} au {reservation.dateFin}
                      </div>
                      {reservation.clientTel && (
                        <div className="text-sm text-gray-600">
                          📞 {reservation.clientTel}
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full text-white ${getStatusColor(reservation.statut)}`}>
                      {reservation.statut}
                    </span>
                  </div>
                  
                  {/* Articles de la réservation */}
                  <div className="border-t pt-2">
                    <div className="text-sm font-medium text-gray-700 mb-1">Articles:</div>
                    <div className="space-y-1">
                      {reservation.items.map((item) => (
                        <div key={item.id} className="text-sm text-gray-600">
                          • {item.article.nom} x{item.qte}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {reservation.note && (
                    <div className="border-t pt-2 mt-2">
                      <div className="text-sm font-medium text-gray-700 mb-1">Note:</div>
                      <div className="text-sm text-gray-600">{reservation.note}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Légende */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Légende</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Confirmée</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>En cours</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 border-2 border-blue-500 rounded mr-2"></div>
            <span>Aujourd'hui</span>
          </div>
        </div>
      </div>
    </div>
  );
}

