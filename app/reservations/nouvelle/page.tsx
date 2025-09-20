
'use client';

import { useEffect, useState, useCallback } from 'react';
import { articleHelpers, reservationHelpers, reservationItemHelpers } from '@/lib/db';
import { qteDisponible } from '@/lib/availability';
import { Article, Reservation, ReservationItem } from '@/lib/models';
import DatePicker from 'react-datepicker';
import MultiArticleSelect from '@/components/MultiArticleSelect';
import 'react-datepicker/dist/react-datepicker.css';
import { registerLocale, setDefaultLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale/fr';

registerLocale('fr', fr);
setDefaultLocale('fr');

interface ArticleWithQte extends Article {
  qteDisponible: number;
  qteDemandee: number;
}

export default function NouvelleReservationPage() {
  const [allArticles, setAllArticles] = useState<ArticleWithQte[]>([]); // Tous les articles actifs
  const [articlesWithAvailability, setArticlesWithAvailability] = useState<ArticleWithQte[]>([]); // Articles avec dispo calculée
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    dateDebut: null as Date | null,
    dateFin: null as Date | null,
    clientNom: '',
    clientTel: '',
    note: '',
    acompte: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticles, setSelectedArticles] = useState<ArticleWithQte[]>([]);
  const [isUpdatingDisponibilites, setIsUpdatingDisponibilites] = useState(false);

  useEffect(() => {
    loadAllArticles();
  }, []);

  useEffect(() => {
    if (formData.dateDebut && formData.dateFin) {
      updateDisponibilites();
    } else {
      setArticlesWithAvailability(allArticles.map(article => ({ ...article, qteDisponible: article.qteTotale - article.qteCasse })));
    }
  }, [formData.dateDebut, formData.dateFin, allArticles]);

  const loadAllArticles = async () => {
    try {
      const data = await articleHelpers.listActifs();
      const articlesWithInitialQte = data.map(article => ({
        ...article,
        qteDisponible: article.qteTotale - article.qteCasse, // Initialiser avec la quantité totale - casse
        qteDemandee: 0,
      }));
      setAllArticles(articlesWithInitialQte);
    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDisponibilites = useCallback(async () => {
    if (!formData.dateDebut || !formData.dateFin) return;

    setIsUpdatingDisponibilites(true);
    try {
      const updatedArticles = await Promise.all(
        allArticles.map(async (article) => {
          const dispo = await qteDisponible(
            article,
            formData.dateDebut!.toISOString().split('T')[0],
            formData.dateFin!.toISOString().split('T')[0]
          );
          return {
            ...article,
            qteDisponible: dispo,
          };
        })
      );
      setArticlesWithAvailability(updatedArticles);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des disponibilités:', error);
    } finally {
      setIsUpdatingDisponibilites(false);
    }
  }, [formData.dateDebut, formData.dateFin, allArticles]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setFormData(prev => ({ ...prev, dateDebut: start, dateFin: end }));
  };

  const handleArticleQteChange = (articleId: string, qte: number) => {
    const article = articlesWithAvailability.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticle = { ...article, qteDemandee: qte };
    
    if (qte > 0) {
      setSelectedArticles(prev => {
        const existing = prev.find(a => a.id === articleId);
        if (existing) {
          return prev.map(a => a.id === articleId ? updatedArticle : a);
        } else {
          return [...prev, updatedArticle];
        }
      });
    } else {
      setSelectedArticles(prev => prev.filter(a => a.id !== articleId));
    }
  };

  const canConfirm = () => {
    if (!formData.dateDebut || !formData.dateFin || selectedArticles.length === 0) {
      return false;
    }
    
    return selectedArticles.every(article => 
      article.qteDemandee <= article.qteDisponible
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canConfirm()) {
      alert('Veuillez vérifier les dates et les quantités disponibles');
      return;
    }

    try {
      const reservationId = Date.now().toString();
      const now = new Date().toISOString();
      
      // Créer la réservation
      const reservation: Reservation = {
        id: reservationId,
        dateDebut: formData.dateDebut!.toISOString().split('T')[0],
        dateFin: formData.dateFin!.toISOString().split('T')[0],
        clientNom: formData.clientNom || undefined,
        clientTel: formData.clientTel || undefined,
        note: formData.note || undefined,
        statut: 'brouillon',
        acompte: formData.acompte ? parseFloat(formData.acompte) : undefined,
        createdAt: now,
        updatedAt: now,
      };
      
      await reservationHelpers.create(reservation);
      
      // Créer les items de réservation
      for (const article of selectedArticles) {
        const item: ReservationItem = {
          id: `${reservationId}_${article.id}`,
          reservationId,
          articleId: article.id,
          qte: article.qteDemandee,
          prixJourSnapshot: article.prixJour,
        };
        await reservationItemHelpers.create(item);
      }
      
      alert('Réservation créée avec succès');
      
      // Reset form
      setFormData({
        dateDebut: null,
        dateFin: null,
        clientNom: '',
        clientTel: '',
        note: '',
        acompte: '',
      });
      setSelectedArticles([]);
      setSearchTerm('');
      
    } catch (error) {
      console.error('Erreur lors de la création de la réservation:', error);
      alert('Erreur lors de la création de la réservation');
    }
  };

  const filteredArticles = articlesWithAvailability.filter(article =>
    article.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (article.categorie && article.categorie.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalReservation = selectedArticles.reduce((total, article) => {
    const jours = Math.ceil(
      ((formData.dateFin?.getTime() || 0) - (formData.dateDebut?.getTime() || 0)) / (1000 * 60 * 60 * 24)
    ) + 1;
    return total + (article.qteDemandee * article.prixJour * jours);
  }, 0);

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
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle Réservation</h1>
        <p className="text-gray-600">Créez une nouvelle réservation client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de réservation */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Informations de réservation</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période de réservation *
            </label>
            <DatePicker
              selectsRange={true}
              startDate={formData.dateDebut}
              endDate={formData.dateFin}
              onChange={handleDateChange}
              isClearable={true}
              placeholderText="Sélectionnez une période"
              className="input-field w-full"
              dateFormat="dd/MM/yyyy"
              locale="fr"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du client
              </label>
              <input
                type="text"
                value={formData.clientNom}
                onChange={(e) => setFormData({ ...formData, clientNom: e.target.value })}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone du client
              </label>
              <input
                type="tel"
                value={formData.clientTel}
                onChange={(e) => setFormData({ ...formData, clientTel: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acompte (DA)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.acompte}
              onChange={(e) => setFormData({ ...formData, acompte: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        {/* Ajouter des articles */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Ajouter des articles</h2>
          
          {isUpdatingDisponibilites ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              Mise à jour des disponibilités...
            </div>
          ) : (
            <MultiArticleSelect
              articles={articlesWithAvailability}
              value={selectedArticles.map(a => ({ id: a.id, qte: a.qteDemandee }))}
              onChange={(vals) => {
                const next = articlesWithAvailability.map(a => ({ ...a, qteDemandee: vals.find(v=>v.id===a.id)?.qte || 0 }));
                setSelectedArticles(next.filter(a => a.qteDemandee>0));
              }}
            />
          )}
        </div>

        {/* Récapitulatif */}
        {selectedArticles.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Récapitulatif</h2>
            
            <div className="space-y-2 mb-4">
              {selectedArticles.map((article) => {
                const jours = Math.ceil(
                  ((formData.dateFin?.getTime() || 0) - (formData.dateDebut?.getTime() || 0)) / (1000 * 60 * 60 * 24)
                ) + 1;
                const sousTotal = article.qteDemandee * article.prixJour * jours;
                
                return (
                  <div key={article.id} className="flex justify-between text-sm">
                    <span>{article.nom} x{article.qteDemandee} ({jours} jours)</span>
                    <span className="font-medium">{sousTotal} DA</span>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{totalReservation} DA</span>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={!canConfirm()}
            className={`btn-primary ${!canConfirm() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Créer la réservation
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                dateDebut: null,
                dateFin: null,
                clientNom: '',
                clientTel: '',
                note: '',
                acompte: '',
              });
              setSelectedArticles([]);
              setSearchTerm('');
            }}
            className="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}


