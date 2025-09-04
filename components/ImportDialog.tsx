"use client";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { importArticlesCSV } from '@/lib/storage';

export default function ImportDialog({ onDone }: { onDone?: () => void }) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const handleFile = async (file: File) => {
    setProcessing(true);
    const text = await file.text();
    const { collisions } = await importArticlesCSV(text);
    setResult(`Import terminé. Collisions: ${collisions.length}`);
    setProcessing(false);
    onDone?.();
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Importer CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer des articles (CSV)</DialogTitle>
        </DialogHeader>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
        {processing && <p>Traitement...</p>}
        {result && <p>{result}</p>}
      </DialogContent>
    </Dialog>
  );
}
