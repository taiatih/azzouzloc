"use client";
import { useSettingsStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SettingsPage(){
  const { devise, setDevise, langue, categories, addCategory, removeCategory } = useSettingsStore();
  const [newCat, setNewCat] = useState('');
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label>Devise</label>
          <Input value={devise} onChange={(e) => setDevise(e.target.value)} className="max-w-xs" />
        </div>
        <div className="space-y-2">
          <label>Langue</label>
          <Input value={langue} readOnly className="max-w-xs" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Catégories</h2>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Nouvelle catégorie" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="max-w-xs" />
          <Button onClick={() => { addCategory(newCat); setNewCat(''); }}>Ajouter</Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map(c => (
            <div key={c} className="border rounded px-2 py-1 text-sm flex items-center gap-2">
              <span>{c}</span>
              <button className="text-red-600" onClick={() => removeCategory(c)}>×</button>
            </div>
          ))}
          {!categories.length && <div className="text-sm text-muted-foreground">Aucune catégorie</div>}
        </div>
      </div>
    </div>
  );
}
