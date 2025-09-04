export type Statut = 'brouillon'|'confirmee'|'en_cours'|'cloturee'|'annulee';

export interface Article {
  id: string;
  nom: string;
  categorie?: string;
  description?: string;
  prixJour: number;
  qteTotale: number;
  qteCasse: number;
  seuilAlerte?: number;
  cautionUnit?: number;
  actif: boolean;
}

export interface Reservation {
  id: string;
  dateDebut: string;
  dateFin: string;
  clientNom?: string;
  clientTel?: string;
  note?: string;
  statut: Statut;
  acompte?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationItem {
  id: string;
  reservationId: string;
  articleId: string;
  qte: number;
  prixJourSnapshot: number;
}
