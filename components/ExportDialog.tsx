"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportArticlesCSV } from '@/lib/storage';

export default function ExportDialog() {
  const genCSV = async () => {
    const text = await exportArticlesCSV();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'articles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Exporter CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exporter les articles (CSV)</DialogTitle>
        </DialogHeader>
        <Button onClick={genCSV}>Télécharger</Button>
      </DialogContent>
    </Dialog>
  );
}
