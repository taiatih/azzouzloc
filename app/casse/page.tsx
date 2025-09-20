'use client';

import { useEffect, useState } from 'react';
import { articleHelpers } from '@/lib/db';
import { Article } from '@/lib/models';

export default function CassePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [qteCasse, setQteCasse] = useState('');
  const [motif, setMotif] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await articleHelpers.list();
      setArticles(data);
    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedArticle || !qteCasse) {
      alert('Veuillez sélectionner un article et saisir une quantité');
      return;
    }

    const qte = parseInt(qteCasse);
    if (qte <= 0) {
      alert('La quantité doit être supérieure à 0');
      return;
    }

    const qteDisponible = selectedArticle.qteTotale - selectedArticle.qteCasse;
    if (qte > qteDisponible) {
      alert(`Quantité trop élevée. Maximum disponible: ${qteDisponible}`);
      return;
    }

    try {
      const nouvelleQteCasse = selectedArticle.qteCasse + qte;
      await articleHelpers.update(selectedArticle.id, {
        qteCasse: nouvelleQteCasse
      });

      // Log de l'opération (dans une vraie app, on pourrait avoir une table d'historique)
      console.log(`Casse enregistrée: ${selectedArticle.nom} - ${qte} unités - Motif: ${motif || 'Non spécifié'}`);
      
      alert(`Casse enregistrée: ${qte} unité(s) de ${selectedArticle.nom}`);
      
      // Reset form
      setSelectedArticle(null);
      setQteCasse('');
      setMotif('');
      setSearchTerm('');
      
      // Reload articles
      loadArticles();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la casse:', error);
      alert('Erreur lors de l\'enregistrement de la casse');
    }
  };

  const filteredArticles = articles.filter(article =>
    article.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (article.categorie && article.categorie.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const articlesAvecCasse = articles.filter(article => article.qteCasse > 0);

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
        <h1 className="text-2xl font-bold text-gray-900">Gestion de la Casse</h1>
        <p className="text-gray-600">Enregistrez les articles cassés ou hors service</p>
      </div>

      {/* Formulaire de déclaration de casse */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Déclarer une casse</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un article
            </label>
            <input
              type="text"
              placeholder="Tapez le nom de l'article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>

          {searchTerm && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredArticles.map((article) => {
                const qteDisponible = article.qteTotale - article.qteCasse;
                return (
                  <div
                    key={article.id}
                    onClick={() => {
                      setSelectedArticle(article);
                      setSearchTerm(article.nom);
                    }}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      selectedArticle?.id === article.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{article.nom}</div>
                        {article.categorie && (
                          <div className="text-sm text-gray-600">{article.categorie}</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Stock: {qteDisponible}/{article.qteTotale}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedArticle && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">{selectedArticle.nom}</h3>
                <div className="text-sm text-blue-700 mt-1">
                  Stock disponible: {selectedArticle.qteTotale - selectedArticle.qteCasse} unités
                  {selectedArticle.qteCasse > 0 && (
                    <span className="ml-2 text-red-600">
                      (Déjà {selectedArticle.qteCasse} cassées)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité cassée *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedArticle.qteTotale - selectedArticle.qteCasse}
                    value={qteCasse}
                    onChange={(e) => setQteCasse(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motif (optionnel)
                  </label>
                  <select
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Sélectionner un motif</option>
                    <option value="Usure normale">Usure normale</option>
                    <option value="Accident client">Accident client</option>
                    <option value="Défaut de fabrication">Défaut de fabrication</option>
                    <option value="Mauvaise manipulation">Mauvaise manipulation</option>
                    <option value="Vol/Perte">Vol/Perte</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <button type="submit" className="btn-primary">
                  Enregistrer la casse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArticle(null);
                    setQteCasse('');
                    setMotif('');
                    setSearchTerm('');
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Historique des casses */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Articles avec casse</h2>
        
        {articlesAvecCasse.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun article cassé enregistré
          </div>
        ) : (
          <div className="space-y-3">
            {articlesAvecCasse.map((article) => {
              const tauxCasse = (article.qteCasse / article.qteTotale) * 100;
              const qteDisponible = article.qteTotale - article.qteCasse;
              
              return (
                <div key={article.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{article.nom}</h3>
                      {article.categorie && (
                        <p className="text-sm text-gray-600">{article.categorie}</p>
                      )}
                      
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Stock total:</span>
                          <span className="ml-1 font-medium">{article.qteTotale}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Disponible:</span>
                          <span className="ml-1 font-medium text-green-600">{qteDisponible}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cassé:</span>
                          <span className="ml-1 font-medium text-red-600">{article.qteCasse}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Taux de casse:</span>
                          <span className="ml-1 font-medium text-red-600">{tauxCasse.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          setSelectedArticle(article);
                          setSearchTerm(article.nom);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Ajouter casse
                      </button>
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>État du stock</span>
                      <span>{tauxCasse.toFixed(1)}% de casse</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500"
                          style={{ width: `${(qteDisponible / article.qteTotale) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-red-500"
                          style={{ width: `${(article.qteCasse / article.qteTotale) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span className="text-green-600">Disponible</span>
                      <span className="text-red-600">Cassé</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

