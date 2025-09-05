"use client";
import { useEffect, useState } from 'react';
import { ArticleRepo } from '@/lib/db';
import type { Article } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ArticleForm from '@/components/ArticleForm';


export default function ArticlesPage() {
  const [rows, setRows] = useState<Article[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const items = await ArticleRepo.list();
    setRows(items);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouvel article</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel article</DialogTitle></DialogHeader>
            <ArticleForm onSaved={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prix/j</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Casse</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nom}</TableCell>
                <TableCell>{a.prixJour}</TableCell>
                <TableCell>{a.qteTotale}</TableCell>
                <TableCell>{a.qteCasse ?? 0}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Aucun article</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
