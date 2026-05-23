import type { Utilisateur } from "./utilisateurs";
import type { Voyage } from "./voyage";
import type { Billet } from "./billet"; 

export interface Reservation {
  id?: number; 
  utilisateur: Utilisateur | number; 
  voyage: Voyage | number;           
  prixPaye: number;
  prix_paye?: number; 
  dateConfirmation?: string;
  date_confirmation?: string; 
  statut: 'CONFIRME' | 'EN_ATTENTE' | 'ANNULE' | 'REMBOURSE';
  stripePaymentId?: string;
  stripe_payment_id?: string;
  billets?: Billet[]; 
}