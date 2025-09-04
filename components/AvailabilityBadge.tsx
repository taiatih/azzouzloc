"use client";
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { qteDisponible } from '@/lib/availability';
import type { Article } from '@/lib/models';

export default function AvailabilityBadge({ article, from, to }: { article: Article; from: string; to: string; }) {
  const [dispo, setDispo] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    qteDisponible(article, from, to).then(v => mounted && setDispo(v));
    return () => { mounted = false; };
  }, [article, from, to]);

  if (dispo === null) return <Badge variant="secondary">...</Badge>;
  const variant: 'default'|'secondary'|'destructive'|'outline' = dispo === 0 ? 'destructive' : (dispo <= (article.seuilAlerte ?? 0) ? 'outline' : 'default');
  return <Badge variant={variant}>Dispo: {dispo}</Badge>;
}
