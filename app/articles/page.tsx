'use client';

import { useEffect, useState } from 'react';
import { articleHelpers } from '@/lib/db';
import { exportArticlesToCsv, importArticlesFromCsv } from '@/lib/storage';
import { Article } from '@/lib/models';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    description: '',
    prixJour: '',
    qteTotale: '',
    qteCasse: '0',
    seuilAlerte: '',
    cautionUnit: '',
    actif: true,
  });

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
    
    if (!formData.nom || !formData.prixJour || !formData.qteTotale) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const articleData: Article = {
      id: editingArticle?.id || Date.now().toString(),
      nom: formData.nom,
      categorie: formData.categorie || undefined,
      description: formData.description || undefined,
      prixJour: parseFloat(formData.prixJour),
      qteTotale: parseInt(formData.qteTotale),
      qteCasse: parseInt(formData.qteCasse),
      seuilAlerte: formData.seuilAlerte ? parseInt(formData.seuilAlerte) : undefined,
      cautionUnit: formData.cautionUnit ? parseFloat(formData.cautionUnit) : undefined,
      actif: formData.actif,
    };

    try {
      if (editingArticle) {
        await articleHelpers.update(editingArticle.id, articleData);
      } else {
        await articleHelpers.create(articleData);
      }
      
      resetForm();
      loadArticles();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: '',
      description: '',
      prixJour: '',
      qteTotale: '',
      qteCasse: '0',
      seuilAlerte: '',
      cautionUnit: '',
      actif: true,
    });
    setEditingArticle(null);
    setShowForm(false);
  };

  const handleEdit = (article: Article) => {
    setFormData({
      nom: article.nom,
      categorie: article.categorie || '',
      description: article.description || '',
      prixJour: article.prixJour.toString(),
      qteTotale: article.qteTotale.toString(),
      qteCasse: article.qteCasse.toString(),
      seuilAlerte: article.seuilAlerte?.toString() || '',
      cautionUnit: article.cautionUnit?.toString() || '',
      actif: article.actif,
    });
    setEditingArticle(article);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        await articleHelpers.delete(id);
        loadArticles();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleExport = () => {
    const csv = exportArticlesToCsv(articles);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'articles.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        await importArticlesFromCsv(csv);
        loadArticles();
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
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-600">Gérez votre catalogue d'articles</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="btn-secondary text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-sm"
          >
            Nouvel Article
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Importer des articles (CSV)
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleImport}
          className="input-field"
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                className="input-field"
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="Mobilier">Mobilier</option>
                <option value="Électronique">Électronique</option>
                <option value="Éclairage">Éclairage</option>
                <option value="Sonorisation">Sonorisation</option>
                <option value="Décoration">Décoration</option>
                <option value="Vaisselle">Vaisselle</option>
                <option value="Textile">Textile</option>
                <option value="Chauffage/Climatisation">Chauffage/Climatisation</option>
                <option value="Outillage">Outillage</option>
                <option value="Transport">Transport</option>
                <option value="Sécurité">Sécurité</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix par jour (DA) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prixJour}
                  onChange={(e) => setFormData({ ...formData, prixJour: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité totale *
                </label>
                <input
                  type="number"
                  value={formData.qteTotale}
                  onChange={(e) => setFormData({ ...formData, qteTotale: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité cassée
                </label>
                <input
                  type="number"
                  value={formData.qteCasse}
                  onChange={(e) => setFormData({ ...formData, qteCasse: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil d'alerte
                </label>
                <input
                  type="number"
                  value={formData.seuilAlerte}
                  onChange={(e) => setFormData({ ...formData, seuilAlerte: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caution unitaire (DA)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cautionUnit}
                onChange={(e) => setFormData({ ...formData, cautionUnit: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="actif"
                checked={formData.actif}
                onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="actif" className="ml-2 block text-sm text-gray-900">
                Article actif
              </label>
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                {editingArticle ? 'Modifier' : 'Créer'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-4">
        {articles.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucun article trouvé</p>
          </div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{article.nom}</h3>
                  {article.categorie && (
                    <p className="text-sm text-gray-600">{article.categorie}</p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Prix/jour:</span>
                      <span className="ml-1 font-medium">{article.prixJour} DA</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock:</span>
                      <span className="ml-1 font-medium">
                        {article.qteTotale - article.qteCasse}/{article.qteTotale}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      article.actif 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {article.actif ? 'Actif' : 'Inactif'}
                    </span>
                    {article.seuilAlerte && (article.qteTotale - article.qteCasse) <= article.seuilAlerte && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        Stock faible
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(article)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

