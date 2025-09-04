"use client";
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/lib/store';
import type { Article } from '@/lib/models';

const schema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  categorie: z.string().optional(),
  description: z.string().optional(),
  prixJour: z.coerce.number().min(0),
  qteTotale: z.coerce.number().min(0),
  qteCasse: z.coerce.number().min(0),
  seuilAlerte: z.coerce.number().min(0).optional(),
  cautionUnit: z.coerce.number().min(0).optional(),
  actif: z.boolean().default(true),
});

export default function ArticleForm({
  initial,
  onSubmit,
  submitLabel = 'Enregistrer',
}: {
  initial?: Partial<Article>;
  onSubmit: (values: Omit<Article, 'id'>) => Promise<void> | void;
  submitLabel?: string;
}) {
  type V = Omit<Article, 'id'>;
  const defaults: V = { nom: '', categorie: '', description: '', prixJour: 0, qteTotale: 0, qteCasse: 0, seuilAlerte: 0, cautionUnit: 0, actif: true };
  const [values, setValues] = useState<V>(defaults);
  useEffect(() => {
    if (initial) setValues((v: V) => ({ ...v, ...(initial as Partial<V>) } as V));
  }, [initial]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handle = (k: keyof V, v: V[keyof V]) => setValues((s) => ({ ...s, [k]: v } as V));
  const { categories, addCategory } = useSettingsStore();
  const [newCat, setNewCat] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach(i => { map[i.path[0] as string] = i.message; });
      setErrors(map);
      return;
    }
    await onSubmit(parsed.data as V);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label>Nom</label>
        <Input value={values.nom} onChange={e => handle('nom', e.target.value)} />
        {errors.nom && <p className="text-red-500 text-sm">{errors.nom}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>Catégorie</label>
          <div className="flex items-center gap-2">
            <Select value={values.categorie || ''} onValueChange={(v) => handle('categorie', v)}>
              <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Nouvelle catégorie" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="max-w-[180px]" />
            <Button type="button" variant="secondary" onClick={() => { addCategory(newCat); setNewCat(''); }}>Ajouter</Button>
          </div>
        </div>
        <div>
          <label>Prix / jour</label>
          <Input type="number" value={values.prixJour} onChange={e => handle('prixJour', e.target.value)} />
        </div>
      </div>
      <div>
        <label>Description</label>
        <Textarea value={values.description || ''} onChange={e => handle('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label>Total</label>
          <Input type="number" value={values.qteTotale} onChange={e => handle('qteTotale', e.target.value)} />
        </div>
        <div>
          <label>Casse</label>
          <Input type="number" value={values.qteCasse} onChange={e => handle('qteCasse', e.target.value)} />
        </div>
        <div>
          <label>Seuil alerte</label>
          <Input type="number" value={values.seuilAlerte || 0} onChange={e => handle('seuilAlerte', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>Caution (unitaire)</label>
          <Input type="number" value={values.cautionUnit || 0} onChange={e => handle('cautionUnit', e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="actif" type="checkbox" checked={values.actif} onChange={e => handle('actif', e.target.checked)} />
          <label htmlFor="actif">Actif</label>
        </div>
      </div>
      <div className="pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
