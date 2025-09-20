'use client';

import { useEffect, useState } from 'react';
import { articleHelpers, reservationHelpers, reservationItemHelpers } from '@/lib/db';
import { exportToJson, importFromJson } from '@/lib/storage';
import { Article, Reservation, ReservationItem } from '@/lib/models';

interface InventoryItem extends Article {
  qteDisponible: number;
  qteReservee: number;
  valeurStock: number;
}

export default function InventairePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalStock: 0,
    totalCasse: 0,
    valeurTotale: 0,
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const articles = await articleHelpers.list();
      const reservations = await reservationHelpers.listByStatus(['confirmee', 'en_cours']);
      const items = await reservationItemHelpers.list();

      const inventoryData: InventoryItem[] = articles.map(article => {
        // Calculer la quantité réservée actuellement
        const today = new Date().toISOString().split('T')[0];
        const qteReservee = reservations.reduce((total, reservation) => {
          if (reservation.dateDebut <= today && reservation.dateFin >= today) {
            const reservationItems = items.filter(item => 
              item.reservationId === reservation.id && item.articleId === article.id
            );
            return total + reservationItems.reduce((sum, item) => sum + item.qte, 0);
          }
          return total;
        }, 0);

        const qteDisponible = Math.max(0, article.qteTotale - article.qteCasse - qteReservee);
        const valeurStock = (article.qteTotale - article.qteCasse) * article.prixJour;

        return {
          ...article,
          qteDisponible,
          qteReservee,
          valeurStock,
        };
      });

      // Calculer les statistiques
      const totalArticles = inventoryData.length;
      const totalStock = inventoryData.reduce((sum, item) => sum + (item.qteTotale - item.qteCasse), 0);
      const totalCasse = inventoryData.reduce((sum, item) => sum + item.qteCasse, 0);
      const valeurTotale = inventoryData.reduce((sum, item) => sum + item.valeurStock, 0);

      setInventory(inventoryData);
      setStats({
        totalArticles,
        totalStock,
        totalCasse,
        valeurTotale,
      });
    } catch (error) {
      console.error('Erreur lors du chargement de l\'inventaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const jsonData = await exportToJson();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `azzouz-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem('azzouz_last_export_at', new Date().toISOString());
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        await importFromJson(jsonData);
        loadInventory();
        alert('Import réussi');
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        alert('Erreur lors de l\'import');
      }
    };
    reader.readAsText(file);
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
          <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
          <p className="text-gray-600">État des stocks et valeur du matériel</p>
        </div>
        <button
          onClick={handleExportJson}
          className="btn-primary text-sm"
        >
          Export JSON
        </button>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalArticles}</div>
            <div className="text-sm text-gray-600">Articles référencés</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalStock}</div>
            <div className="text-sm text-gray-600">Unités en stock</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalCasse}</div>
            <div className="text-sm text-gray-600">Unités cassées</div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.valeurTotale.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Valeur stock (DA)</div>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Sauvegarde et restauration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Importer une sauvegarde (JSON)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ L'import remplacera toutes les données existantes
            </p>
          </div>
          
          <div>
            <button
              onClick={handleExportJson}
              className="btn-secondary"
            >
              Télécharger une sauvegarde complète
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Exporte tous les articles, réservations et historique
            </p>
          </div>
        </div>
      </div>

      {/* Détail de l'inventaire */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Détail par article</h2>
        
        <div className="space-y-3">
          {inventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun article en inventaire
            </div>
          ) : (
            inventory.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.nom}</h3>
                    {item.categorie && (
                      <p className="text-sm text-gray-600">{item.categorie}</p>
                    )}
                    
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Stock total:</span>
                        <span className="ml-1 font-medium">{item.qteTotale}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Disponible:</span>
                        <span className={`ml-1 font-medium ${
                          item.qteDisponible > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.qteDisponible}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Réservé:</span>
                        <span className="ml-1 font-medium text-orange-600">{item.qteReservee}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cassé:</span>
                        <span className="ml-1 font-medium text-red-600">{item.qteCasse}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Valeur stock:</span>
                      <span className="ml-1 font-medium text-purple-600">
                        {item.valeurStock.toFixed(0)} DA
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({item.prixJour} DA/jour)
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      item.actif 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.actif ? 'Actif' : 'Inactif'}
                    </span>
                    
                    {item.seuilAlerte && (item.qteTotale - item.qteCasse) <= item.seuilAlerte && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        Stock faible
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Barre de progression du stock */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Utilisation du stock</span>
                    <span>{Math.round(((item.qteReservee + item.qteCasse) / item.qteTotale) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500"
                        style={{ width: `${(item.qteDisponible / item.qteTotale) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-orange-500"
                        style={{ width: `${(item.qteReservee / item.qteTotale) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-red-500"
                        style={{ width: `${(item.qteCasse / item.qteTotale) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span className="text-green-600">Disponible</span>
                    <span className="text-orange-600">Réservé</span>
                    <span className="text-red-600">Cassé</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

