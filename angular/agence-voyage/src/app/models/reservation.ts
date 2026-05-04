import { Utilisateur } from "./utilisateurs";
import { Voyage } from "./voyage";


export interface Reservation {
  id?: number; // Optionnel car absent lors de la création
  utilisateur: Utilisateur | number; // Peut être un objet complet ou juste l'ID selon le point d'API
  voyage: Voyage | number;           // Idem
  prixPaye: number;
  dateConfirmation?: string;
  statut: 'EN_ATTENTE' | 'CONFIRME' | 'ANNULE';
}