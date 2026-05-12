import { Utilisateur } from "./utilisateurs";

export interface Avis {
  id: number;
  note: number;
  commentaire: string;
  
  // 👉 CORRECTION : On ajoute le '?' pour indiquer à Angular que 
  // Spring Boot peut très bien ne pas envoyer cet objet à cause du @JsonIgnore
  utilisateur?: Utilisateur; 
  
  email_auteur?: string; 
  dateCreation?: string; 
  date_creation?: string;
}