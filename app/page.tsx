'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { articleHelpers, reservationHelpers } from '@/lib/db';
import { Article, Reservation } from '@/lib/models';

export default function Dashboard() {
  const [stats, setStats] = useState({
    articlesActifs: 0,
    reservationsAujourdhui: 0,
    reservations7Jours: 0,
    alertesStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const articles = await articleHelpers.listActifs();
      const reservations = await reservationHelpers.list();
      
      const today = new Date().toISOString().split('T')[0];
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const reservationsToday = reservations.filter(r => 
        r.dateDebut <= today && r.dateFin >= today && 
        (r.statut === 'confirmee' || r.statut === 'en_cours')
      );
      
      const reservationsNext7Days = reservations.filter(r => 
        r.dateDebut <= in7Days && r.dateFin >= today && 
        (r.statut === 'confirmee' || r.statut === 'en_cours')
      );
      
      const alertes = articles.filter(a => 
        a.seuilAlerte && (a.qteTotale - a.qteCasse) <= a.seuilAlerte
      );

      setStats({
        articlesActifs: articles.length,
        reservationsAujourdhui: reservationsToday.length,
        reservations7Jours: reservationsNext7Days.length,
        alertesStock: alertes.length,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Vue d'ensemble de votre activité de location</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.articlesActifs}</div>
            <div className="text-sm text-gray-600">Articles actifs</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.reservationsAujourdhui}</div>
            <div className="text-sm text-gray-600">Réservations aujourd'hui</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.reservations7Jours}</div>
            <div className="text-sm text-gray-600">Réservations 7 jours</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.alertesStock}</div>
            <div className="text-sm text-gray-600">Alertes stock</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="space-y-3">
          <Link href="/articles" className="block p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-900">Gérer les articles</div>
                <div className="text-sm text-blue-600">Ajouter, modifier ou supprimer des articles</div>
              </div>
              <span className="text-blue-600">📦</span>
            </div>
          </Link>
          
          <Link href="/reservations/nouvelle" className="block p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-green-900">Nouvelle réservation</div>
                <div className="text-sm text-green-600">Créer une nouvelle réservation client</div>
              </div>
              <span className="text-green-600">➕</span>
            </div>
          </Link>
          
          <Link href="/inventaire" className="block p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-purple-900">Inventaire</div>
                <div className="text-sm text-purple-600">Consulter l'état des stocks</div>
              </div>
              <span className="text-purple-600">📋</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

