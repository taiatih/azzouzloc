import Link from "next/link";

export default function Home() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Réservations du jour</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">7 prochains jours</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Alertes stock</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
      </div>

      <nav className="space-x-4">
        <Link className="underline" href="/articles">Articles</Link>
        <Link className="underline" href="/reservations/nouvelle">Nouvelle réservation</Link>
        <Link className="underline" href="/calendrier">Calendrier</Link>
        <Link className="underline" href="/casse">Casse</Link>
        <Link className="underline" href="/inventaire">Inventaire</Link>
        <Link className="underline" href="/settings">Paramètres</Link>
      </nav>
    </div>
  );
}
