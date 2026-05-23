import type{ Utilisateur } from "./utilisateurs";

export interface Avis {
  id: number;
  note: number;
  commentaire: string;
  utilisateur?: Utilisateur; 
  email_auteur?: string; 
  dateCreation?: string; 
  date_creation?: string;
}