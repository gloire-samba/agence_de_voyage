export interface Utilisateur {
  id: number;
  email: string;
  role: string;
  dateInscription: string;
  // Note : On ne met SURTOUT PAS le mot de passe ici pour des raisons de sécurité, 
  // comme on l'a vu avec le write_only côté backend.
}