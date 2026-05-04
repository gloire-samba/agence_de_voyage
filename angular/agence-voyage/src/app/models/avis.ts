import { Utilisateur } from "./utilisateurs";

export interface Avis {
  id: number;
  note: number;
  commentaire: string;
  utilisateur: Utilisateur; // On récupère l'objet complet de l'utilisateur pour afficher son email
  // 👉 NOUVEAU : On gère les deux formats (Spring / Django)
  dateCreation?: string; 
  date_creation?: string;
}