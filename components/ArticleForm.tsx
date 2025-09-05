"use client";
"use client";
import { useState } from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';

const schema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prixJour: z.coerce.number().int().min(0),
  qteTotale: z.coerce.number().int().min(0),
});

export default function ArticleForm({ onSaved }: { onSaved?: () => void }) {
  const [nom, setNom] = useState('');
  const [prixJour, setPrixJour] = useState<number | ''>('');
  const [qteTotale, setQteTotale] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => { setNom(''); setPrixJour(''); setQteTotale(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ nom, prixJour, qteTotale });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach(i => { map[i.path[0] as string] = i.message; });
      setErrors(map);
      return;
    }
    await db.articles.add({ id: crypto.randomUUID(), nom, prixJour: parsed.data.prixJour, qteTotale: parsed.data.qteTotale, qteCasse: 0, actif: true });
    reset();
    onSaved?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm">Nom</label>
        <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Chaise plastique" className="w-full" />
        {errors.nom && <p className="text-red-600 text-xs">{errors.nom}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Prix / jour</label>
          <Input type="number" value={prixJour} onChange={e => setPrixJour(e.target.value === '' ? '' : Number(e.target.value))} placeholder="100" />
          {errors.prixJour && <p className="text-red-600 text-xs">{errors.prixJour}</p>}
        </div>
        <div>
          <label className="text-sm">Quantité totale</label>
          <Input type="number" value={qteTotale} onChange={e => setQteTotale(e.target.value === '' ? '' : Number(e.target.value))} placeholder="100" />
          {errors.qteTotale && <p className="text-red-600 text-xs">{errors.qteTotale}</p>}
        </div>
      </div>
      <Button type="submit" className="w-full sm:w-auto">Ajouter</Button>
    </form>
  );
}
