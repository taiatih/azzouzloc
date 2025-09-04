"use client";
import { useEffect, useState } from 'react';
import { ArticleRepo } from '@/lib/db';
import type { Article } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ArticleForm from '@/components/ArticleForm';
import ImportDialog from '@/components/ImportDialog';
import ExportDialog from '@/components/ExportDialog';
import AvailabilityBadge from '@/components/AvailabilityBadge';
import DateRangePicker from '@/components/DateRangePicker';
import { useSettingsStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nanoid } from 'nanoid';

export default function ArticlesPage() {
  const [rows, setRows] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [open, setOpen] = useState(false);
  const { dateFrom, dateTo, setRange, categories } = useSettingsStore();
  const [catFilter, setCatFilter] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const items = await ArticleRepo.list();
    setRows(items);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (values: Omit<Article, 'id'>) => {
    const a: Article = { id: nanoid(), ...values } as Article;
    await ArticleRepo.create(a);
    setOpen(false);
    await load();
  };
  const onUpdate = async (id: string, values: Omit<Article, 'id'>) => {
    await ArticleRepo.update(id, values);
    setEditing(null);
    await load();
  };
  const onDelete = async (id: string) => {
    if (confirm('Supprimer cet article ?')) { await ArticleRepo.remove(id); await load(); }
  };

  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  const toISO = (d: Date) => d.toISOString().slice(0,10);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker value={{ from: fromDate, to: toDate }} onChange={(r) => setRange(toISO(r.from), toISO(r.to))} />
          <ImportDialog onDone={load} />
          <ExportDialog />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Nouveau</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvel article</DialogTitle></DialogHeader>
              <ArticleForm onSubmit={onCreate} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">Filtrer par catégorie</div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v)}>
          <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Prix/jour</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Dispo</TableHead>
            <TableHead>Actif</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter(a => !catFilter || a.categorie === catFilter).map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.nom}</TableCell>
              <TableCell>{a.categorie || '-'}</TableCell>
              <TableCell>{a.prixJour}</TableCell>
              <TableCell>{a.qteTotale - a.qteCasse} / {a.qteTotale}</TableCell>
              <TableCell>
                <AvailabilityBadge article={a} from={dateFrom} to={dateTo} />
              </TableCell>
              <TableCell>{a.actif ? 'Oui' : 'Non'}</TableCell>
              <TableCell className="space-x-2">
                <Dialog open={editing?.id === a.id} onOpenChange={(o) => !o && setEditing(null)}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" onClick={() => setEditing(a)}>Éditer</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Éditer</DialogTitle></DialogHeader>
                    <ArticleForm initial={a} onSubmit={(v) => onUpdate(a.id, v)} submitLabel="Mettre à jour" />
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" onClick={() => onDelete(a.id)}>Supprimer</Button>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && !loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">Aucun article</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
