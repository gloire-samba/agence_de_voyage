import { Utilisateur } from "./utilisateurs";
import { Voyage } from "./voyage";
import { Billet } from "./billet"; // 👉 On importe la nouvelle interface

export interface Reservation {
  id?: number; 
  utilisateur: Utilisateur | number; 
  voyage: Voyage | number;           
  
  prixPaye: number;
  prix_paye?: number; // Pour Django
  
  dateConfirmation?: string;
  date_confirmation?: string; // Pour Django
  
  statut: 'CONFIRME' | 'EN_ATTENTE' | 'ANNULE' | 'REMBOURSE';

  // 👉 AJOUT DE STRIPE
  stripePaymentId?: string;
  stripe_payment_id?: string;

  // 👉 NOUVEAU : Une réservation contient désormais une liste de sièges
  billets?: Billet[]; 
}