'use client';

import { useEffect, useState } from 'react';
import { exportToJson, importFromJson } from '@/lib/storage';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    devise: 'DA',
    langue: 'fr',
    pin: '',
    confirmPin: '',
    syncPin: '',
  });
  const [currentPin, setCurrentPin] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [stats, setStats] = useState({
    dbSize: 0,
    lastBackup: '',
  });

  useEffect(() => {
    loadSettings();
    calculateStats();
  }, []);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('azzouz_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(prev => ({ ...prev, ...parsed }));
    }
    
    const savedPin = localStorage.getItem('azzouz_pin');
    if (savedPin) {
      setCurrentPin(savedPin);
    }
  };

  const calculateStats = async () => {
    try {
      const jsonData = await exportToJson();
      const sizeInBytes = new Blob([jsonData]).size;
      const sizeInKB = Math.round(sizeInBytes / 1024);
      
      const lastBackup = localStorage.getItem('azzouz_last_backup');
      
      setStats({
        dbSize: sizeInKB,
        lastBackup: lastBackup || 'Jamais',
      });
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
    }
  };

  const handleSaveSettings = () => {
    const { pin, confirmPin, ...settingsToSave } = settings;
    localStorage.setItem('azzouz_settings', JSON.stringify(settingsToSave));
    alert('Paramètres sauvegardés');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (settings.pin !== settings.confirmPin) {
      alert('Les codes PIN ne correspondent pas');
      return;
    }
    
    if (settings.pin.length < 4) {
      alert('Le code PIN doit contenir au moins 4 caractères');
      return;
    }
    
    localStorage.setItem('azzouz_pin', settings.pin);
    setCurrentPin(settings.pin);
    setSettings(prev => ({ ...prev, pin: '', confirmPin: '' }));
    setShowPinForm(false);
    alert('Code PIN mis à jour');
  };

  const handleExportBackup = async () => {
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
      
      localStorage.setItem('azzouz_last_backup', new Date().toLocaleString('fr-FR'));
      calculateStats();
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (currentPin) {
      const enteredPin = prompt('Veuillez saisir votre code PIN pour confirmer l\'import:');
      if (enteredPin !== currentPin) {
        alert('Code PIN incorrect');
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        await importFromJson(jsonData);
        alert('Import réussi. L\'application va se recharger.');
        window.location.reload();
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        alert('Erreur lors de l\'import');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (currentPin) {
      const enteredPin = prompt('Veuillez saisir votre code PIN pour confirmer la suppression:');
      if (enteredPin !== currentPin) {
        alert('Code PIN incorrect');
        return;
      }
    }

    if (confirm('⚠️ ATTENTION: Cette action supprimera TOUTES les données de l\'application. Cette action est irréversible. Êtes-vous sûr ?')) {
      if (confirm('Dernière confirmation: Voulez-vous vraiment supprimer toutes les données ?')) {
        // Clear IndexedDB
        indexedDB.deleteDatabase('azzouz_db');
        
        // Clear localStorage
        localStorage.removeItem('azzouz_settings');
        localStorage.removeItem('azzouz_pin');
        localStorage.removeItem('azzouz_last_backup');
        
        alert('Toutes les données ont été supprimées. L\'application va se recharger.');
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Configuration de l'application</p>
      </div>

      {/* Paramètres généraux */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Paramètres généraux</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                value={settings.devise}
                onChange={(e) => setSettings(prev => ({ ...prev, devise: e.target.value }))}
                className="input-field"
              >
                <option value="DA">Dinar Algérien (DA)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar US ($)</option>
                <option value="MAD">Dirham Marocain (MAD)</option>
                <option value="TND">Dinar Tunisien (TND)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Langue
              </label>
              <select
                value={settings.langue}
                onChange={(e) => setSettings(prev => ({ ...prev, langue: e.target.value }))}
                className="input-field"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="btn-primary"
          >
            Sauvegarder les paramètres
          </button>
        </div>
      </div>

      {/* Sécurité */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Sécurité</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-gray-900">Code PIN</div>
              <div className="text-sm text-gray-600">
                {currentPin ? 'Code PIN configuré' : 'Aucun code PIN configuré'}
              </div>
            </div>
            <button
              onClick={() => setShowPinForm(!showPinForm)}
              className="btn-secondary text-sm"
            >
              {currentPin ? 'Modifier' : 'Configurer'}
            </button>
          </div>

          {showPinForm && (
            <form onSubmit={handlePinSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau code PIN
                </label>
                <input
                  type="password"
                  value={settings.pin}
                  onChange={(e) => setSettings(prev => ({ ...prev, pin: e.target.value }))}
                  className="input-field"
                  placeholder="Minimum 4 caractères"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le code PIN
                </label>
                <input
                  type="password"
                  value={settings.confirmPin}
                  onChange={(e) => setSettings(prev => ({ ...prev, confirmPin: e.target.value }))}
                  className="input-field"
                  placeholder="Répétez le code PIN"
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <button type="submit" className="btn-primary text-sm">
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinForm(false);
                    setSettings(prev => ({ ...prev, pin: '', confirmPin: '' }));
                  }}
                  className="btn-secondary text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Synchronisation (Supabase) */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Synchronisation</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Activez la synchronisation multi‑appareils. Code PIN requis (défini par l’administrateur).</p>
          <div className="flex gap-2 items-center">
            <input type="password" value={settings.syncPin} onChange={(e)=>setSettings(s=>({...s, syncPin:e.target.value}))} className="input-field w-40" placeholder="Code PIN" />
            <button className="btn-primary text-sm" onClick={async ()=>{
              const { unlockSync } = await import('@/lib/sync');
              await unlockSync(settings.syncPin);
              alert('Synchronisation déverrouillée.');
            }}>Déverrouiller</button>
            <button className="btn-secondary text-sm" onClick={async ()=>{
              const { runSync } = await import('@/lib/sync');
              const r: any = await runSync();
              if (r.ok) {
                if (r.errors && r.errors.length) {
                  console.warn('Sync warnings', r.errors);
                  alert('Synchronisation terminée avec avertissements. Voir la console pour les détails.');
                } else {
                  alert('Synchronisation terminée');
                }
              } else {
                console.error('Sync error', r);
                const msg = r.network ? 'Erreur réseau' : (r.body?.error || r.body?.message || `Erreur ${r.status}`);
                alert(`Synchronisation échouée: ${msg}`);
              }
            }}>Synchroniser maintenant</button>
          </div>
          <p className="text-xs text-gray-500">La synchronisation automatique s’exécute toutes les 15 minutes lorsque le PIN est déverrouillé.</p>
        </div>
      </div>

      {/* Sauvegarde et restauration */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Sauvegarde et restauration</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Taille de la base:</span>
              <span className="ml-1 font-medium">{stats.dbSize} KB</span>
            </div>
            <div>
              <span className="text-gray-500">Dernière sauvegarde:</span>
              <span className="ml-1 font-medium">{stats.lastBackup}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportBackup}
              className="btn-primary w-full"
            >
              📥 Créer une sauvegarde
            </button>
            
            <div>
              <label className="btn-secondary w-full cursor-pointer inline-block text-center">
                📤 Restaurer une sauvegarde
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de danger */}
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold mb-4 text-red-700">Zone de danger</h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="font-medium text-red-900 mb-2">Supprimer toutes les données</div>
            <div className="text-sm text-red-700 mb-3">
              Cette action supprimera définitivement tous les articles, réservations et paramètres. 
              Cette action est irréversible.
            </div>
            <button
              onClick={handleClearData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🗑️ Supprimer toutes les données
            </button>
          </div>
        </div>
      </div>

      {/* Informations sur l'application */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">À propos</h2>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Application:</span>
            <span className="font-medium">Azzouz Location</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Version:</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Type:</span>
            <span className="font-medium">PWA (Progressive Web App)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Stockage:</span>
            <span className="font-medium">Local (IndexedDB)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

